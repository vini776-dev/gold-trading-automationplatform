const TradeLog = require('../models/TradeLog');

const getLogs = async (userId, page = 1, limit = 20, level) => {
  const skip = (page - 1) * limit;

  const query = { userId };
  if (level) {
    query.level = level;
  }

  const total = await TradeLog.countDocuments(query);
  const data = await TradeLog.find(query)
    .sort({ createdAt: -1 })
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
  getLogs,
};
