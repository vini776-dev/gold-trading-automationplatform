const settingService = require('../services/settingService');
const { emitUserEvent } = require('../config/socket');
const path = require('path');
const fs = require('fs');

const handleGetSettings = async (req, res) => {
  try {
    const isInternal = req.headers['x-internal-api-key'] === process.env.INTERNAL_API_KEY;
    const settings = await settingService.getSettings(req.user._id, isInternal);
    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'ERROR',
      code: 'SERVER_ERROR',
      message: error.message,
    });
  }
};

const handleUpdateSettings = async (req, res) => {
  try {
    const settings = await settingService.updateSettings(req.user._id, req.body);

    // Emit Socket.IO event to frontend
    emitUserEvent(req.user._id, 'settings_updated', settings);

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      code: 'SETTINGS_UPDATE_FAILED',
      message: error.message,
    });
  }
};

const handleDetectServers = async (req, res) => {
  try {
    const { broker } = req.body;
    if (!broker) {
      return res.status(400).json({ success: false, message: 'Broker name is required' });
    }

    const registry = {
      'xm': ['XMGlobal-MT5', 'XMGlobal-MT5 2', 'XMGlobal-MT5 3', 'XMGlobal-MT5 4', 'XMGlobal-MT5 5', 'XMGlobal-MT5 6', 'XMGlobal-Real 1'],
      'exness': ['Exness-MT5Trial', 'Exness-MT5Real'],
      'ic markets': ['ICMarketsSC-Demo', 'ICMarketsSC-Live'],
      'icmarkets': ['ICMarketsSC-Demo', 'ICMarketsSC-Live']
    };

    const key = broker.toLowerCase().trim();
    let servers = registry[key] ? [...registry[key]] : [];

    const appDataPath = process.env.APPDATA;
    if (appDataPath) {
      const terminalRoot = path.join(appDataPath, 'MetaQuotes', 'Terminal');
      if (fs.existsSync(terminalRoot)) {
        try {
          const terminalDirs = fs.readdirSync(terminalRoot);
          for (const dir of terminalDirs) {
            const configPath = path.join(terminalRoot, dir, 'config');
            if (fs.existsSync(configPath)) {
              const files = fs.readdirSync(configPath);
              const srvFiles = files.filter(f => f.endsWith('.srv'));
              for (const f of srvFiles) {
                const serverName = path.basename(f, '.srv');
                servers.push(serverName);
              }
            }
          }
        } catch (e) {}
      }
    }

    const uniqueMap = {};
    const filteredServers = [];
    const matchRegex = new RegExp(key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');

    for (const s of servers) {
      const lower = s.toLowerCase();
      if (!uniqueMap[lower]) {
        uniqueMap[lower] = true;
        if (matchRegex.test(lower)) {
          filteredServers.push(s);
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: filteredServers
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleDetectTerminals = async (req, res) => {
  try {
    const searchPaths = [
      'C:\\Program Files',
      'C:\\Program Files (x86)'
    ];
    const detected = [];

    for (const rootPath of searchPaths) {
      if (fs.existsSync(rootPath)) {
        try {
          const dirs = fs.readdirSync(rootPath);
          for (const dir of dirs) {
            const fullDir = path.join(rootPath, dir);
            try {
              const stat = fs.statSync(fullDir);
              if (stat.isDirectory()) {
                const exePath = path.join(fullDir, 'terminal64.exe');
                if (fs.existsSync(exePath)) {
                  detected.push({
                    name: dir,
                    path: exePath
                  });
                }
              }
            } catch (e) {}
          }
        } catch (e) {}
      }
    }

    return res.status(200).json({
      success: true,
      data: detected
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleTestConnection = async (req, res) => {
  try {
    const { broker, accountNumber, mt5Password, server, terminalPath } = req.body;

    if (!broker || !accountNumber || !mt5Password || !server) {
      return res.status(400).json({
        success: false,
        message: 'All connection fields (broker, accountNumber, mt5Password, server) are required'
      });
    }

    const DRY_RUN = process.env.DRY_RUN === 'True' || process.env.DRY_RUN === 'true';

    let testResult;
    let errorMsg = null;

    if (DRY_RUN) {
      if (mt5Password === 'fail') {
        testResult = {
          success: false,
          error: 'MT5_CONNECTION_FAILED: Invalid account credentials or password'
        };
        errorMsg = 'MT5_CONNECTION_FAILED: Invalid account credentials or password';
      } else {
        testResult = {
          success: true,
          accountName: 'Vinit Kushwaha (Mock)',
          accountNumber,
          broker,
          server,
          balance: 10020.52,
          equity: 10020.52,
          marginFree: 10020.52,
          leverage: '1:500',
          currency: 'USD',
          accountType: 'Demo'
        };
      }
    } else {
      const { execSync } = require('child_process');
      const tempScriptPath = path.join(__dirname, '../../scratch/test_mt5_conn.py');
      const scratchDir = path.dirname(tempScriptPath);
      if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

      fs.writeFileSync(tempScriptPath, `
import MetaTrader5 as mt5
import sys
import json

path = "${terminalPath ? terminalPath.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\"') : ''}"
login = int(${accountNumber})
password = "${mt5Password.replace(/"/g, '\\"')}"
server = "${server.replace(/"/g, '\\"')}"

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
    "broker": getattr(info, 'company', '${broker}'),
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
      `);

      try {
        const output = execSync(`python "${tempScriptPath}"`, { encoding: 'utf8', timeout: 15000 });
        const parsed = JSON.parse(output.trim());
        if (parsed.success) {
          testResult = parsed;
        } else {
          testResult = { success: false, error: parsed.error };
          errorMsg = parsed.error;
        }
      } catch (err) {
        testResult = { success: false, error: `Process error testing connection: ${err.message}` };
        errorMsg = err.message;
      }
    }

    const MT5Account = require('../models/MT5Account');
    const BotSetting = require('../models/BotSetting');

    let account = await MT5Account.findOne({ userId: req.user._id, isDefault: true });
    if (!account) {
      account = new MT5Account({ userId: req.user._id, isDefault: true });
    }

    account.broker = broker;
    account.accountNumber = accountNumber;
    account.server = server;
    account.terminalPath = terminalPath;
    account.connectionStatus = testResult.success ? 'SUCCESS' : 'FAILED';
    account.lastConnectionTest = new Date();
    account.lastConnectionError = errorMsg;

    if (mt5Password !== '******') {
      const { encrypt } = require('../utils/crypto');
      account.mt5Password = encrypt(mt5Password);
    }

    await account.save();

    // Link account to settings on test (so state is preserved if page reloads before full save)
    let settings = await BotSetting.findOne({ userId: req.user._id });
    if (!settings) {
      settings = new BotSetting({ userId: req.user._id });
    }
    settings.activeAccountId = account._id;
    await settings.save();

    return res.status(200).json({
      success: true,
      data: testResult
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'ERROR',
      code: 'CONNECTION_TEST_FAILED',
      message: error.message
    });
  }
};

module.exports = {
  handleGetSettings,
  handleUpdateSettings,
  handleDetectServers,
  handleDetectTerminals,
  handleTestConnection
};
