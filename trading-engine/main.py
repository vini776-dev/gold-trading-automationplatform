import os
import json
import time
import datetime
import MetaTrader5 as mt5
import config
import mt5_connector
import node_client
import execution
import engine_api
from strategy_manager import StrategyManager
from logger import logger


STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'state.json')

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                state = json.load(f)
                logger.info(f"Loaded persistent state: {state}")
                return state
        except Exception as e:
            logger.error(f"Failed to read state.json: {e}")
    
    return {
        "last_processed_candle_time": 0,
        "last_processed_signal":      None,
        "engine_status":              "offline",
        "daily_stats": {
            "last_reset_date":           "",
            "trades_today":              0,
            "consecutive_losses":        0,
            "cooldown_until_candle_time": 0,
        }
    }


def _get_today_utc() -> str:
    """Return today's date in YYYY-MM-DD format (UTC)."""
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')


def _reset_daily_stats_if_new_day(state: dict) -> bool:
    """
    Check if a new UTC trading day has started.
    If yes, reset daily_stats and return True.
    Returns False if no reset was needed.
    """
    today = _get_today_utc()
    daily_stats = state.setdefault("daily_stats", {})
    if daily_stats.get("last_reset_date", "") != today:
        logger.info(f"[DailyStats] New trading day detected ({today}). Resetting daily stats.")
        state["daily_stats"] = {
            "last_reset_date":            today,
            "trades_today":               0,
            "consecutive_losses":         0,
            "cooldown_until_candle_time": 0,
        }
        return True
    return False

def save_state(state):
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write state.json: {e}")

def run_engine():
    logger.info("Initializing GTAP Python Trading Engine...")

    # 0. Start the Engine API HTTP server (port 5001) so Node.js can call test-connection
    engine_api.start_engine_api()

    # 1. Load configuration, state, and daily stats
    state = load_state()
    _reset_daily_stats_if_new_day(state)
    save_state(state)

    # 2. Initialize Strategy Manager (plug-and-play — engine never contains strategy logic)
    strategy_manager = StrategyManager(strategy_name="ema_engulfing")
    logger.info(f"Strategy Manager ready. Active strategy: '{strategy_manager.get_strategy_name()}'")

    # 3. Get initial settings to restore previous session state (Session Recovery)
    settings = node_client.get_settings()
    if settings:
        initial_state = settings.get('engineState', 'OFFLINE')
        logger.info(f"Restoring previous engine state from database: {initial_state}")
        current_state = initial_state
    else:
        logger.warning("Could not fetch configurations from database. Defaulting to OFFLINE state.")
        current_state = 'OFFLINE'

    # If restored state is active, initialize MT5 connection
    if current_state in ['RUNNING', 'MONITORING', 'PAUSED']:
        if not config.DRY_RUN:
            if not mt5_connector.initialize_mt5(settings):
                logger.error("Failed to restore MT5 connection. Setting state to ERROR.")
                current_state = 'ERROR'
        else:
            logger.info("[DRY_RUN] MT5 connection restored (bypassed).")

        # Sync open positions
        try:
            active_trades = node_client.get_active_trades()
            execution.monitor_active_trades(active_trades, settings)
        except Exception as e:
            logger.error(f"Failed to sync active trades on recovery: {e}")

    running_since     = time.time() if current_state in ['RUNNING', 'MONITORING'] else None
    processed_command = 'NONE'

    logger.info(f"Engine is now {current_state}. Entering control loop...")

    while True:
        try:
            # 1 second loop ticks
            time.sleep(1)

            # Get latest settings & check for commands from database
            settings = node_client.get_settings()
            if not settings:
                continue

            received_command = settings.get('engineCommand', 'NONE')
            
            # 2. Handle state transitions from commands
            if received_command != 'NONE' and received_command != processed_command:
                logger.info(f"Received command from dashboard: {received_command}")
                
                if received_command == 'START':
                    current_state = 'STARTING'
                    validation_error = None
                    
                    # SAFETY CHECK 1: MT5 Connection & Credentials (Refuse start if failed)
                    if not config.DRY_RUN:
                        if not mt5_connector.initialize_mt5(settings):
                            validation_error = "MT5 terminal login failed."
                        else:
                            # SAFETY CHECK 2: Symbol availability check
                            symbol = settings.get('symbol', 'XAUUSD')
                            resolved_symbol = mt5_connector.resolve_symbol(symbol)
                            symbol_info = mt5.symbol_info(resolved_symbol)
                            if symbol_info is None:
                                validation_error = f"Symbol {symbol} not found on broker."
                            else:
                                if not symbol_info.visible:
                                    if not mt5.symbol_select(resolved_symbol, True):
                                        validation_error = f"Symbol {symbol} cannot be selected."
                                
                                # SAFETY CHECK 3: Market open check
                                if symbol_info.trade_mode == mt5.SYMBOL_TRADE_MODE_DISABLED:
                                    validation_error = f"Market is disabled/closed for symbol {symbol}."
                                
                                # SAFETY CHECK 4: Read-only investor account check
                                account_info = mt5.account_info()
                                if account_info is None:
                                    validation_error = "Could not fetch account info from MT5."
                                elif not account_info.trade_allowed:
                                    validation_error = "MT5 account is read-only (logged in with investor password)."
                    
                    if validation_error:
                        logger.error(f"Engine safety check validation failed: {validation_error}")
                        current_state = 'ERROR'
                    else:
                        # Success validation: Transition to RUNNING if auto trading is on, else MONITORING
                        if settings.get('isAutoTrading', False):
                            current_state = 'RUNNING'
                        else:
                            current_state = 'MONITORING'
                        running_since = time.time()
                        logger.info(f"Engine successfully started. Transitioned to {current_state}")
                
                elif received_command == 'PAUSE':
                    current_state = 'PAUSED'
                    logger.info("Engine PAUSED.")
                
                elif received_command == 'STOP':
                    current_state = 'STOPPING'
                    if not config.DRY_RUN:
                        mt5_connector.disconnect_mt5()
                    current_state = 'OFFLINE'
                    running_since = None
                    logger.info("Engine STOPPED. Disconnected from MT5.")
                
                elif received_command == 'RESTART':
                    current_state = 'STOPPING'
                    if not config.DRY_RUN:
                        mt5_connector.disconnect_mt5()
                    
                    current_state = 'STARTING'
                    if not config.DRY_RUN:
                        if not mt5_connector.initialize_mt5(settings):
                            current_state = 'ERROR'
                        else:
                            current_state = 'RUNNING' if settings.get('isAutoTrading', False) else 'MONITORING'
                    else:
                        current_state = 'RUNNING'
                    
                    running_since = time.time() if current_state in ['RUNNING', 'MONITORING'] else None
                    logger.info(f"Engine successfully RESTARTED. Transitioned to {current_state}")
                
                elif received_command == 'EMERGENCY_STOP':
                    current_state = 'PAUSED'
                    logger.warning("🛑 EMERGENCY STOP TRIGGERED! Cancelling all pending orders...")
                    
                    if not config.DRY_RUN:
                        # Cancel all pending orders for active symbol
                        symbol = settings.get('symbol', 'XAUUSD')
                        resolved_symbol = mt5_connector.resolve_symbol(symbol)
                        orders = mt5.orders_get(symbol=resolved_symbol)
                        if orders:
                            for order in orders:
                                cancel_req = {
                                    "action": mt5.TRADE_ACTION_REMOVE,
                                    "order": order.ticket
                                }
                                mt5.order_send(cancel_req)
                                logger.warning(f"Cancelled pending order ticket {order.ticket}")
                    
                    logger.info("Engine emergency safety hold active. Transitioned to PAUSED.")
                
                processed_command = received_command

            # 3. Synchronize state with heartbeat and compile telemetry metrics
            running_time = int(time.time() - running_since) if running_since else 0
            
            # Fetch active positions count
            open_positions = 0
            broker_name = settings.get('broker', 'XM')
            account_number = settings.get('accountNumber', '')
            server_name = settings.get('server', '')
            
            if current_state in ['RUNNING', 'MONITORING', 'PAUSED']:
                if not config.DRY_RUN:
                    symbol = settings.get('symbol', 'XAUUSD')
                    resolved_symbol = mt5_connector.resolve_symbol(symbol)
                    pos_array = mt5.positions_get(symbol=resolved_symbol)
                    open_positions = len(pos_array) if pos_array else 0
                    
                    acc_info = mt5.account_info()
                    if acc_info:
                        import datetime
                        now = datetime.datetime.now()
                        today_start = datetime.datetime(now.year, now.month, now.day, 0, 0, 0)
                        history_deals = mt5.history_deals_get(today_start, now)
                        
                        today_profit = sum(deal.profit for deal in history_deals) if history_deals else 0.0
                        today_profit += sum(deal.swap + deal.commission for deal in history_deals) if history_deals else 0.0
                        
                        balance = getattr(acc_info, 'balance', 0.0)
                        equity = getattr(acc_info, 'equity', 0.0)
                        margin_free = getattr(acc_info, 'margin_free', 0.0)
                        margin_level = getattr(acc_info, 'margin_level', 0.0)
                        floating_pnl = getattr(acc_info, 'profit', 0.0)

                        node_client.update_account_metrics(
                            balance=balance,
                            equity=equity,
                            margin_free=margin_free,
                            margin_level=margin_level,
                            floating_pnl=floating_pnl,
                            today_profit=today_profit,
                            open_positions=open_positions
                        )
                else:
                    active_trades = node_client.get_active_trades()
                    open_positions = len(active_trades)
                    
                    floating_pnl = sum(t.get('profitLoss', 0.0) for t in active_trades)
                    balance = 10020.52
                    equity = balance + floating_pnl
                    margin_free = 9800.00
                    margin_level = 750.0
                    today_profit = 45.20
                    
                    node_client.update_account_metrics(
                        balance=balance,
                        equity=equity,
                        margin_free=margin_free,
                        margin_level=margin_level,
                        floating_pnl=floating_pnl,
                        today_profit=today_profit,
                        open_positions=open_positions
                    )

            metrics = {
                "strategyName":       strategy_manager.get_strategy_name(),
                "connectedBroker":    broker_name,
                "connectedAccount":   account_number,
                "connectedServer":    server_name,
                "currentSymbol":      settings.get('symbol', 'XAUUSD'),
                "openPositionsCount": open_positions,
                "runningTime":        running_time,
            }

            # Send heartbeat, get settings response
            node_client.send_heartbeat(
                state=current_state,
                metrics=metrics,
                processed_command=processed_command
            )

            # Reset processed command once database is synced
            if received_command == 'NONE':
                processed_command = 'NONE'

            # 4. Engine Processing Execution (Skip strategy check if not RUNNING)
            if current_state != 'RUNNING':
                # PAUSED, MONITORING, OFFLINE, and ERROR modes still monitor active exits (SL/TP)
                if current_state in ['MONITORING', 'PAUSED']:
                    active_trades = node_client.get_active_trades()
                    close_events  = execution.monitor_active_trades(active_trades, settings)
                    _apply_close_events_to_daily_stats(close_events, state, 0)
                    if close_events:
                        save_state(state)
                continue

            # ── MT5 Connection Heartbeat ──────────────────────────────────────
            if not config.DRY_RUN:
                if not mt5_connector.check_connection():
                    logger.warning("[Engine] MT5 connection lost. Attempting reconnection...")
                    current_state = 'ERROR'
                    if not mt5_connector.initialize_mt5(settings):
                        logger.error("[Engine] Reconnection failed. Will retry next cycle.")
                        continue
                    current_state = 'RUNNING'
                    logger.info("[Engine] MT5 reconnected successfully. Resuming.")

            # ── Daily Stats Reset Check ───────────────────────────────────────
            if _reset_daily_stats_if_new_day(state):
                save_state(state)

            # ── Check for a New Completed M5 Candle ──────────────────────────
            symbol          = settings.get('symbol', 'XAUUSD')
            resolved_symbol = mt5_connector.resolve_symbol(symbol)

            if config.DRY_RUN:
                # DRY_RUN: Generate synthetic M5 candles for testing
                rates                 = _mock_rates_m5(symbol)
                current_m5_boundary   = int(time.time() // 300) * 300
                completed_candle_time = current_m5_boundary - 300   # Last completed M5
                spread_points         = 5
                symbol_digits         = 2
            else:
                # Live: Fetch 101 M5 candles from MT5 (index 0 = forming, index -2 = last confirmed)
                rates_array = mt5.copy_rates_from_pos(resolved_symbol, mt5.TIMEFRAME_M5, 0, 101)
                if rates_array is None or len(rates_array) < 3:
                    logger.error(f"[Engine] Failed to fetch M5 candles: {mt5.last_error()}")
                    continue

                rates = [
                    {
                        "time":   int(r[0]),
                        "open":   float(r[1]),
                        "high":   float(r[2]),
                        "low":    float(r[3]),
                        "close":  float(r[4]),
                        "volume": int(r[5]),
                    }
                    for r in rates_array
                ]

                # rates[-1] is forming, rates[-2] is the last confirmed M5 candle
                completed_candle_time = rates[-2]["time"]

                # Fetch spread and symbol precision for broker-independent filter
                sym_info      = mt5.symbol_info(resolved_symbol)
                tick_info     = mt5.symbol_info_tick(resolved_symbol)
                spread_points = getattr(tick_info, 'volume', 0) if tick_info else 0
                # Prefer spread from symbol_info for accuracy
                if sym_info:
                    spread_points = getattr(sym_info, 'spread', spread_points)
                    symbol_digits = getattr(sym_info, 'digits', 2)
                else:
                    symbol_digits = 2

            # ── Process New Completed M5 Candle ──────────────────────────────
            if completed_candle_time > state["last_processed_candle_time"]:
                logger.info(
                    f"[Engine] New M5 candle confirmed. "
                    f"Time: {completed_candle_time} | "
                    f"Candle count: {len(rates)}"
                )

                # Build market context for strategy (broker-independent)
                active_trades       = node_client.get_active_trades()
                active_trade_count  = len(active_trades)
                daily_stats         = state.get("daily_stats", {})

                demo_mode           = settings.get('demoMode', False) if settings else False

                market_context = {
                    "spread_points":      spread_points,
                    "symbol_digits":      symbol_digits,
                    "active_trade_count": active_trade_count,
                    "current_candle_time": completed_candle_time,
                    "demo_mode":           demo_mode,
                }

                # Call strategy through manager (engine has zero strategy logic)
                signal_data = strategy_manager.get_signal(rates, market_context, daily_stats)

                if signal_data:
                    # Attach strategy name for trade logging
                    settings_with_meta = dict(settings)
                    settings_with_meta["strategyName"] = strategy_manager.get_strategy_name()

                    trade_payload = execution.execute_order(signal_data, settings_with_meta)
                    if trade_payload:
                        node_client.create_trade(trade_payload)
                        state["last_processed_signal"] = signal_data.get("direction")

                        # Update daily count
                        daily_stats["trades_today"] = daily_stats.get("trades_today", 0) + 1
                        logger.info(
                            f"[Engine] Trade opened. "
                            f"Today's count: {daily_stats['trades_today']}/{state['daily_stats'].get('max_trades_per_day', 3)}"
                        )
                        state["daily_stats"] = daily_stats

                state["last_processed_candle_time"] = completed_candle_time
                save_state(state)

            # ── Monitor Active Positions (SL/TP Exits) ───────────────────────
            active_trades = node_client.get_active_trades()
            close_events  = execution.monitor_active_trades(active_trades, settings)

            # Update daily stats from close events (consecutive losses + cooldown)
            if close_events:
                _apply_close_events_to_daily_stats(close_events, state, completed_candle_time)
                save_state(state)

        except Exception as e:
            logger.error(f"[Engine] Unexpected error in control loop: {e}", exc_info=True)
            time.sleep(2)


# ─────────────────────────────────────────────────────────────────────────────
# DAILY STATS HELPER
# ─────────────────────────────────────────────────────────────────────────────

def _apply_close_events_to_daily_stats(close_events: list, state: dict, completed_candle_time: int):
    """
    Update daily_stats based on trade close events.
    Called whenever monitor_active_trades returns closed positions.

    Updates:
    - consecutive_losses: increments on loss, resets to 0 on win.
    - cooldown_until_candle_time: set to N candles after last close.
    """
    daily_stats      = state.setdefault("daily_stats", {})
    cooldown_candles = 2    # Matches STRATEGY_CONFIG["cooldown_candles"]
    timeframe_secs   = 300  # M5 = 300 seconds

    for event in close_events:
        pnl          = event.get("profitLoss", 0.0)
        close_reason = event.get("closeReason", "Unknown")

        if pnl < 0:
            # Loss: increment consecutive loss counter
            daily_stats["consecutive_losses"] = daily_stats.get("consecutive_losses", 0) + 1
            logger.info(
                f"[DailyStats] Trade closed via {close_reason} with LOSS (${pnl:.2f}). "
                f"Consecutive losses: {daily_stats['consecutive_losses']}"
            )
        else:
            # Win or breakeven: reset consecutive loss streak
            daily_stats["consecutive_losses"] = 0
            logger.info(
                f"[DailyStats] Trade closed via {close_reason} with PROFIT (${pnl:.2f}). "
                f"Consecutive loss streak reset."
            )

        # Apply cooldown: no new trades for N confirmed candles
        if completed_candle_time > 0:
            cooldown_target = completed_candle_time + (cooldown_candles * timeframe_secs)
            daily_stats["cooldown_until_candle_time"] = cooldown_target
            logger.info(
                f"[DailyStats] Cooldown set for {cooldown_candles} candle(s) "
                f"({cooldown_candles * timeframe_secs}s). "
                f"Next trade allowed after candle: {cooldown_target}"
            )

    state["daily_stats"] = daily_stats


# ─────────────────────────────────────────────────────────────────────────────
# DRY_RUN MOCK CANDLE GENERATOR (M5)
# ─────────────────────────────────────────────────────────────────────────────

def _mock_rates_m5(symbol: str) -> list:
    """
    Generate synthetic M5 candle data for DRY_RUN testing.
    Produces 101 candles so the strategy has the forming candle at index -1
    and the last confirmed candle at index -2.

    Seed is based on the current 5-minute boundary so the same candle is
    returned consistently within the same M5 window.
    """
    import random
    current_m5 = int(time.time() // 300) * 300
    rates      = []
    price      = 2320.0      # Realistic XAUUSD base price
    random.seed(current_m5)

    for i in range(101):
        t         = current_m5 - (100 - i) * 300   # 5-minute intervals
        change    = random.uniform(-2.5, 2.5)        # Realistic gold movement per 5 min
        open_val  = price
        close_val = round(price + change, 2)
        high_val  = round(max(open_val, close_val) + random.uniform(0.3, 1.5), 2)
        low_val   = round(min(open_val, close_val) - random.uniform(0.3, 1.5), 2)
        rates.append({
            "time":   t,
            "open":   open_val,
            "high":   high_val,
            "low":    low_val,
            "close":  close_val,
            "volume": random.randint(200, 1200),
        })
        price = close_val
    return rates


if __name__ == "__main__":
    run_engine()
