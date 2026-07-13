"""
engine_api.py — Lightweight HTTP API server for the GTAP Trading Engine.

Runs in a background thread alongside the main engine loop.
Exposes internal endpoints that the Node.js backend calls directly,
avoiding subprocess spawning entirely (which causes ETIMEDOUT on Windows).
"""

import json
import datetime
import threading
import queue
from http.server import BaseHTTPRequestHandler, HTTPServer
import MetaTrader5 as mt5
import crypto_utils
from logger import logger

ENGINE_API_PORT = 5001
_mt5_lock = threading.Lock()  # Prevent concurrent MT5 access


class EngineAPIHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Suppress default HTTP server logs (use our logger instead)
        pass

    def send_json(self, code, data):
        body = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path == '/test-connection':
            self._handle_test_connection()
        else:
            self.send_json(404, {'success': False, 'error': 'Not found'})

    def do_GET(self):
        if self.path == '/health':
            self.send_json(200, {'success': True, 'status': 'engine_api_running'})
        else:
            self.send_json(404, {'success': False, 'error': 'Not found'})

    def _handle_test_connection(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            payload = json.loads(body.decode('utf-8'))
        except Exception as e:
            self.send_json(400, {'success': False, 'error': f'Invalid request body: {e}'})
            return

        account_number = payload.get('accountNumber')
        password_raw = payload.get('mt5Password')
        server = payload.get('server')
        terminal_path = payload.get('terminalPath', '')
        broker = payload.get('broker', '')

        if not account_number or not password_raw or not server:
            self.send_json(400, {'success': False, 'error': 'accountNumber, mt5Password, and server are required'})
            return

        try:
            login = int(account_number)
        except ValueError:
            self.send_json(400, {'success': False, 'error': f'Invalid account number: {account_number}'})
            return

        # --- PRIMARY METHOD: Read from GTAP_DataBridge EA file (no IPC needed) ---
        import mt5_file_reader
        data, file_err = mt5_file_reader.read_account_data()

        if data:
            # Validate account number matches
            file_login = int(data.get('accountNumber', 0))
            if file_login != login:
                self.send_json(200, {
                    'success': False,
                    'error': (
                        f"Account mismatch: MT5 terminal is logged in as {file_login}, "
                        f"but you entered {login}. Please check your account number."
                    )
                })
                return

            trade_mode = data.get('tradeMode', 0)
            result = {
                'success': True,
                'accountName': data.get('name', 'N/A'),
                'accountNumber': str(data.get('accountNumber', login)),
                'broker': data.get('company', broker),
                'server': data.get('server', server),
                'balance': data.get('balance', 0.0),
                'equity': data.get('equity', 0.0),
                'marginFree': data.get('marginFree', 0.0),
                'marginLevel': data.get('marginLevel', 0.0),
                'floatingPnL': data.get('floatingPnL', 0.0),
                'todayProfit': 0.0,  # Calculated separately
                'openPositions': data.get('openPositions', 0),
                'leverage': f"1:{data.get('leverage', 1)}",
                'currency': data.get('currency', 'USD'),
                'accountType': 'Demo' if trade_mode == 0 else 'Real'
            }
            logger.info(f"Test connection via EA file bridge: account {login} on {server}")
            self.send_json(200, result)
            return

        # --- FALLBACK: Try MT5 IPC (works only if library matches terminal build) ---
        logger.warning(f"EA file not available ({file_err}). Trying MT5 IPC fallback...")
        with _mt5_lock:
            result = _do_mt5_test(login, password_raw, server, terminal_path, broker)

        if not result.get('success') and file_err:
            # Both methods failed — give user a clear, actionable message
            result = {
                'success': False,
                'error': (
                    "Cannot connect to MT5. Please install the GTAP DataBridge EA in MetaTrader 5:\n"
                    "1. Open MetaTrader 5\n"
                    "2. Press F4 to open MetaEditor\n"
                    "3. Open the file: C:\\Projects_by_me\\gold-trading-automationplatform\\GTAP_DataBridge.mq5\n"
                    "4. Press F5 to compile\n"
                    "5. In MT5, drag 'GTAP_DataBridge' from Navigator onto any chart\n"
                    "6. Click Test Connection again"
                )
            }

        self.send_json(200, result)



def _do_mt5_test(login, password, server, terminal_path, broker):
    """
    Perform the actual MT5 test connection.
    mt5.initialize() can hang on Windows — we run it in a thread with a hard timeout.
    """
    result_queue = queue.Queue()

    def worker():
        try:
            # Step 1: Initialize — connect to already-running terminal (no path = no launch)
            initialized = mt5.initialize()
            if not initialized and terminal_path:
                try:
                    initialized = mt5.initialize(path=terminal_path)
                except Exception:
                    initialized = False

            if not initialized:
                err = mt5.last_error()
                if err and err[0] in (-10003, -10006, -10004):
                    msg = "MT5 terminal is not open. Please launch MetaTrader 5 first, then try again."
                else:
                    msg = f"Failed to initialize MT5 terminal: {err}"
                result_queue.put({'success': False, 'error': msg})
                return

            # Step 2: Login
            logged_in = mt5.login(login=login, password=password, server=server)
            if not logged_in:
                err = mt5.last_error()
                result_queue.put({'success': False, 'error': f'Login failed: {err}'})
                return

            # Step 3: Account info
            info = mt5.account_info()
            if not info:
                err = mt5.last_error()
                result_queue.put({'success': False, 'error': f'Could not get account info: {err}'})
                return

            # Step 4: Positions & PnL
            pos_array = mt5.positions_get()
            open_positions = len(pos_array) if pos_array else 0
            floating_pnl = getattr(info, 'profit', 0.0)

            now = datetime.datetime.now()
            today_start = datetime.datetime(now.year, now.month, now.day, 0, 0, 0)
            history_deals = mt5.history_deals_get(today_start, now)
            today_profit = 0.0
            if history_deals:
                today_profit = sum(d.profit + d.swap + d.commission for d in history_deals)

            result_queue.put({
                'success': True,
                'accountName': getattr(info, 'name', 'N/A'),
                'accountNumber': str(getattr(info, 'login', login)),
                'broker': getattr(info, 'company', broker),
                'server': getattr(info, 'server', server),
                'balance': getattr(info, 'balance', 0.0),
                'equity': getattr(info, 'equity', 0.0),
                'marginFree': getattr(info, 'margin_free', 0.0),
                'marginLevel': getattr(info, 'margin_level', 0.0),
                'floatingPnL': floating_pnl,
                'todayProfit': today_profit,
                'openPositions': open_positions,
                'leverage': f"1:{getattr(info, 'leverage', 1)}",
                'currency': getattr(info, 'currency', 'USD'),
                'accountType': 'Demo' if getattr(info, 'trade_mode', 0) == mt5.ACCOUNT_TRADE_MODE_DEMO else 'Real'
            })
            logger.info(f"Test connection successful for account {login} on {server}")

        except Exception as ex:
            logger.error(f"MT5 test connection worker error: {ex}")
            result_queue.put({'success': False, 'error': f'Unexpected error: {ex}'})

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    t.join(timeout=45)  # Wait up to 45 seconds for mt5.initialize() to respond

    if t.is_alive():
        # Thread is still blocked on mt5.initialize() — it's hanging
        logger.error("mt5.initialize() timed out after 45 seconds")
        return {
            'success': False,
            'error': 'MT5 initialization timed out. Make sure MetaTrader 5 terminal is fully logged in and ready, then try again.'
        }

    try:
        return result_queue.get_nowait()
    except queue.Empty:
        return {'success': False, 'error': 'No response from MT5 worker thread.'}


def start_engine_api():
    """Start the Engine API HTTP server in a daemon thread."""
    server = HTTPServer(('127.0.0.1', ENGINE_API_PORT), EngineAPIHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    logger.info(f"Engine API server started on port {ENGINE_API_PORT}")
    return server
