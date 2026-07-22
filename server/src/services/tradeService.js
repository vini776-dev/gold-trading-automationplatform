const Trade = require('../models/Trade');
const BotSetting = require('../models/BotSetting');
const reportService = require('./reportService');

const createTrade = async (userId, tradeData) => {
  const { mt5Ticket } = tradeData;

  // 1. Idempotency Check
  const existingTrade = await Trade.findOne({ mt5Ticket });
  if (existingTrade) {
    return { trade: existingTrade, created: false };
  }

  // 2. Fetch User Max Trades Configuration
  const settings = await BotSetting.findOne({ userId });
  const maxTradesLimit = settings ? settings.maxTrades : 5;

  // 3. Check Active Trades Count
  const activeCount = await Trade.countDocuments({ userId, status: 'OPEN' });
  if (activeCount >= maxTradesLimit) {
    throw new Error(`Maximum active trades limit (${maxTradesLimit}) reached`);
  }

  // 4. Create New Trade
  const newTrade = await Trade.create({
    userId,
    ...tradeData,
    status: 'OPEN',
  });

  return { trade: newTrade, created: true };
};

const closeTrade = async (tradeId, closeData) => {
  const { exitPrice, closeTime, closeReason } = closeData;

  const trade = await Trade.findById(tradeId);
  if (!trade) {
    throw new Error('Trade not found');
  }

  if (trade.status === 'CLOSED') {
    return trade;
  }

  // Calculate duration in seconds
  const openTimeMs = new Date(trade.openTime).getTime();
  const closeTimeMs = new Date(closeTime).getTime();
  const duration = Math.max(0, Math.ceil((closeTimeMs - openTimeMs) / 1000));

  // Calculate profit/loss (use provided MT5 deal profit if passed)
  const contractSize = 100;
  const priceDiff = trade.orderType === 'BUY' ? (exitPrice - trade.entryPrice) : (trade.entryPrice - exitPrice);
  const calculatedPnl = parseFloat((priceDiff * trade.lotSize * contractSize).toFixed(2));
  const profitLoss = (closeData.profitLoss !== undefined && closeData.profitLoss !== null) ? closeData.profitLoss : calculatedPnl;

  trade.exitPrice = exitPrice;
  trade.closeTime = closeTime;
  trade.closeReason = closeReason;
  trade.duration = duration;
  trade.profitLoss = profitLoss;
  trade.status = 'CLOSED';

  await trade.save();

  // Dynamically update user daily performance report
  await reportService.updateDailyReport(trade.userId, closeTime);

  return trade;
};

const getActiveTrades = async (userId) => {
  return await Trade.find({ userId, status: 'OPEN' }).sort({ openTime: -1 });
};

const getTradeHistory = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const total = await Trade.countDocuments({ userId, status: 'CLOSED' });
  const data = await Trade.find({ userId, status: 'CLOSED' })
    .sort({ closeTime: -1 })
    .skip(skip)
    .limit(limit);

  return {
    total,
    page,
    limit,
    data,
  };
};

const axios = require('axios');

const manualCloseTrade = async (userId, ticket) => {
  const trade = await Trade.findOne({ mt5Ticket: ticket, userId });
  if (!trade) {
    throw new Error(`Trade #${ticket} not found in database`);
  }

  if (trade.status === 'CLOSED') {
    return trade;
  }

  // Call Python Trading Engine API on port 5001
  const engineUrl = process.env.PYTHON_ENGINE_URL || 'http://localhost:5001';
  let closeDetails = null;

  try {
    const response = await axios.post(`${engineUrl}/close-trade`, { ticket: Number(ticket) }, { timeout: 15000 });
    if (response.data && response.data.success) {
      closeDetails = response.data.data;
    }
  } catch (err) {
    console.error(`[ManualClose] Python Engine HTTP error:`, err.response ? err.response.data : err.message);
    throw new Error(err.response?.data?.error || `Failed to close position #${ticket} on MetaTrader 5`);
  }

  if (!closeDetails) {
    throw new Error(`Engine returned no close details for ticket #${ticket}`);
  }

  return await closeTrade(trade._id, closeDetails);
};

module.exports = {
  createTrade,
  closeTrade,
  manualCloseTrade,
  getActiveTrades,
  getTradeHistory,
};
