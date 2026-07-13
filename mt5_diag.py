import MetaTrader5 as mt5
import os
import sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

print(f"MT5 library version: {mt5.__version__}")
print(f"Python version: {sys.version}")
print()

DATA_DIR = r"C:\Users\vinit kushwaha\AppData\Roaming\MetaQuotes\Terminal\D0F8209F77C8CF37AD8BF550E51FF075"

paths_to_try = [
    ("Auto-detect", None),
    ("Data directory", DATA_DIR),
    ("Program Files", r"C:\Program Files\MetaTrader 5\terminal64.exe"),
    ("Program Files x86", r"C:\Program Files (x86)\MetaTrader 5\terminal64.exe"),
]

for label, p in paths_to_try:
    print(f"Trying [{label}]: {p or 'no path'}")
    try:
        result = mt5.initialize(path=p) if p else mt5.initialize()

        if result:
            print(f"  SUCCESS!")
            t = mt5.terminal_info()
            a = mt5.account_info()
            if t:
                print(f"  Terminal connected: {t.connected}")
                print(f"  Terminal path: {t.path}")
            if a:
                print(f"  Account: {a.login}")
                print(f"  Name: {a.name}")
                print(f"  Balance: {a.balance} {a.currency}")
                print(f"  Server: {a.server}")
            else:
                print(f"  No account info yet: {mt5.last_error()}")
            mt5.shutdown()
            break
        else:
            err = mt5.last_error()
            print(f"  FAILED: {err}")
    except Exception as ex:
        print(f"  EXCEPTION: {ex}")
    print()

print("Done.")
