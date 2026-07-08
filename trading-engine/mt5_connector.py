import time
import MetaTrader5 as mt5
import config
from logger import logger

def initialize_mt5():
    logger.info("Initializing MetaTrader 5 connection...")
    
    # Initialize connection to MT5 terminal
    if not mt5.initialize():
        logger.critical(f"MT5 initialize failed, error code: {mt5.last_error()}")
        return False
        
    logger.info("MT5 initialized successfully. Logging in...")

    # Retry parameters
    max_retries = 5
    backoff = 5 # seconds

    for attempt in range(1, max_retries + 1):
        login_success = mt5.login(
            login=config.MT5_LOGIN,
            password=config.MT5_PASSWORD,
            server=config.MT5_SERVER
        )
        
        if login_success:
            logger.info("MT5 logged in successfully to account.")
            return True
            
        logger.warning(f"MT5 login attempt {attempt} failed, error code: {mt5.last_error()}")
        if attempt < max_retries:
            logger.info(f"Retrying login in {backoff} seconds...")
            time.sleep(backoff)
            backoff *= 2 # Exponential backoff

    logger.critical("MT5 login failed after maximum retries.")
    mt5.shutdown()
    return False

def disconnect_mt5():
    logger.info("Shutting down MT5 connection...")
    mt5.shutdown()

def check_connection():
    terminal_info = mt5.terminal_info()
    if terminal_info is None:
        logger.error(f"MT5 heartbeat check failed, error: {mt5.last_error()}")
        return False
    return True
