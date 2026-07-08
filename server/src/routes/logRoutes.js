const express = require('express');
const logController = require('../controllers/logController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, logController.handleGetLogs);

module.exports = router;
