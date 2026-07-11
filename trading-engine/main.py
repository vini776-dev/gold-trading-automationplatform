import os
import json
import time
import MetaTrader5 as mt5
import config
import mt5_connector
import node_client
import strategy
import execution
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
        "last_processed_signal": None
    }

def save_state(state):
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write state.json: {e}")

def run_engine():
    logger.info("Initializing GTAP Python Trading Engine...")
    
    # 1. Load configuration and state
    state = load_state()
    
    # 2. Get initial settings to restore previous session state (Session Recovery)
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
            
    running_since = time.time() if current_state in ['RUNNING', 'MONITORING'] else None
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
                            symbol_info = mt5.symbol_info(symbol)
                            if symbol_info is None:
                                validation_error = f"Symbol {symbol} not found on broker."
                            else:
                                if not symbol_info.visible:
                                    if not mt5.symbol_select(symbol, True):
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
                        orders = mt5.orders_get(symbol=symbol)
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
                    pos_array = mt5.positions_get(symbol=settings.get('symbol', 'XAUUSD'))
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
                "strategyName": "RSI-EMA Cross",
                "connectedBroker": broker_name,
                "connectedAccount": account_number,
                "connectedServer": server_name,
                "currentSymbol": settings.get('symbol', 'XAUUSD'),
                "openPositionsCount": open_positions,
                "runningTime": running_time
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
                    execution.monitor_active_trades(active_trades, settings)
                continue

            # Heartbeat connection verification
            if not config.DRY_RUN:
                if not mt5_connector.check_connection():
                    logger.warning("MT5 connection lost. Reconnecting...")
                    if not mt5_connector.initialize_mt5(settings):
                        logger.error("Reconnection failed. Retrying next cycle.")
                        continue

            # Check for completed M1 Candle
            symbol = settings.get('symbol', 'XAUUSD')
            if config.DRY_RUN:
                current_minute = int(time.time() // 60) * 60
                rates = mock_rates(symbol)
                completed_candle_time = current_minute - 60
            else:
                rates_array = mt5.copy_rates_from_prev(symbol, mt5.TIMEFRAME_M1, 1, 100)
                if rates_array is None or len(rates_array) == 0:
                    logger.error(f"Failed to fetch rates from MT5: {mt5.last_error()}")
                    continue
                
                rates = [
                    {
                        "time": int(rate[0]),
                        "open": float(rate[1]),
                        "high": float(rate[2]),
                        "low": float(rate[3]),
                        "close": float(rate[4]),
                        "volume": int(rate[5])
                    }
                    for rate in rates_array
                ]
                completed_candle_time = rates[-1]["time"]

            # Process completed candle
            if completed_candle_time > state["last_processed_candle_time"]:
                logger.info(f"New completed candle detected. Time: {completed_candle_time}. Checking strategy signals...")
                
                # Dynamic decoupled strategy execution
                signal = strategy.check_signals(rates)
                if signal:
                    trade_payload = execution.execute_order(signal, settings)
                    if trade_payload:
                        node_client.create_trade(trade_payload)
                        state["last_processed_signal"] = signal
                
                state["last_processed_candle_time"] = completed_candle_time
                save_state(state)

            # Monitor active positions
            active_trades = node_client.get_active_trades()
            execution.monitor_active_trades(active_trades, settings)

        except Exception as e:
            logger.error(f"Unexpected error in engine control loop: {e}")
            time.sleep(2)

def mock_rates(symbol):
    import random
    current_time = int(time.time() // 60) * 60
    rates = []
    price = 2000.0
    random.seed(current_time)
    for i in range(100):
        t = current_time - (100 - i) * 60
        change = random.uniform(-1.0, 1.0)
        open_val = price
        close_val = price + change
        high_val = max(open_val, close_val) + random.uniform(0.1, 0.5)
        low_val = min(open_val, close_val) - random.uniform(0.1, 0.5)
        rates.append({
            "time": t,
            "open": open_val,
            "high": high_val,
            "low": low_val,
            "close": close_val,
            "volume": 10
        })
        price = close_val
    return rates

if __name__ == "__main__":
    run_engine()
