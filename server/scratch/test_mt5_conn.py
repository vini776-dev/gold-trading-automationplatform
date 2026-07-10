
import MetaTrader5 as mt5
import sys
import json

path = ""
login = int(12345678)
password = "mypassword"
server = "XMGlobal-MT5 2"

initialized = False
if path:
    initialized = mt5.initialize(path=path)
else:
    initialized = mt5.initialize()

if not initialized:
    err = mt5.last_error()
    print(json.dumps({"success": False, "error": f"Failed to initialize MT5 terminal: {err}"}))
    sys.exit(0)

logged_in = mt5.login(login=login, password=password, server=server)
if not logged_in:
    err = mt5.last_error()
    print(json.dumps({"success": False, "error": f"Failed to login to MT5: {err}"}))
    mt5.shutdown()
    sys.exit(0)

info = mt5.account_info()
if not info:
    err = mt5.last_error()
    print(json.dumps({"success": False, "error": f"Failed to get account info: {err}"}))
    mt5.shutdown()
    sys.exit(0)

result = {
    "success": True,
    "accountName": getattr(info, 'name', 'N/A'),
    "accountNumber": str(getattr(info, 'login', login)),
    "broker": getattr(info, 'company', 'XM'),
    "server": getattr(info, 'server', server),
    "balance": getattr(info, 'balance', 0.0),
    "equity": getattr(info, 'equity', 0.0),
    "marginFree": getattr(info, 'margin_free', 0.0),
    "leverage": f"1:{getattr(info, 'leverage', 1)}",
    "currency": getattr(info, 'currency', 'USD'),
    "accountType": "Demo" if getattr(info, 'trade_mode', 0) == mt5.ACCOUNT_TRADE_MODE_DEMO else "Real"
}
print(json.dumps(result))
mt5.shutdown()
      