"""
mt5_file_reader.py — Reads MT5 account data from the JSON file
written by the GTAP_DataBridge.mq5 Expert Advisor.

This is the fallback when mt5.initialize() IPC fails due to
Python library / terminal build version mismatch.
"""

import json
import os
import time

# MT5 writes to its "Common Files" directory when FILE_COMMON flag is used
COMMON_FILES_DIR = os.path.join(
    os.environ.get('APPDATA', ''),
    'MetaQuotes', 'Terminal', 'Common', 'Files'
)
DATA_FILE = os.path.join(COMMON_FILES_DIR, 'gtap_account_data.json')

MAX_AGE_SECONDS = 10  # If file is older than 10s, MT5 EA may have stopped


def read_account_data():
    """
    Read account data from the JSON file written by GTAP_DataBridge EA.
    Returns a dict on success, or None with an error message on failure.
    """
    if not os.path.exists(DATA_FILE):
        return None, (
            f"Account data file not found at:\n{DATA_FILE}\n\n"
            "Please install and run the GTAP_DataBridge Expert Advisor in MetaTrader 5."
        )

    # Check file age
    age = time.time() - os.path.getmtime(DATA_FILE)
    if age > MAX_AGE_SECONDS:
        return None, (
            f"Account data file is stale ({int(age)}s old). "
            "Make sure the GTAP_DataBridge EA is attached to a chart in MetaTrader 5."
        )

    try:
        with open(DATA_FILE, 'r', encoding='utf-8', errors='replace') as f:
            data = json.load(f)
        return data, None
    except json.JSONDecodeError as e:
        return None, f"Failed to parse account data file: {e}"
    except Exception as e:
        return None, f"Error reading account data: {e}"


def get_data_file_path():
    return DATA_FILE


def is_ea_running():
    """Quick check if the EA is writing fresh data."""
    data, err = read_account_data()
    return data is not None
