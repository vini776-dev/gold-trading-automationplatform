const dashboardService = require('../services/dashboardService');

const getSummary = async (req, res) => {
  try {
    const summary = await dashboardService.getDashboardSummary(req.user._id);
    return res.status(200).json({
      success: true,
      data: summary,
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
  getSummary,
};
