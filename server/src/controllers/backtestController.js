const backtestService = require('../services/backtestService');

const handleRunBacktest = async (req, res) => {
  try {
    const report = await backtestService.runBacktest(req.user._id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Backtest executed and saved successfully',
      data: report,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      status: 'ERROR',
      code: 'BACKTEST_FAILED',
      message: error.message,
    });
  }
};

const handleGetBacktestReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await backtestService.getBacktestReports(req.user._id, page, limit);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleGetBacktestReportById = async (req, res) => {
  try {
    const report = await backtestService.getBacktestReportById(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

const handleCompareBacktests = async (req, res) => {
  try {
    const { ids } = req.body;
    const reports = await backtestService.compareBacktests(req.user._id, ids);
    return res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const handleGetTradeReplay = async (req, res) => {
  try {
    const replay = await backtestService.getTradeReplay(req.user._id, req.params.tradeId);
    return res.status(200).json({
      success: true,
      data: replay,
    });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

module.exports = {
  handleRunBacktest,
  handleGetBacktestReports,
  handleGetBacktestReportById,
  handleCompareBacktests,
  handleGetTradeReplay,
};
