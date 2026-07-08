const reportService = require('../services/reportService');

const handleGetReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await reportService.getReports(req.user._id, page, limit);

    return res.status(200).json({
      success: true,
      ...result,
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

module.exports = {
  handleGetReports,
};
