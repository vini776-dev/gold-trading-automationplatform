# Gold Trading Automation Platform (GTAP)

GTAP is a professional gold trading automation platform designed to execute a scalping strategy on the XAUUSD (Gold) pair. It combines a Node.js/Express.js backend, a MongoDB database, a Python-based trading engine, and a web-based Vanilla JS dashboard using Socket.IO for real-time updates.

---

## 1. Project Directory Structure
```text
├── client/              # Frontend web application (Vanilla HTML/CSS/JS)
├── server/              # Node.js + Express backend server
└── trading-engine/      # Python + MetaTrader 5 trading loops
```

---

## 2. Quick Start Guide

### Prerequisites
* Node.js (v18+)
* Python (v3.10+)
* MetaTrader 5 Terminal (Windows environment only)

### Step 1: Clone and Configure Environment
1. Copy `server/.env.example` to `server/.env` and insert your credentials.
2. Copy `trading-engine/.env.example` to `trading-engine/.env` and insert your credentials.

### Step 2: Install Server Dependencies and Seed DB
1. Open a terminal, navigate to `/server`, and install requirements:
   ```bash
   cd server
   npm install
   ```
2. Seed the database with the default Admin user and Bot settings:
   ```bash
   npm run seed
   # Or run manually: node src/seed/seed.js
   ```

### Step 3: Start Server
Run the Express backend server:
```bash
npm start
# Or run manually: node src/server.js
```

### Step 4: Install Trading Engine Dependencies and Start
1. Open a new terminal, navigate to `/trading-engine`:
   ```bash
   cd trading-engine
   pip install -r requirements.txt
   ```
2. Start the trading loop:
   ```bash
   python main.py
   ```

### Step 5: Open Frontend Dashboard
Serve or open `client/index.html` directly in a browser (e.g. using VSCode Live Server or opening the file). Login using your seeded admin credentials (`admin@gtap.com` / `admin123`).

---

## 3. Core Modules Completed
* **Phase 1: DB Foundation**: Configuration logic, Mongoose schemas, and database seeder.
* **Phase 2: Authentication**: HTTP-only cookie-based JWT authorization and rate-limiting brute-force blockades.
* **Phase 3: Core REST APIs**: Endpoints for Trades, Dashboard stats, Logs, Reports, and Settings.
* **Phase 4: Python Engine**: M1 candle tracking signals calculations via `pandas-ta` and local state file persistence.
* **Phase 5: Real-time Updates**: Socket.IO events namespace room isolation, unique event IDs, and async Telegram notifications.
* **Phase 6: SPA Frontend**: Custom theme dashboard layouts and real-time state listeners.
