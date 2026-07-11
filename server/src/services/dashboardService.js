const Trade = require('../models/Trade');
const Report = require('../models/Report');
const MT5Account = require('../models/MT5Account');

const getDashboardSummary = async (userId) => {
  // Count active open trades in DB
  const activeTradesCount = await Trade.countDocuments({ userId, status: 'OPEN' });

  // Get the latest performance report for this user in DB
  const latestReport = await Report.findOne({ userId }).sort({ reportDate: -1 });

  // Get active MT5 account info for real-time balance and equity
  const account = await MT5Account.findOne({ userId, isDefault: true });

  // Default values if no reports exist in MongoDB yet
  const summary = {
    balance: account ? account.balance : 0.0,
    equity: account ? account.equity : 0.0,
    dailyProfit: 0.0,
    winRate: latestReport ? latestReport.winRate : 0.0,
    activeTradesCount,
    drawdown: latestReport ? latestReport.drawdown : 0.0,
  };

  // If daily report exists, update daily profit details
  if (latestReport) {
    summary.dailyProfit = latestReport.totalProfit - latestReport.totalLoss;
  }

  return summary;
};

module.exports = {
  getDashboardSummary,
};
