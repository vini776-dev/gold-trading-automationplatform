const Report = require('../models/Report');

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

module.exports = {
  getReports,
};
