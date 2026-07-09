# GTAP Testing Plan & Results (TESTING.md)

This document details the test suites, edge cases, negative scenarios, and verification results for the Gold Trading Automation Platform (GTAP).

---

## 1. Backend API Test Cases

### positive Test Cases
| ID | API Endpoint | Description | Payload | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| API-01 | `POST /auth/login` | Valid trader login | Valid credentials | `200 OK`, cookie set, returns user info |
| API-02 | `GET /auth/verify` | Active session verification | Cookie present | `200 OK`, returns user info |
| API-03 | `GET /settings` | Fetch current engine rules | Cookie/API key present | `200 OK`, settings JSON |
| API-04 | `POST /trades` | Register a new position | Valid trade JSON | `21 Created` or `20 OK`, trade details |

### Negative & Edge-Case Test Cases
* **API-05: Missing Required Fields on Login (`POST /auth/login`)**
  * *Payload:* `{ "email": "" }`
  * *Expected Result:* `400 Bad Request`, code `AUTH_INVALID_CREDENTIALS` or validation error message.
* **API-06: Brute-Force Rate Limiter Check (`POST /auth/login`)**
  * *Steps:* Send 5 incorrect password attempts sequentially.
  * *Expected Result:* The 5th request returns `423 Locked` (or `401 Unauthorized` with `AUTH_ACCOUNT_LOCKED` code), blocking further attempts for 60 seconds.
* **API-07: Unauthenticated Route Access (`GET /settings`)**
  * *Headers/Cookies:* None.
  * *Expected Result:* `401 Unauthorized`, code `AUTH_UNAUTHORIZED`.
* **API-08: Invalid Symbol Trade Block (`POST /trades`)**
  * *Payload:* Trade JSON with `"symbol": "BTCUSD"`.
  * *Expected Result:* `400 Bad Request`, error code `TRADE_CREATION_FAILED`, message: "Only XAUUSD trading is supported".
* **API-09: Trade Creation Idempotency Check (`POST /trades`)**
  * *Steps:* Send `POST /trades` with ticket `9999` twice.
  * *Expected Result:* First request returns `21 Created`. Second request returns `20 OK` with the exact same record, avoiding duplicate entries.

---

## 2. Python Engine Test Cases
* **ENG-01: Heartbeat Connectivity Test**
  * *Steps:* Python engine running, MT5 connection lost.
  * *Expected Result:* Engine logs connection failure and attempts reconnection using exponential backoff.
* **ENG-02: Zero-Lot Guard**
  * *Steps:* Force configuration `lotSize = 0.0`.
  * *Expected Result:* Engine rejects order generation, logs validation failure, and does not send orders to MT5.
* **ENG-03: Signal Completed Candle Constraint**
  * *Steps:* Tick variations occur mid-minute.
  * *Expected Result:* Indicators are re-calculated but trade signals are evaluated strictly on Candle 0 close.

---

## 4. Socket.IO Test Cases
* **SOC-01: Unauthorized Socket Block**
  * *Steps:* Join namespace `/trader` with an invalid/missing cookie.
  * *Expected Result:* Handshake middleware rejects connection.
* **SOC-02: Namespace Room Containment**
  * *Steps:* Client connects with Trader ID A.
  * *Expected Result:* Socket joins room `user_A`. Verify it does not receive events emitted to `user_B`.
* **SOC-03: Heartbeat Status Broadcast**
  * *Steps:* Node server running, Python engine stops.
  * *Expected Result:* Within 15 seconds, the server broadcasts `engine_status` showing `"OFFLINE"`.

---

## 5. Telegram Notification Test Cases
* **TEL-01: Async Non-Blocking Send**
  * *Steps:* Trigger a trade open event when Telegram API is slow or blocked.
  * *Expected Result:* Node.js updates DB immediately and responds to Python. Telegram notification is pushed to background queue.
* **TEL-02: Retries Exhaustion**
  * *Steps:* Force invalid `TELEGRAM_BOT_TOKEN`.
  * *Expected Result:* Node.js retries sending 3 times, waiting 5 seconds between attempts, and then logs the failure without crashing.

---

## 6. Recovery & Restart Scenarios
* **REC-01: Mid-Trade Reboot Recovery**
  * *Steps:* Force-kill Python engine while a trade is open. Restart engine.
  * *Expected Result:* Python reads `state.json` and active trades from Node.js, queries MT5, and continues tracking the active position.
* **REC-02: Missing Trade Recovery**
  * *Steps:* Force-kill Python engine. Manually close the open trade on MT5. Restart Python engine.
  * *Expected Result:* Engine notices the trade is closed, retrieves details from MT5 history, and calls the Node.js API to close it in MongoDB.
