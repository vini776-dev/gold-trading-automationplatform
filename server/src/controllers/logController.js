const logService = require('../services/logService');

const handleGetLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const level = req.query.level;

    const result = await logService.getLogs(req.user._id, page, limit, level);

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
  handleGetLogs,
};
