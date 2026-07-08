const Trade = require('../models/Trade');
const BotSetting = require('../models/BotSetting');

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

  // Calculate profit/loss
  // Note: Standard formula for currency pairs depends on lots. Here we assume 1 lot of XAUUSD is 100 ounces.
  // Standard PnL calculation: (Exit Price - Entry Price) * Lot Size * contractSize (100 for XAUUSD)
  // For BUY: (Exit - Entry) * Lot * 100
  // For SELL: (Entry - Exit) * Lot * 100
  const contractSize = 100;
  const priceDiff = trade.orderType === 'BUY' ? (exitPrice - trade.entryPrice) : (trade.entryPrice - exitPrice);
  const profitLoss = parseFloat((priceDiff * trade.lotSize * contractSize).toFixed(2));

  trade.exitPrice = exitPrice;
  trade.closeTime = closeTime;
  trade.closeReason = closeReason;
  trade.duration = duration;
  trade.profitLoss = profitLoss;
  trade.status = 'CLOSED';

  await trade.save();
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

module.exports = {
  createTrade,
  closeTrade,
  getActiveTrades,
  getTradeHistory,
};
