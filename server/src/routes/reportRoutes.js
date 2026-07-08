const express = require('express');
const reportController = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, reportController.handleGetReports);

module.exports = router;
