import time
import MetaTrader5 as mt5
import config
from logger import logger

import crypto_utils

def initialize_mt5(settings=None):
    logger.info("Initializing MetaTrader 5 connection...")
    
    # 1. Resolve credentials (DB settings takes priority over local .env)
    login_val = config.MT5_LOGIN
    password_val = config.MT5_PASSWORD
    server_val = config.MT5_SERVER
    terminal_path = None

    if settings:
        db_login = settings.get('accountNumber')
        db_password_enc = settings.get('mt5Password')
        db_server = settings.get('server')
        db_path = settings.get('terminalPath')

        if db_login:
            try:
                login_val = int(db_login)
            except ValueError:
                logger.error(f"Invalid account number from DB: {db_login}")
        if db_password_enc:
            password_val = crypto_utils.decrypt(db_password_enc)
        if db_server:
            server_val = db_server
        if db_path:
            terminal_path = db_path

    # Validate that we have login credentials
    if not login_val or not password_val or not server_val:
        logger.critical("Failed to resolve MT5 credentials. Missing login, password or server configuration.")
        return False

    # 2. Initialize connection to MT5 terminal
    logger.info("Connecting to MT5 terminal...")
    initialized = mt5.initialize() # Try connecting to already running terminal first
    
    if not initialized and terminal_path:
        logger.info(f"Connecting to default MT5 terminal failed. Attempting to launch terminal at custom path: {terminal_path}")
        try:
            initialized = mt5.initialize(path=terminal_path)
        except Exception as e:
            logger.warning(f"Failed to launch MT5 at custom path: {e}")
            initialized = False

    if not initialized:
        logger.critical(f"MT5 initialize failed, error code: {mt5.last_error()}")
        return False
        
    logger.info("MT5 initialized successfully. Logging in...")

    # Retry parameters
    max_retries = 5
    backoff = 5 # seconds

    for attempt in range(1, max_retries + 1):
        login_success = mt5.login(
            login=login_val,
            password=password_val,
            server=server_val
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
