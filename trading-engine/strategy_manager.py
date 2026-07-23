"""
GTAP Strategy Manager
======================
Routes engine requests to the currently active trading strategy.

Architecture
------------
Trading Engine (main.py)
      │
      ▼
  StrategyManager          ← This module
      │
      ▼
  Active Strategy          ← e.g., EMAEngulfingStrategy

Design Principles
-----------------
- The Trading Engine NEVER contains strategy logic.
- Adding a new strategy requires ONLY:
    1. Creating a new module inside strategies/
    2. Registering it in STRATEGY_REGISTRY below.
  No changes to the Trading Engine are ever needed.

Supported Strategies (V1)
--------------------------
    ema_engulfing  : EMA 9/15 + Engulfing Candle (Default, Active)

Future Strategies (Roadmap — Do NOT implement now)
---------------------------------------------------
    rsi_strategy, macd_strategy, supertrend, price_action,
    smc_ict, custom_strategy, strategy_builder
"""

from logger import logger
from strategies.ema_engulfing_strategy import EMAEngulfingStrategy

# ─────────────────────────────────────────────────────────────────────────────
# STRATEGY REGISTRY
# To add a new strategy:
#   1. Create strategies/my_new_strategy.py with a class implementing check_signals()
#   2. Import it here
#   3. Add to STRATEGY_REGISTRY: {"my_strategy_key": MyNewStrategyClass}
# The Trading Engine does NOT need to be modified.
# ─────────────────────────────────────────────────────────────────────────────
STRATEGY_REGISTRY = {
    "ema_engulfing": EMAEngulfingStrategy,
    # Future strategies will be registered here:
    # "rsi_strategy":    RSIStrategy,
    # "macd_strategy":   MACDStrategy,
    # "supertrend":      SupertrendStrategy,
}

DEFAULT_STRATEGY = "ema_engulfing"


class StrategyManager:
    """
    Middleware between the Trading Engine and the active Strategy module.

    The Trading Engine calls only two methods:
        - get_signal()          → Get trade signal from active strategy
        - get_strategy_name()   → Get display name for telemetry/dashboard

    All strategy logic lives inside the strategy modules.
    """

    def __init__(self, strategy_name: str = DEFAULT_STRATEGY, config_overrides: dict = None):
        """
        Initialize the Strategy Manager with the specified strategy.

        Args:
            strategy_name   : Key from STRATEGY_REGISTRY. Defaults to 'ema_engulfing'.
            config_overrides: Optional dict to override strategy config parameters.
        """
        if strategy_name not in STRATEGY_REGISTRY:
            logger.warning(
                f"[StrategyManager] Unknown strategy key: '{strategy_name}'. "
                f"Available: {list(STRATEGY_REGISTRY.keys())}. "
                f"Falling back to default: '{DEFAULT_STRATEGY}'."
            )
            strategy_name = DEFAULT_STRATEGY

        self._strategy_key  = strategy_name
        self._strategy      = STRATEGY_REGISTRY[strategy_name](config_overrides=config_overrides)

        logger.info(
            f"[StrategyManager] Active strategy: '{self.get_strategy_name()}' "
            f"(key: '{self._strategy_key}')"
        )

    def get_signal(self, rates: list, market_context: dict, daily_stats: dict) -> dict | None:
        """
        Request a trading signal from the active strategy.

        Args:
            rates          : List of OHLCV dicts (chronological order, oldest first).
                             Last entry is the currently-forming candle.
            market_context : Runtime broker/market data dict:
                               spread_points      (int)  : Current spread in broker points.
                               symbol_digits      (int)  : Symbol decimal precision.
                               active_trade_count (int)  : Open trades for this symbol.
                               current_candle_time(int)  : Unix timestamp of last confirmed candle.
            daily_stats    : Current-day trading statistics dict:
                               trades_today              (int)  : Trades opened today.
                               consecutive_losses        (int)  : Current consecutive loss streak.
                               cooldown_until_candle_time(int)  : Cooldown timestamp.
                               last_reset_date           (str)  : For daily reset tracking.

        Returns:
            Signal dict if all conditions pass, else None.
        """
        return self._strategy.check_signals(rates, market_context, daily_stats)

    def evaluate(self, rates: list, settings_or_context: dict, daily_stats: dict) -> dict | None:
        """Alias method for get_signal to support evaluation with settings or market_context."""
        if "spread_points" in settings_or_context:
            context = settings_or_context
        else:
            context = {
                "spread_points": 15,
                "symbol_digits": 2,
                "active_trade_count": 0,
                "current_candle_time": rates[-1]["time"] if rates else 0,
                "demo_mode": settings_or_context.get("demoMode", True)
            }
        return self.get_signal(rates, context, daily_stats)

    def get_strategy_name(self) -> str:
        """Return the human-readable display name of the active strategy."""
        return self._strategy.config.get("strategy_name", self._strategy_key)

    def get_active_strategy_key(self) -> str:
        """Return the registry key of the active strategy."""
        return self._strategy_key

    def list_available_strategies(self) -> list:
        """Return a list of all registered strategy keys."""
        return list(STRATEGY_REGISTRY.keys())
