const express = require('express');
const tradeController = require('../controllers/tradeController');
const { authenticate } = require('../middlewares/authMiddleware');
const { validateCreateTrade, validateCloseTrade } = require('../validators/tradeValidator');

const router = express.Router();

// Apply authenticate middleware globally to all trade routes
router.use(authenticate);

router.post('/', validateCreateTrade, tradeController.handleCreateTrade);
router.put('/:id/close', validateCloseTrade, tradeController.handleCloseTrade);
router.get('/active', tradeController.handleGetActiveTrades);
router.get('/history', tradeController.handleGetTradeHistory);

module.exports = router;
