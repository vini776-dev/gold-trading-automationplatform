const Trade = require('../models/Trade');
const Report = require('../models/Report');

const getDashboardSummary = async (userId) => {
  // Count active open trades in DB
  const activeTradesCount = await Trade.countDocuments({ userId, status: 'OPEN' });

  // Get the latest performance report for this user in DB
  const latestReport = await Report.findOne({ userId }).sort({ reportDate: -1 });

  // Default values if no reports exist in MongoDB yet
  const summary = {
    balance: latestReport ? latestReport.netProfit + 10000 : 10000.0, // Assuming 10k initial balance
    equity: latestReport ? latestReport.netProfit + 10000 : 10000.0,
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
