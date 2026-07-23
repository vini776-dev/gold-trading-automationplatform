const BotSetting = require('../models/BotSetting');
const MT5Account = require('../models/MT5Account');
const { emitUserEvent } = require('../config/socket');

const handleStartEngine = async (req, res) => {
  try {
    const settings = await BotSetting.findOne({ userId: req.user._id });
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    if (!settings.activeAccountId) {
      return res.status(400).json({ success: false, message: 'No MT5 account linked. Please configure settings first.' });
    }

    const account = await MT5Account.findById(settings.activeAccountId);
    if (!account) {
      return res.status(400).json({ success: false, message: 'MT5 account not found. Please re-configure.' });
    }

    if (account.connectionStatus !== 'SUCCESS') {
      return res.status(400).json({ success: false, message: 'MT5 Connection is not verified. Please run Test Connection.' });
    }

    // Refuse start if auto trading is turned off in settings (safety rule 3)
    if (!settings.isAutoTrading) {
      return res.status(400).json({ success: false, message: 'Automated Trading is disabled. Please enable it in Settings.' });
    }

    // Check if another engine instance is already running (safety rule 3)
    const isAlreadyRunning = settings.lastHeartbeat && 
      (Date.now() - settings.lastHeartbeat.getTime() < 12000) && 
      settings.engineState !== 'OFFLINE' && 
      settings.engineState !== 'ERROR' &&
      settings.engineState !== 'PAUSED';
    if (isAlreadyRunning) {
      return res.status(400).json({ success: false, message: 'Another engine instance is already active and running.' });
    }

    // Update command and state
    settings.engineCommand = 'START';
    settings.engineState = 'STARTING';
    settings.emergencyStopActive = false; // Reset emergency stop on explicit start
    await settings.save();

    // Log the event
    console.log(`[Engine Control] Engine Start command issued for user ${req.user._id} at ${new Date().toISOString()}`);

    // Emit Socket.IO state update
    emitUserEvent(req.user._id, 'engine_status', {
      status: 'ONLINE',
      engineState: settings.engineState,
      engineCommand: settings.engineCommand,
      emergencyStopActive: settings.emergencyStopActive,
      lastHeartbeat: settings.lastHeartbeat,
      metrics: settings.engineMetrics
    });

    return res.status(200).json({
      success: true,
      message: 'Engine start command sent successfully',
      data: settings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handlePauseEngine = async (req, res) => {
  try {
    const settings = await BotSetting.findOne({ userId: req.user._id });
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    settings.engineCommand = 'PAUSE';
    settings.engineState = 'PAUSED';
    await settings.save();

    console.log(`[Engine Control] Engine Pause command issued for user ${req.user._id}`);
    emitUserEvent(req.user._id, 'engine_status', {
      status: 'ONLINE',
      engineState: settings.engineState,
      engineCommand: settings.engineCommand,
      emergencyStopActive: settings.emergencyStopActive,
      lastHeartbeat: settings.lastHeartbeat,
      metrics: settings.engineMetrics
    });

    return res.status(200).json({
      success: true,
      message: 'Engine pause command sent successfully',
      data: settings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleStopEngine = async (req, res) => {
  try {
    const settings = await BotSetting.findOne({ userId: req.user._id });
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    settings.engineCommand = 'STOP';
    settings.engineState = 'STOPPING';
    await settings.save();

    console.log(`[Engine Control] Engine Stop command issued for user ${req.user._id}`);
    emitUserEvent(req.user._id, 'engine_status', {
      status: 'ONLINE',
      engineState: settings.engineState,
      engineCommand: settings.engineCommand,
      emergencyStopActive: settings.emergencyStopActive,
      lastHeartbeat: settings.lastHeartbeat,
      metrics: settings.engineMetrics
    });

    return res.status(200).json({
      success: true,
      message: 'Engine stop command sent successfully',
      data: settings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleRestartEngine = async (req, res) => {
  try {
    const settings = await BotSetting.findOne({ userId: req.user._id });
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    settings.engineCommand = 'RESTART';
    await settings.save();

    console.log(`[Engine Control] Engine Restart command issued for user ${req.user._id}`);
    emitUserEvent(req.user._id, 'engine_status', {
      status: 'ONLINE',
      engineState: settings.engineState,
      engineCommand: settings.engineCommand,
      emergencyStopActive: settings.emergencyStopActive,
      lastHeartbeat: settings.lastHeartbeat,
      metrics: settings.engineMetrics
    });

    return res.status(200).json({
      success: true,
      message: 'Engine restart command sent successfully',
      data: settings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleEmergencyStop = async (req, res) => {
  try {
    const settings = await BotSetting.findOne({ userId: req.user._id });
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    settings.engineCommand = 'EMERGENCY_STOP';
    settings.engineState = 'PAUSED'; // Default to Paused for emergency safety hold
    settings.emergencyStopActive = true;
    await settings.save();

    console.log(`[Engine Control] 🛑 EMERGENCY STOP triggered for user ${req.user._id} at ${new Date().toISOString()}`);
    
    emitUserEvent(req.user._id, 'engine_status', {
      status: 'ONLINE',
      engineState: settings.engineState,
      engineCommand: settings.engineCommand,
      emergencyStopActive: settings.emergencyStopActive,
      lastHeartbeat: settings.lastHeartbeat,
      metrics: settings.engineMetrics
    });

    return res.status(200).json({
      success: true,
      message: 'Emergency Stop command executed successfully',
      data: settings
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleHeartbeat = async (req, res) => {
  try {
    const { state, metrics, processedCommand } = req.body;

    const settings = await BotSetting.findOne({ userId: req.user._id }).populate('activeAccountId');
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Settings not found' });
    }

    // Update heartbeat timestamp
    settings.lastHeartbeat = new Date();

    // Python engine reports its current internal running state
    if (state) {
      settings.engineState = state;
    }

    // Reset command in Node once Python engine confirms execution
    if (processedCommand && processedCommand === settings.engineCommand) {
      settings.engineCommand = 'NONE';
    }

    // Calculate Today's Profit directly from DB closed trades for today
    const Trade = require('../models/Trade');
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const todayClosedTrades = await Trade.find({
      userId: req.user._id,
      status: 'CLOSED',
      closeTime: { $gte: startOfDay }
    });

    const todayProfitSum = todayClosedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);

    // Update live metrics from Python
    settings.engineMetrics = {
      ...settings.engineMetrics,
      ...(metrics || {}),
      todayProfit: Number(todayProfitSum.toFixed(2))
    };

    await settings.save();

    // Emit live stats socket event to browser clients
    emitUserEvent(req.user._id, 'engine_status', {
      status: 'ONLINE',
      engineState: settings.engineState,
      engineCommand: settings.engineCommand,
      emergencyStopActive: settings.emergencyStopActive,
      lastHeartbeat: settings.lastHeartbeat,
      metrics: settings.engineMetrics
    });

    return res.status(200).json({
      success: true,
      data: {
        engineCommand: settings.engineCommand,
        emergencyStopActive: settings.emergencyStopActive,
        isAutoTrading: settings.isAutoTrading,
        symbol: settings.symbol,
        timeframe: settings.timeframe,
        lotSize: settings.lotSize,
        maxTrades: settings.maxTrades,
        stopLossBuffer: settings.stopLossBuffer,
        riskReward: settings.riskReward,
        trailingSL: settings.trailingSL,
        activeAccountId: settings.activeAccountId
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  handleStartEngine,
  handlePauseEngine,
  handleStopEngine,
  handleRestartEngine,
  handleEmergencyStop,
  handleHeartbeat
};
