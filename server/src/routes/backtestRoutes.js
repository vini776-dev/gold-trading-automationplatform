const express = require('express');
const backtestController = require('../controllers/backtestController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Authenticate all backtest routes
router.use(authenticate);

router.post('/run', backtestController.handleRunBacktest);
router.get('/reports', backtestController.handleGetBacktestReports);
router.get('/reports/:id', backtestController.handleGetBacktestReportById);
router.post('/compare', backtestController.handleCompareBacktests);
router.get('/replay/:tradeId', backtestController.handleGetTradeReplay);

module.exports = router;
