# GTAP - Gold Trading Automation Platform Setup Guide

This guide explains how to set up and run the Gold Trading Automation Platform on another computer for testing.

---

## Prerequisites
Before starting, ensure the following are installed:
1. **Node.js** (v16 or higher)
2. **Python** (v3.8 to v3.13)
3. **MetaTrader 5** (Terminal logged into a broker account, e.g., XM or Exness)
4. **MongoDB** (Cloud Atlas URI or local installation)

---

## Project Structure
Send your friend the zipped project containing:
- `server/` - Node.js backend
- `client/` - Frontend dashboard files
- `trading-engine/` - Python strategy engine
- `GTAP_DataBridge.mq5` - MQL5 bridge script
- `SETUP_GUIDE.md` - This instruction file

---

## Step-by-Step Installation

### Step 1: Install Dependencies
Open your terminal (CMD / PowerShell) and run:

1. **Backend (Node.js):**
   ```bash
   cd server
   npm install
   ```

2. **Python Engine:**
   ```bash
   cd ../trading-engine
   pip install -r requirements.txt
   ```

---

### Step 2: Configure Environment Variables
Ensure the following files are present and configured:

1. **In `server/.env`:**
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   CLIENT_URL=http://localhost:5500
   INTERNAL_API_KEY=your_internal_api_key
   ```

2. **In `trading-engine/.env`:**
   ```env
   NODE_API_URL=http://localhost:5000/api/v1
   INTERNAL_API_KEY=your_internal_api_key
   DRY_RUN=False
   ```

---

### Step 3: Setup the MetaTrader 5 EA (Bridge)
To allow the bot to read prices and trade:

1. Copy **`GTAP_DataBridge.mq5`** into the MT5 Experts folder:
   - In MT5, click **File -> Open Data Folder**.
   - Navigate to **`MQL5 -> Experts`**.
   - Paste the `GTAP_DataBridge.mq5` file here.
2. In MT5, press **F4** to open MetaEditor.
3. Open `GTAP_DataBridge.mq5` inside MetaEditor and press **F5** (Compile).
4. In MT5, go to the **Navigator** panel, right-click **Expert Advisors** -> **Refresh**.
5. Drag **`GTAP_DataBridge`** onto any active chart (e.g., USDJPY).
6. Enable **Algo Trading** (Make the button green 🟢 in the top toolbar).

---

### Step 4: Run the Platform
Run the components in separate terminal windows:

1. **Start Node.js Backend:**
   ```bash
   cd server
   node src/server.js
   ```

2. **Start Python Engine:**
   ```bash
   cd trading-engine
   python main.py
   ```

3. **Open Frontend:**
   - Run a local web server (like VS Code Live Server) on the `client/` folder, or open `client/index.html` directly in the browser (usually hosted at `http://127.0.0.1:5500/client/index.html`).

4. Open the dashboard, click **Test Connection** in Settings, and click **Start**!
