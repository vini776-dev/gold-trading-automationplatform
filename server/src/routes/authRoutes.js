const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { validateLogin } = require('../validators/authValidator');

const router = express.Router();

router.post('/login', validateLogin, authController.login);
router.post('/logout', protect, authController.logout);
router.get('/verify', protect, authController.verify);

module.exports = router;
