"""
GTAP V1 – EMA Engulfing Strategy
===================================
Author   : GTAP Trading Team
Version  : 1.0.0
Timeframe: M5 (5 Minutes)

Description
-----------
Trend-following strategy based on EMA 9/15 crossover with Bullish/Bearish
Engulfing candlestick pattern confirmation.

Algorithm:
    1. Detect market trend using EMA 9 and EMA 15 crossover.
    2. Skip if market is sideways (EMA distance < ATR threshold).
    3. Confirm price has pulled back into the EMA zone.
    4. Wait for an Engulfing confirmation candle.
    5. Apply session, spread, daily limit, cooldown, and position filters.
    6. Return a structured signal dict if all conditions pass.

Capital Protection Rules:
    - Maximum 3 trades per day.
    - Stop after 2 consecutive losing trades.
    - 2-candle cooldown after every completed trade.
    - One active trade at a time per symbol.

Independence
------------
This module is COMPLETELY MT5-INDEPENDENT.
    Input  : List of OHLCV dicts + market_context dict + daily_stats dict
    Output : Signal dict or None

This design enables backtesting without any MT5 dependency.

Architecture
------------
Trading Engine → Strategy Manager → EMA Engulfing Strategy (V1)

Future versions may include: RSI, MACD, Supertrend, Price Action, SMC/ICT.
"""

import pandas as pd
import pandas_ta as ta
from datetime import datetime, timezone
from logger import logger

# ─────────────────────────────────────────────────────────────────────────────
# STRATEGY CONFIGURATION
# All configurable parameters live here.
# Do NOT hardcode values anywhere else in this module.
# ─────────────────────────────────────────────────────────────────────────────
STRATEGY_CONFIG = {
    # Identity
    "strategy_name": "EMA Engulfing (V1)",
    "strategy_version": "1.0.0",

    # Market
    "symbol": "XAUUSD",
    "timeframe": "M5",
    "timeframe_seconds": 300,           # 5 minutes × 60 seconds

    # Indicators
    "ema_fast": 9,                      # Fast EMA period
    "ema_slow": 15,                     # Slow EMA period
    "atr_period": 14,                   # ATR period (used only for filters)

    # Sideways Filter
    # Market is sideways if: abs(EMA9 - EMA15) < ATR × sideways_atr_threshold
    # Keep configurable — do NOT hardcode in logic.
    "sideways_atr_threshold": 0.3,

    # Pullback Filter
    # Entry candle close must be within ATR × pullback_zone_atr_factor of EMA midpoint.
    # Keep configurable — do NOT hardcode in logic.
    "pullback_zone_atr_factor": 0.5,

    # Risk Management
    "risk_reward_ratio": 2.0,           # 1:2 — 1 unit risk : 2 units reward

    # Spread Filter
    # Max allowed spread in broker points. Broker-independent — uses symbol digits.
    # Spread price = spread_points / (10 ^ symbol_digits)
    "max_spread_points": 30,

    # Daily Safety Rules
    "max_trades_per_day": 3,            # Hard stop after this many trades
    "max_consecutive_losses": 2,        # Stop for the day after N consecutive losses

    # Cooldown Rule
    # After every completed trade, wait N confirmed candles before opening another.
    # M5 example: cooldown_candles=2 → 10 minutes cooldown.
    "cooldown_candles": 2,

    # Trading Sessions (UTC hours, 24-hour format)
    # London  : 07:00 – 16:00 UTC
    # New York: 13:00 – 22:00 UTC
    # Asian session is disabled in V1.
    # Keep session times inside config — do NOT hardcode in logic.
    "sessions": {
        "london": {"start": 7, "end": 16},
        "new_york": {"start": 13, "end": 22},
    },

    # Minimum candles required to compute indicators reliably.
    "min_candles": 50,
}


class EMAEngulfingStrategy:
    """
    GTAP V1 EMA 9/15 + Engulfing Candle Confirmation Strategy.

    Pure Python — zero MT5 dependency.

    Usage
    -----
    strategy = EMAEngulfingStrategy()
    signal = strategy.check_signals(rates, market_context, daily_stats)
    """

    def __init__(self, config_overrides: dict = None):
        """
        Initialize the strategy.

        Args:
            config_overrides: Optional dict to override specific STRATEGY_CONFIG values.
                              Allows per-instance customization without modifying the module.
        """
        self.config = dict(STRATEGY_CONFIG)
        if config_overrides:
            self.config.update(config_overrides)

        logger.info(
            f"[{self.config['strategy_name']} v{self.config['strategy_version']}] Initialized. "
            f"EMA({self.config['ema_fast']}/{self.config['ema_slow']}) | "
            f"ATR({self.config['atr_period']}) | "
            f"Timeframe: {self.config['timeframe']} | "
            f"RR: 1:{self.config['risk_reward_ratio']} | "
            f"Max Trades/Day: {self.config['max_trades_per_day']} | "
            f"Cooldown: {self.config['cooldown_candles']} candles"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # MAIN ENTRY POINT
    # ─────────────────────────────────────────────────────────────────────────

    def check_signals(self, rates: list, market_context: dict, daily_stats: dict) -> dict | None:
        """
        Evaluate candle data against all strategy rules and return a signal if conditions pass.

        Args:
            rates (list):
                List of OHLCV dicts. Each dict must contain:
                    { "time": int, "open": float, "high": float,
                      "low": float, "close": float, "volume": int }
                Candles must be in chronological order (oldest first).
                The last candle (index -1) should be the currently-forming candle.
                The second-to-last candle (index -2) is the last CONFIRMED candle.

            market_context (dict):
                Runtime market information from the broker:
                    spread_points     (int)   : Current spread in broker points.
                    symbol_digits     (int)   : Symbol decimal places (e.g., 2 for XAUUSD).
                    active_trade_count(int)   : Number of currently open trades for this symbol.
                    current_candle_time(int)  : Unix timestamp of the last confirmed candle.

            daily_stats (dict):
                Tracked state for the current trading day:
                    trades_today              (int)  : Trades opened today.
                    consecutive_losses        (int)  : Current consecutive loss streak.
                    cooldown_until_candle_time(int)  : Unix timestamp — no trade before this.
                    last_reset_date           (str)  : Date string for daily reset tracking.

        Returns:
            Signal dict if a valid trade opportunity is found, else None.
            Signal dict structure:
                {
                    "direction":          str,   # "BUY" or "SELL"
                    "confidence":         float, # 0.0 – 1.0 (for analytics, not decision-making)
                    "entry_candle_high":  float,
                    "entry_candle_low":   float,
                    "entry_candle_close": float,
                    "ema9":               float,
                    "ema15":              float,
                    "atr":                float,
                    "risk_reward_ratio":  float,
                    "reason":             str,
                }
        """
        log_prefix = f"[{self.config['strategy_name']}]"

        # Live monitor status tracking — updated at every filter step
        try:
            import _strategy_status_store as _store
            _store_available = True
        except ImportError:
            _store_available = False

        def _publish(status: dict):
            """Push current filter state to the live monitor store."""
            if _store_available:
                _store.update(status)

        # Base status template
        _status = {
            "engine_running":   True,
            "candle_time":      market_context.get("current_candle_time", 0),
            "spread_pts":       market_context.get("spread_points", 0),
            "active_trades":    market_context.get("active_trade_count", 0),
            "trades_today":     daily_stats.get("trades_today", 0),
            "consecutive_losses": daily_stats.get("consecutive_losses", 0),
            "ema9":             None,
            "ema15":            None,
            "atr":              None,
            "current_price":    None,
            "trend":            None,
            "filters": {
                "sideways":     {"status": "PENDING", "detail": ""},
                "session":      {"status": "PENDING", "detail": ""},
                "position":     {"status": "PENDING", "detail": ""},
                "daily_limit":  {"status": "PENDING", "detail": ""},
                "cons_losses":  {"status": "PENDING", "detail": ""},
                "cooldown":     {"status": "PENDING", "detail": ""},
                "spread":       {"status": "PENDING", "detail": ""},
                "pullback":     {"status": "PENDING", "detail": ""},
                "engulfing":    {"status": "PENDING", "detail": ""},
            },
            "signal":           None,
            "signal_reason":    None,
            "confidence":       None,
        }

        # ── Guard: Sufficient candle data ─────────────────────────────────────
        if len(rates) < self.config["min_candles"]:
            logger.warning(
                f"{log_prefix} Insufficient data: {len(rates)} candles "
                f"(minimum required: {self.config['min_candles']}). Skipping."
            )
            return None

        # ── Step 1: Build DataFrame and Calculate Indicators ──────────────────
        df = pd.DataFrame(rates)
        df["ema9"]  = ta.ema(df["close"], length=self.config["ema_fast"])
        df["ema15"] = ta.ema(df["close"], length=self.config["ema_slow"])
        df["atr"]   = ta.atr(
            df["high"], df["low"], df["close"],
            length=self.config["atr_period"]
        )

        # Reference candles:
        #   df.iloc[-1] → Currently forming candle (do NOT use for entry decisions)
        #   df.iloc[-2] → Last CONFIRMED/COMPLETED candle (entry candle)
        #   df.iloc[-3] → Previous confirmed candle (for engulfing comparison)
        entry_candle = df.iloc[-2]
        prev_candle  = df.iloc[-3]

        # Use indicator values from the confirmed candle only
        ema9  = entry_candle["ema9"]
        ema15 = entry_candle["ema15"]
        atr   = entry_candle["atr"]

        # Guard: Validate indicator values
        if pd.isna(ema9) or pd.isna(ema15) or pd.isna(atr) or atr == 0:
            logger.warning(
                f"{log_prefix} Indicator calculation returned NaN or ATR=0. "
                f"Waiting for more candles. Skipping."
            )
            _publish({**_status, "signal": "WAITING", "signal_reason": "Indicators not ready"})
            return None

        logger.info(
            f"{log_prefix} Indicators — "
            f"EMA9: {ema9:.3f} | EMA15: {ema15:.3f} | ATR: {atr:.5f}"
        )

        # Push initial indicator values
        _status["ema9"]          = round(float(ema9), 3)
        _status["ema15"]         = round(float(ema15), 3)
        _status["atr"]           = round(float(atr), 5)
        _status["current_price"] = round(float(entry_candle["close"]), 3)

        # ── Step 2: Sideways Filter ───────────────────────────────────────────
        ema_distance       = abs(ema9 - ema15)
        sideways_threshold = atr * self.config["sideways_atr_threshold"]

        if ema_distance < sideways_threshold:
            logger.info(
                f"{log_prefix} [SIDEWAYS FILTER] BLOCKED — "
                f"EMA distance ({ema_distance:.5f}) < "
                f"ATR×{self.config['sideways_atr_threshold']} threshold ({sideways_threshold:.5f}). "
                f"Market is sideways. No trade."
            )
            _status["filters"]["sideways"] = {"status": "BLOCKED", "detail": f"EMA gap {ema_distance:.3f} < threshold {sideways_threshold:.3f}"}
            _publish({**_status, "signal": "BLOCKED", "signal_reason": "Market sideways"})
            return None

        _status["filters"]["sideways"] = {"status": "PASS", "detail": f"EMA gap {ema_distance:.3f}"}

        # ── Step 3: Trend Detection ───────────────────────────────────────────
        trend = "BUY" if ema9 > ema15 else "SELL"
        _status["trend"] = trend
        logger.info(
            f"{log_prefix} EMA Trend = {trend} | "
            f"EMA Distance: {ema_distance:.5f} (threshold: {sideways_threshold:.5f})"
        )

        # ── Step 4: Session Filter ────────────────────────────────────────────
        current_candle_time = market_context.get("current_candle_time", 0)
        if current_candle_time > 0 and not self._is_in_session(current_candle_time):
            logger.info(
                f"{log_prefix} [SESSION FILTER] BLOCKED — "
                f"Outside allowed trading sessions (London / New York). No trade."
            )
            _status["filters"]["session"] = {"status": "BLOCKED", "detail": "Outside London/NY session"}
            _publish({**_status, "signal": "BLOCKED", "signal_reason": "Outside session"})
            return None
        _status["filters"]["session"] = {"status": "PASS", "detail": "London or NY session active"}
        logger.info(f"{log_prefix} Session Filter = PASS")

        # ── Step 5: Position Management ───────────────────────────────────────
        active_trade_count = market_context.get("active_trade_count", 0)
        if active_trade_count > 0:
            logger.info(
                f"{log_prefix} [POSITION FILTER] BLOCKED — "
                f"Active trade already open ({active_trade_count}). "
                f"Only one trade allowed at a time."
            )
            _status["filters"]["position"] = {"status": "BLOCKED", "detail": f"{active_trade_count} trade open"}
            _publish({**_status, "signal": "BLOCKED", "signal_reason": "Trade already open"})
            return None
        _status["filters"]["position"] = {"status": "PASS", "detail": "No open trades"}

        # ── Step 6: Daily Safety — Max Trades ────────────────────────────────
        trades_today = daily_stats.get("trades_today", 0)
        if trades_today >= self.config["max_trades_per_day"]:
            logger.info(
                f"{log_prefix} [DAILY LIMIT] BLOCKED — "
                f"Maximum trades reached for today "
                f"({trades_today}/{self.config['max_trades_per_day']}). No more trades today."
            )
            _status["filters"]["daily_limit"] = {"status": "BLOCKED", "detail": f"{trades_today}/{self.config['max_trades_per_day']} trades"}
            _publish({**_status, "signal": "BLOCKED", "signal_reason": "Daily trade limit reached"})
            return None
        _status["filters"]["daily_limit"] = {"status": "PASS", "detail": f"{trades_today}/{self.config['max_trades_per_day']} trades"}

        # ── Step 7: Daily Safety — Consecutive Losses ─────────────────────────
        consecutive_losses = daily_stats.get("consecutive_losses", 0)
        if consecutive_losses >= self.config["max_consecutive_losses"]:
            logger.info(
                f"{log_prefix} [CONSECUTIVE LOSS] BLOCKED — "
                f"{consecutive_losses} consecutive losses detected. "
                f"Stopping all trading for the rest of today to protect capital."
            )
            _status["filters"]["cons_losses"] = {"status": "BLOCKED", "detail": f"{consecutive_losses} consecutive losses"}
            _publish({**_status, "signal": "BLOCKED", "signal_reason": "Consecutive loss limit hit"})
            return None
        _status["filters"]["cons_losses"] = {"status": "PASS", "detail": f"{consecutive_losses} losses streak"}

        # ── Step 8: Cooldown Filter ───────────────────────────────────────────
        cooldown_until = daily_stats.get("cooldown_until_candle_time", 0)
        if current_candle_time > 0 and current_candle_time < cooldown_until:
            remaining_seconds = cooldown_until - current_candle_time
            remaining_candles = remaining_seconds // self.config["timeframe_seconds"]
            logger.info(
                f"{log_prefix} [COOLDOWN] BLOCKED — "
                f"{remaining_candles} candle(s) ({remaining_seconds}s) remaining "
                f"before next trade is allowed."
            )
            _status["filters"]["cooldown"] = {"status": "BLOCKED", "detail": f"{remaining_candles} candle(s) remaining"}
            _publish({**_status, "signal": "BLOCKED", "signal_reason": "Cooldown active"})
            return None
        _status["filters"]["cooldown"] = {"status": "PASS", "detail": "No cooldown"}
        if cooldown_until > 0:
            logger.info(f"{log_prefix} Cooldown = PASS")

        # ── Step 9: Spread Filter ─────────────────────────────────────────────
        spread_points  = market_context.get("spread_points", 0)
        symbol_digits  = market_context.get("symbol_digits", 2)

        if spread_points > 0:
            if not self._is_spread_acceptable(spread_points):
                spread_price = spread_points / (10 ** symbol_digits)
                logger.info(
                    f"{log_prefix} [SPREAD FILTER] BLOCKED — "
                    f"Current spread {spread_points} pts "
                    f"({spread_price:.{symbol_digits}f}) exceeds maximum "
                    f"allowed {self.config['max_spread_points']} pts. No trade."
                )
                _status["filters"]["spread"] = {"status": "BLOCKED", "detail": f"{spread_points} pts (max {self.config['max_spread_points']}pts)"}
                _publish({**_status, "signal": "BLOCKED", "signal_reason": "Spread too high"})
                return None
            _status["filters"]["spread"] = {"status": "PASS", "detail": f"{spread_points} pts"}
            logger.info(
                f"{log_prefix} Spread Filter = PASS "
                f"({spread_points} pts <= {self.config['max_spread_points']} pts)"
            )
        else:
            _status["filters"]["spread"] = {"status": "PASS", "detail": "N/A"}

        # ── Step 10: Pullback Detection ───────────────────────────────────────
        close_price    = float(entry_candle["close"])
        ema_zone_mid   = (ema9 + ema15) / 2.0
        pullback_zone  = atr * self.config["pullback_zone_atr_factor"]
        price_to_ema   = abs(close_price - ema_zone_mid)

        if price_to_ema > pullback_zone:
            logger.info(
                f"{log_prefix} [PULLBACK FILTER] BLOCKED — "
                f"Price ({close_price:.3f}) is not in the EMA zone. "
                f"Distance to EMA mid ({ema_zone_mid:.3f}): {price_to_ema:.5f} "
                f"> Zone ({pullback_zone:.5f}). Waiting for pullback."
            )
            _status["filters"]["pullback"] = {"status": "BLOCKED", "detail": f"Price {close_price:.2f} far from EMA zone {ema_zone_mid:.2f}"}
            _publish({**_status, "signal": "BLOCKED", "signal_reason": "Waiting for pullback"})
            return None
        _status["filters"]["pullback"] = {"status": "PASS", "detail": f"Price {close_price:.2f} in EMA zone"}
        logger.info(
            f"{log_prefix} Pullback = PASS — "
            f"Price: {close_price:.3f} | "
            f"EMA Mid: {ema_zone_mid:.3f} | "
            f"Distance: {price_to_ema:.5f} <= Zone: {pullback_zone:.5f}"
        )

        # ── Step 11: Engulfing Candle Confirmation ────────────────────────────
        if trend == "BUY":
            engulfing_detected = self._is_bullish_engulfing(prev_candle, entry_candle)
            pattern_name       = "Bullish Engulfing"
        else:
            engulfing_detected = self._is_bearish_engulfing(prev_candle, entry_candle)
            pattern_name       = "Bearish Engulfing"

        if not engulfing_detected:
            logger.info(
                f"{log_prefix} [{pattern_name.upper()}] NOT DETECTED on confirmed candle. "
                f"Prev O/C: {prev_candle['open']:.3f}/{prev_candle['close']:.3f} | "
                f"Curr O/C: {entry_candle['open']:.3f}/{entry_candle['close']:.3f}. "
                f"No signal."
            )
            _status["filters"]["engulfing"] = {"status": "BLOCKED", "detail": f"No {pattern_name} pattern"}
            _publish({**_status, "signal": "BLOCKED", "signal_reason": f"No {pattern_name} pattern"})
            return None
        _status["filters"]["engulfing"] = {"status": "PASS", "detail": pattern_name + " detected"}
        logger.info(
            f"{log_prefix} {pattern_name} = TRUE ✅ | "
            f"Prev O/C: {prev_candle['open']:.3f}/{prev_candle['close']:.3f} | "
            f"Curr O/C: {entry_candle['open']:.3f}/{entry_candle['close']:.3f}"
        )

        # ── Step 12: Calculate Signal Confidence (Analytics Only) ─────────────
        # Note: Confidence does NOT affect trade decisions in V1.
        # It is stored for future analytics, strategy comparison, and AI optimization.
        confidence = self._calculate_confidence(
            ema_distance, sideways_threshold, price_to_ema, pullback_zone
        )

        # ── Step 13: Build and Return Signal ──────────────────────────────────
        signal = {
            "direction":           trend,
            "confidence":          round(confidence, 4),
            "entry_candle_high":   float(entry_candle["high"]),
            "entry_candle_low":    float(entry_candle["low"]),
            "entry_candle_close":  float(entry_candle["close"]),
            "ema9":                round(float(ema9), 5),
            "ema15":               round(float(ema15), 5),
            "atr":                 round(float(atr), 5),
            "risk_reward_ratio":   self.config["risk_reward_ratio"],
            "reason":              f"EMA Trend ({trend}) + Pullback + {pattern_name}",
        }

        # Publish final SIGNAL status to live monitor
        _publish({
            **_status,
            "signal":        trend,
            "signal_reason": signal["reason"],
            "confidence":    round(confidence, 4),
        })

        logger.info(
            f"{log_prefix} SIGNAL GENERATED -> {trend} | "
            f"Confidence: {confidence:.1%} | "
            f"Entry Candle High: {signal['entry_candle_high']} | "
            f"Low: {signal['entry_candle_low']} | "
            f"Reason: {signal['reason']}"
        )
        return signal

    # ─────────────────────────────────────────────────────────────────────────
    # HELPER METHODS
    # ─────────────────────────────────────────────────────────────────────────

    def _is_in_session(self, candle_time_unix: int) -> bool:
        """
        Check if the given Unix timestamp falls within any allowed trading session.
        Sessions are defined in STRATEGY_CONFIG["sessions"] (UTC hours).
        """
        dt       = datetime.fromtimestamp(candle_time_unix, tz=timezone.utc)
        utc_hour = dt.hour

        for session_name, session_times in self.config["sessions"].items():
            if session_times["start"] <= utc_hour < session_times["end"]:
                return True
        return False

    def _is_spread_acceptable(self, spread_points: int) -> bool:
        """
        Return True if the current spread does not exceed the configured limit.
        Comparison is in broker points (broker-independent).
        """
        return spread_points <= self.config["max_spread_points"]

    def _is_bullish_engulfing(self, prev: pd.Series, curr: pd.Series) -> bool:
        """
        Bullish Engulfing Pattern:
            - Previous candle is BEARISH (close < open)
            - Current candle is BULLISH (close > open)
            - Current body fully engulfs previous body:
                current.close > previous.open  AND
                current.open  < previous.close
        """
        prev_bearish    = prev["close"] < prev["open"]
        curr_bullish    = curr["close"] > curr["open"]
        curr_engulfs    = (
            curr["close"] > prev["open"] and
            curr["open"]  < prev["close"]
        )
        return prev_bearish and curr_bullish and curr_engulfs

    def _is_bearish_engulfing(self, prev: pd.Series, curr: pd.Series) -> bool:
        """
        Bearish Engulfing Pattern:
            - Previous candle is BULLISH (close > open)
            - Current candle is BEARISH (close < open)
            - Current body fully engulfs previous body:
                current.close < previous.open  AND
                current.open  > previous.close
        """
        prev_bullish    = prev["close"] > prev["open"]
        curr_bearish    = curr["close"] < curr["open"]
        curr_engulfs    = (
            curr["close"] < prev["open"] and
            curr["open"]  > prev["close"]
        )
        return prev_bullish and curr_bearish and curr_engulfs

    def _calculate_confidence(
        self,
        ema_distance: float,
        sideways_threshold: float,
        price_to_ema: float,
        pullback_zone: float
    ) -> float:
        """
        Calculate a confidence score for analytics purposes only.
        Range: 0.0 – 1.0

        This score does NOT affect trading decisions in V1.
        It is stored in the database for future analytics, AI optimization,
        and strategy comparison tools.

        Scoring Breakdown:
            EMA separation strength : 0.30 (stronger trend = higher score)
            Pullback quality        : 0.30 (closer to EMA mid = higher score)
            Engulfing confirmed     : 0.30 (always 0.30 when this method is called)
            Filters passed          : 0.10 (session + spread + all guards passed)
        """
        # EMA strength: how far above the sideways threshold
        ema_strength  = min(ema_distance / max(sideways_threshold * 3.0, 1e-9), 1.0)
        ema_score     = 0.30 * ema_strength

        # Pullback quality: closer to EMA zone center = better quality
        pullback_qual = 1.0 - min(price_to_ema / max(pullback_zone, 1e-9), 1.0)
        pullback_score = 0.30 * pullback_qual

        # Engulfing confirmed (we are here = pattern was detected)
        engulf_score  = 0.30

        # All filters passed (session, spread, daily limit, cooldown, position)
        filter_score  = 0.10

        return ema_score + pullback_score + engulf_score + filter_score
