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
    
    # Return default state
    return {
        "last_processed_candle_time": 0,
        "last_processed_signal": None,
        "engine_status": "stopped"
    }

def save_state(state):
    try:
        with open(STATE_FILE, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write state.json: {e}")

def run_engine():
    logger.info("Starting GTAP Python Trading Engine...")
    
    # 1. Load configuration and state
    state = load_state()
    state["engine_status"] = "running"
    save_state(state)

    # 2. Connect to MT5 (skip if Dry Run)
    if not config.DRY_RUN:
        if not mt5_connector.initialize_mt5():
            logger.critical("Failed to connect to MT5. Exiting...")
            state["engine_status"] = "failed"
            save_state(state)
            return
    else:
        logger.info("[DRY_RUN] MT5 connection initialization bypassed.")

    try:
        # 3. Synchronize Active Trades on Startup (Recovery Check)
        logger.info("Performing startup recovery and synchronization checks...")
        settings = node_client.get_settings()
        if settings:
            active_trades = node_client.get_active_trades()
            execution.monitor_active_trades(active_trades, settings)
        else:
            logger.error("Could not fetch settings. Recovery check bypassed.")

        # 4. Core Execution Loop
        logger.info("Core scheduling loop started. Awaiting completed candles...")
        
        while True:
            # Sleep 1 second to handle scheduling tick
            time.sleep(1)
            
            # Fetch latest settings periodically to monitor configurations
            settings = node_client.get_settings()
            if not settings:
                continue

            # Check if auto trading is toggled off
            if not settings.get('isAutoTrading', False):
                logger.info("Auto trading is disabled in settings. Skipping checks...")
                time.sleep(9) # Cooldown longer if auto trading is off
                continue

            # Heartbeat check
            if not config.DRY_RUN:
                if not mt5_connector.check_connection():
                    logger.warning("MT5 connection lost. Reconnecting...")
                    if not mt5_connector.initialize_mt5():
                        logger.error("Reconnection failed. Retrying next cycle.")
                        continue

            # Check for completed M1 Candle
            symbol = settings.get('symbol', 'XAUUSD')
            
            if config.DRY_RUN:
                # Mock candle completed for testing purposes if dry running
                # Generate a mock timestamp aligned to the minute
                current_minute = int(time.time() // 60) * 60
                rates = mock_rates(symbol)
                completed_candle_time = current_minute - 60
            else:
                # Fetch last completed candle from MT5 (index 1 is the last closed candle)
                rates_array = mt5.copy_rates_from_prev(symbol, mt5.TIMEFRAME_M1, 1, 100)
                if rates_array is None or len(rates_array) == 0:
                    logger.error(f"Failed to fetch rates from MT5: {mt5.last_error()}")
                    continue
                
                # Convert MT5 Rates to standard dictionaries
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

            # Verify if this completed candle has already been processed
            if completed_candle_time > state["last_processed_candle_time"]:
                logger.info(f"New completed candle detected. Time: {completed_candle_time}. Checking strategy signals...")
                
                # Evaluate strategy indicators
                signal = strategy.check_signals(rates)
                
                if signal:
                    # Place trade
                    trade_payload = execution.execute_order(signal, settings)
                    if trade_payload:
                        node_client.create_trade(trade_payload)
                        state["last_processed_signal"] = signal
                
                # Update persistent state
                state["last_processed_candle_time"] = completed_candle_time
                save_state(state)

            # Monitor active open positions (SL/TP tracking)
            active_trades = node_client.get_active_trades()
            execution.monitor_active_trades(active_trades, settings)

    except KeyboardInterrupt:
        logger.info("Engine termination signal received.")
    except Exception as e:
        logger.error(f"Unexpected error in core loop: {e}")
    finally:
        if not config.DRY_RUN:
            mt5_connector.disconnect_mt5()
        state["engine_status"] = "stopped"
        save_state(state)
        logger.info("GTAP Trading Engine shutdown complete.")

def mock_rates(symbol):
    # Generates standard mock candles for dry run
    current_time = int(time.time() // 60) * 60
    rates = []
    # Fill 100 candles
    for i in range(100):
        t = current_time - (100 - i) * 60
        rates.append({
            "time": t,
            "open": 2000.0 + i * 0.1,
            "high": 2001.0 + i * 0.1,
            "low": 1999.0 + i * 0.1,
            "close": 2000.5 + i * 0.1,
            "volume": 10
        })
    return rates

if __name__ == "__main__":
    run_engine()
