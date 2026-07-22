"""
GTAP Trading Execution Module
==============================
Handles all trade execution and monitoring functions.

Responsibilities
----------------
- execute_order()         : Place a new trade on MT5 based on a strategy signal.
- monitor_active_trades() : Detect trades closed on MT5 and report them to Node.js.
- fetch_close_details()   : Query MT5 history for a closed trade's details.

Stop Loss / Take Profit Calculation (V1 Specification)
-------------------------------------------------------
BUY  : SL = Entry Candle Low  | TP = Entry Price + (Risk × RR Ratio)
SELL : SL = Entry Candle High | TP = Entry Price - (Risk × RR Ratio)

Risk is measured in price units (not fixed points).
RR Ratio is taken from the strategy signal (default 1:2).

No fixed-point SL buffers are used in V1.
"""

import time
import MetaTrader5 as mt5
import config
import node_client
from logger import logger


def execute_order(signal_data: dict, settings: dict):
    """
    Place a market order on MT5 based on a structured signal from the strategy.

    Args:
        signal_data (dict): Signal dict from strategy. Must contain:
                            direction, entry_candle_high, entry_candle_low,
                            entry_candle_close, risk_reward_ratio, confidence, reason.
        settings    (dict): Current dashboard settings containing:
                            symbol, lotSize, broker, accountNumber, server.

    Returns:
        dict: Trade payload (for Node.js) if order was successfully placed.
        None: If order failed or was rejected.
    """
    direction         = signal_data.get("direction")        # "BUY" or "SELL"
    entry_candle_high = signal_data.get("entry_candle_high", 0.0)
    entry_candle_low  = signal_data.get("entry_candle_low", 0.0)
    confidence        = signal_data.get("confidence", 0.0)
    signal_reason     = signal_data.get("reason", "")
    rr_ratio          = signal_data.get("risk_reward_ratio", 2.0)

    if direction not in ("BUY", "SELL"):
        logger.error(f"[Execution] Invalid signal direction: '{direction}'. Aborting.")
        return None

    symbol = settings.get("symbol", "XAUUSD")
    import mt5_connector
    resolved_symbol = mt5_connector.resolve_symbol(symbol)
    lot_size        = float(settings.get("lotSize", 0.01))
    strategy_name   = settings.get("strategyName", "EMA Engulfing (V1)")

    # ── 1. Fetch Current Market Prices ────────────────────────────────────────
    if config.DRY_RUN:
        # In DRY_RUN mode, use a realistic mock price for XAUUSD
        class _MockTick:
            bid = 2320.00
            ask = 2320.30
        symbol_info = _MockTick()
    else:
        symbol_info = mt5.symbol_info_tick(resolved_symbol)
        if symbol_info is None:
            logger.error(
                f"[Execution] Failed to fetch symbol tick for '{resolved_symbol}'. "
                f"MT5 error: {mt5.last_error()}"
            )
            return None

    # ── 2. Calculate Price, SL, and TP (Candle-Based — V1 Specification) ──────
    if direction == "BUY":
        price      = symbol_info.ask
        sl         = entry_candle_low          # BUY SL = Entry Candle Low
        risk       = price - sl                # Risk in price units
        tp         = price + (risk * rr_ratio) # TP = Price + Risk × RR
        order_type = mt5.ORDER_TYPE_BUY

    else:  # SELL
        price      = symbol_info.bid
        sl         = entry_candle_high         # SELL SL = Entry Candle High
        risk       = sl - price                # Risk in price units
        tp         = price - (risk * rr_ratio) # TP = Price - Risk × RR
        order_type = mt5.ORDER_TYPE_SELL

    # ── 3. Safety Validation ──────────────────────────────────────────────────
    if risk <= 0:
        logger.error(
            f"[Execution] Invalid SL/TP: risk = {risk:.5f} (must be > 0). "
            f"Price: {price:.3f}, SL: {sl:.3f}. Order rejected."
        )
        return None

    if tp <= 0 or sl <= 0:
        logger.error(
            f"[Execution] Invalid SL ({sl:.3f}) or TP ({tp:.3f}). Order rejected."
        )
        return None

    logger.info(
        f"[Execution] Preparing {direction} order — "
        f"Symbol: {symbol} | Price: {price:.3f} | "
        f"SL: {sl:.3f} (candle {'low' if direction == 'BUY' else 'high'}) | "
        f"TP: {tp:.3f} | "
        f"Risk: {risk:.3f} pts | RR: 1:{rr_ratio} | "
        f"Lot: {lot_size} | Confidence: {confidence:.1%}"
    )

    # ── 4. DRY_RUN Mode: Return mock trade without sending to MT5 ─────────────
    if config.DRY_RUN:
        mock_ticket = int(time.time())
        logger.info(
            f"[Execution][DRY_RUN] Mock order placed successfully. "
            f"Ticket: {mock_ticket} | {direction} {symbol} @ {price:.3f}"
        )
        return {
            "mt5Ticket":        mock_ticket,
            "symbol":           symbol,
            "orderType":        direction,
            "lotSize":          lot_size,
            "entryPrice":       price,
            "stopLoss":         sl,
            "takeProfit":       tp,
            "broker":           "XM (Mock)",
            "tradeSource":      "bot",
            "openTime":         _new_date_iso(),
            "strategyName":     strategy_name,
            "signalConfidence": confidence,
            "signalReason":     signal_reason,
        }

    # ── 5. Send Real Order to MT5 ─────────────────────────────────────────────
    mt5.symbol_select(resolved_symbol, True)
    sym = mt5.symbol_info(resolved_symbol)
    digits = getattr(sym, 'digits', 2) if sym else 2
    price  = round(price, digits)
    sl     = round(sl, digits)
    tp     = round(tp, digits)

    filling_modes = [mt5.ORDER_FILLING_IOC, mt5.ORDER_FILLING_FOK, mt5.ORDER_FILLING_RETURN]
    if sym:
        fm = getattr(sym, 'filling_mode', 0)
        preferred = []
        if fm & 2: preferred.append(mt5.ORDER_FILLING_IOC)
        if fm & 1: preferred.append(mt5.ORDER_FILLING_FOK)
        preferred.append(mt5.ORDER_FILLING_RETURN)
        filling_modes = preferred + [m for m in filling_modes if m not in preferred]

    result = None
    for fill_type in filling_modes:
        request = {
            "action":       mt5.TRADE_ACTION_DEAL,
            "symbol":       resolved_symbol,
            "volume":       lot_size,
            "type":         order_type,
            "price":        price,
            "sl":           sl,
            "tp":           tp,
            "deviation":    20,
            "magic":        123456,
            "comment":      f"GTAP {direction}",
            "type_time":    mt5.ORDER_TIME_GTC,
            "type_filling": fill_type,
        }
        res = mt5.order_send(request)
        if res and res.retcode == mt5.TRADE_RETCODE_DONE:
            result = res
            break
        else:
            err_code = res.retcode if res else "N/A"
            err_comm = res.comment if res else "No result"
            logger.warning(f"[Execution] Filling mode {fill_type} rejected ({err_code}: {err_comm}). Trying next filling mode...")

    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        retcode = result.retcode if result else "N/A"
        comment = result.comment if result else "No result"
        logger.error(
            f"[Execution] Order FAILED after trying all filling modes. "
            f"Code: {retcode} | Comment: {comment}"
        )
        return None

    logger.info(
        f"[Execution] ✅ Order EXECUTED on MT5. "
        f"Ticket: {result.order} | {direction} {symbol} @ {price:.3f} | "
        f"SL: {sl:.3f} | TP: {tp:.3f}"
    )

    return {
        "mt5Ticket":        result.order,
        "symbol":           symbol,
        "orderType":        direction,
        "lotSize":          lot_size,
        "entryPrice":       price,
        "stopLoss":         sl,
        "takeProfit":       tp,
        "broker":           settings.get("broker", "XM"),
        "tradeSource":      "bot",
        "openTime":         _new_date_iso(),
        "strategyName":     strategy_name,
        "signalConfidence": confidence,
        "signalReason":     signal_reason,
    }


def monitor_active_trades(active_trades: list, settings: dict) -> list:
    """
    Check if any active trades have been closed on MT5 (via SL/TP hit or manual close).
    When a trade is detected as closed, report it to the Node.js backend.

    Args:
        active_trades (list): Active trade records from the Node.js database.
        settings      (dict): Current dashboard settings.

    Returns:
        list: Close events for trades that were closed this cycle.
              Each event dict contains: ticket, profitLoss, closeReason.
              Used by main.py to update daily_stats (consecutive losses, cooldown).
    """
    close_events = []

    if not active_trades:
        return close_events

    # ── DRY_RUN Mode: Simulate random trade exits ─────────────────────────────
    if config.DRY_RUN:
        import random
        for trade in active_trades:
            # Simulate a ~15% chance per monitoring cycle that a trade closes
            if random.random() < 0.15:
                ticket      = trade.get("mt5Ticket")
                trade_db_id = trade.get("_id")
                is_profit   = random.choice([True, False])
                pnl         = random.uniform(15.0, 60.0) if is_profit else random.uniform(-10.0, -35.0)
                reason      = "TP" if is_profit else "SL"
                open_time   = trade.get("openTime", _new_date_iso())
                duration    = int(random.uniform(300, 1800))

                logger.info(
                    f"[Execution][DRY_RUN] Trade {ticket} closed via {reason}. "
                    f"PnL: ${pnl:.2f}"
                )

                close_payload = {
                    "exitPrice":   trade.get("entryPrice", 2320.0) + (pnl / 100.0),
                    "closeTime":   _new_date_iso(),
                    "profitLoss":  round(pnl, 2),
                    "closeReason": reason,
                    "duration":    duration,
                }
                node_client.close_trade(trade_db_id, close_payload)

                close_events.append({
                    "ticket":      ticket,
                    "profitLoss":  pnl,
                    "closeReason": reason,
                })
        return close_events

    # ── Live Mode: Query MT5 open positions ───────────────────────────────────
    positions = mt5.positions_get()
    if positions is None:
        logger.error(f"[Execution] Failed to fetch open positions from MT5: {mt5.last_error()}")
        return close_events

    open_ticket_map = {pos.ticket: pos for pos in positions}

    for trade in active_trades:
        ticket      = trade.get("mt5Ticket")
        trade_db_id = trade.get("_id")

        if ticket not in open_ticket_map:
            # Trade is no longer open on MT5 — SL/TP hit or manually closed
            logger.info(
                f"[Execution] Trade {ticket} is no longer open on MT5. "
                f"Querying history to record close details..."
            )
            close_details = fetch_close_details(ticket)

            if close_details:
                node_client.close_trade(trade_db_id, close_details)
                close_events.append({
                    "ticket":      ticket,
                    "profitLoss":  close_details.get("profitLoss", 0.0),
                    "closeReason": close_details.get("closeReason", "Unknown"),
                })
            else:
                logger.error(f"[Execution] Could not retrieve close details for ticket {ticket}.")

    return close_events


def fetch_close_details(ticket: int) -> dict | None:
    """
    Query MT5 deal history to retrieve closing details for a trade.

    Args:
        ticket (int): MT5 order ticket number.

    Returns:
        dict: Close details (exitPrice, closeTime, closeReason, profitLoss, duration).
        None: If no history found.
    """
    now         = int(time.time())
    from_date   = now - 24 * 60 * 60   # Last 24 hours

    history_deals = mt5.history_deals_get(from_date, now + 60, ticket=ticket)

    if not history_deals:
        # Extend search range if trade is older than 24 hours
        history_deals = mt5.history_deals_get(ticket=ticket)

    if not history_deals:
        logger.warning(f"[Execution] No deal history found for ticket {ticket}.")
        return None

    # The opening deal has entry=0 (IN), closing deal has entry=1 (OUT)
    opening_deal = None
    closing_deal = None

    for deal in history_deals:
        entry_type = getattr(deal, "entry", -1)
        if entry_type == 0:
            opening_deal = deal
        elif entry_type == 1:
            closing_deal = deal

    if not closing_deal:
        # Fallback: use the last deal in history
        closing_deal = history_deals[-1]

    # Map MT5 close reason codes
    # mt5.DEAL_REASON_SL = 3, mt5.DEAL_REASON_TP = 4
    reason_map = {3: "SL", 4: "TP"}
    reason_code = getattr(closing_deal, "reason", 0)
    close_reason = reason_map.get(reason_code, "Manual")

    # Calculate duration
    open_time_unix  = getattr(opening_deal, "time", 0) if opening_deal else 0
    close_time_unix = getattr(closing_deal, "time", now)
    duration        = int(close_time_unix - open_time_unix) if open_time_unix > 0 else 0

    return {
        "exitPrice":   float(getattr(closing_deal, "price", 0.0)),
        "closeTime":   _time_to_iso(close_time_unix),
        "closeReason": close_reason,
        "profitLoss":  float(getattr(closing_deal, "profit", 0.0)),
        "duration":    duration,
    }


# ─────────────────────────────────────────────────────────────────────────────
# UTILITY FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def _time_to_iso(timestamp: int) -> str:
    """Convert a Unix timestamp to ISO 8601 UTC string."""
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(timestamp))


def _new_date_iso() -> str:
    """Return the current UTC time as an ISO 8601 string."""
    return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
