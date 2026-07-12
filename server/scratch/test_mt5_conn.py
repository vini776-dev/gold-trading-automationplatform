
import MetaTrader5 as mt5
import sys
import json
import datetime

path = ""
login = int(1301512757)
password = "Suraj9554@"
server = "XMGlobal-MT5 6"

initialized = False
if path:
    try:
        initialized = mt5.initialize(path=path)
    except Exception:
        initialized = False

if not initialized:
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

# Get positions for floating PnL and count
pos_array = mt5.positions_get()
open_positions = len(pos_array) if pos_array else 0
floating_pnl = getattr(info, 'profit', 0.0)

# Calculate Today's Profit
now = datetime.datetime.now()
today_start = datetime.datetime(now.year, now.month, now.day, 0, 0, 0)
history_deals = mt5.history_deals_get(today_start, now)
today_profit = sum(deal.profit for deal in history_deals) if history_deals else 0.0
today_profit += sum(deal.swap + deal.commission for deal in history_deals) if history_deals else 0.0

result = {
    "success": True,
    "accountName": getattr(info, 'name', 'N/A'),
    "accountNumber": str(getattr(info, 'login', login)),
    "broker": getattr(info, 'company', 'XM'),
    "server": getattr(info, 'server', server),
    "balance": getattr(info, 'balance', 0.0),
    "equity": getattr(info, 'equity', 0.0),
    "marginFree": getattr(info, 'margin_free', 0.0),
    "marginLevel": getattr(info, 'margin_level', 0.0),
    "floatingPnL": floating_pnl,
    "todayProfit": today_profit,
    "openPositions": open_positions,
    "leverage": f"1:{getattr(info, 'leverage', 1)}",
    "currency": getattr(info, 'currency', 'USD'),
    "accountType": "Demo" if getattr(info, 'trade_mode', 0) == mt5.ACCOUNT_TRADE_MODE_DEMO else "Real"
}
print(json.dumps(result))
mt5.shutdown()
      