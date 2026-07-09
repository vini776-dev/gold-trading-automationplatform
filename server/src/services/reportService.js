const Report = require('../models/Report');
const Trade = require('../models/Trade');

const getReports = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const total = await Report.countDocuments({ userId });
  const data = await Report.find({ userId })
    .sort({ reportDate: -1 })
    .skip(skip)
    .limit(limit);

  return {
    total,
    page,
    limit,
    data,
  };
};

const updateDailyReport = async (userId, dateStr) => {
  try {
    const startOfDay = new Date(dateStr);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Fetch closed trades for this specific user on this specific day
    const trades = await Trade.find({
      userId,
      status: 'CLOSED',
      closeTime: { $gte: startOfDay, $lte: endOfDay }
    });

    if (trades.length === 0) return;

    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.profitLoss >= 0).length;
    const losingTrades = totalTrades - winningTrades;
    const winRate = (winningTrades / totalTrades) * 100;

    const totalProfit = trades.filter(t => t.profitLoss >= 0).reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLoss = trades.filter(t => t.profitLoss < 0).reduce((sum, t) => sum + Math.abs(t.profitLoss), 0);
    const netProfit = parseFloat((totalProfit - totalLoss).toFixed(2));

    const averageWin = winningTrades > 0 ? parseFloat((totalProfit / winningTrades).toFixed(2)) : 0;
    const averageLoss = losingTrades > 0 ? parseFloat((totalLoss / losingTrades).toFixed(2)) : 0;

    const profitFactor = totalLoss > 0 ? parseFloat((totalProfit / totalLoss).toFixed(2)) : parseFloat(totalProfit.toFixed(2));
    const expectancy = parseFloat((((winRate / 100) * averageWin) - ((1 - (winRate / 100)) * averageLoss)).toFixed(2));

    await Report.findOneAndUpdate(
      {
        userId,
        reportType: 'Daily',
        reportDate: startOfDay
      },
      {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalProfit,
        totalLoss,
        netProfit,
        averageWin,
        averageLoss,
        profitFactor,
        expectancy,
        drawdown: 0.0
      },
      { upsert: true, new: true }
    );
    console.log(`Daily report successfully updated for ${startOfDay.toISOString()}`);
  } catch (error) {
    console.error(`Failed to update daily report: ${error.message}`);
  }
};

module.exports = {
  getReports,
  updateDailyReport,
};
