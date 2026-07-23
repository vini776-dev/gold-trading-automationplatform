const Trade = require('../models/Trade');
const Report = require('../models/Report');
const MT5Account = require('../models/MT5Account');

const getDashboardSummary = async (userId) => {
  // Get the latest performance report for this user in DB for historical stats (winRate, drawdown)
  const latestReport = await Report.findOne({ userId }).sort({ reportDate: -1 });

  // Get active MT5 account info for real-time account metrics
  const account = await MT5Account.findOne({ userId, isDefault: true });

  // Calculate Today's Profit directly from DB closed trades for today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayClosedTrades = await Trade.find({
    userId,
    status: 'CLOSED',
    closeTime: { $gte: startOfDay }
  });

  let dailyProfit = 0.0;
  if (todayClosedTrades.length > 0) {
    dailyProfit = todayClosedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
  } else if (account && account.todayProfit !== undefined) {
    dailyProfit = account.todayProfit;
  }

  return {
    balance: account ? account.balance : 0.0,
    equity: account ? account.equity : 0.0,
    marginFree: account ? account.marginFree : 0.0,
    marginLevel: account ? account.marginLevel : 0.0,
    floatingPnL: account ? account.floatingPnL : 0.0,
    dailyProfit: Number(dailyProfit.toFixed(2)),
    activeTradesCount: account ? account.openPositions : 0,
    winRate: latestReport ? latestReport.winRate : 0.0,
    drawdown: latestReport ? latestReport.drawdown : 0.0,
  };
};

module.exports = {
  getDashboardSummary,
};
