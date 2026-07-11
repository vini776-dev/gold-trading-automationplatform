import requests
import config
from logger import logger

# Base HTTP headers with internal API key
HEADERS = {
    "Content-Type": "application/json",
    "X-INTERNAL-API-KEY": config.INTERNAL_API_KEY
}

def get_settings():
    url = f"{config.NODE_API_URL}/settings"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            return response.json().get('data')
        logger.error(f"Failed to fetch settings from Node: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error calling GET /settings: {e}")
    return None

def get_active_trades():
    url = f"{config.NODE_API_URL}/trades/active"
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            return response.json().get('data', [])
        logger.error(f"Failed to fetch active trades from Node: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error calling GET /trades/active: {e}")
    return []

def create_trade(trade_data):
    url = f"{config.NODE_API_URL}/trades"
    try:
        response = requests.post(url, headers=HEADERS, json=trade_data, timeout=10)
        if response.status_code in [200, 201]:
            return response.json().get('data')
        logger.error(f"Failed to create trade on Node: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error calling POST /trades: {e}")
    return None

def close_trade(trade_db_id, close_data):
    url = f"{config.NODE_API_URL}/trades/{trade_db_id}/close"
    try:
        response = requests.put(url, headers=HEADERS, json=close_data, timeout=10)
        if response.status_code == 200:
            return response.json().get('data')
        logger.error(f"Failed to close trade on Node: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error calling PUT /trades/:id/close: {e}")
    return None

def update_account_metrics(balance, equity, margin_free):
    url = f"{config.NODE_API_URL}/settings/account-metrics"
    try:
        payload = {
            "balance": balance,
            "equity": equity,
            "marginFree": margin_free
        }
        response = requests.post(url, headers=HEADERS, json=payload, timeout=10)
        if response.status_code == 200:
            return response.json().get('data')
        logger.error(f"Failed to update account metrics on Node: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error calling POST /settings/account-metrics: {e}")
    return None
