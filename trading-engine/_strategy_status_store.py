"""
_strategy_status_store.py
==========================
Shared in-memory store for real-time strategy filter status.
Updated by main.py on every M5 candle check.
Read by engine_api.py for the /strategy-status endpoint.
"""

import threading
import time

_lock   = threading.Lock()
_status = {
    "success":        False,
    "message":        "Waiting for first M5 candle...",
    "last_updated":   None,
    "engine_running": False,
}

def update(data: dict):
    """Called by main.py after every strategy evaluation."""
    global _status
    with _lock:
        _status = {
            "success":      True,
            "last_updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            **data
        }

def get_status() -> dict:
    """Called by engine_api.py to serve the /strategy-status endpoint."""
    with _lock:
        return dict(_status)
