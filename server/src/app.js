const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));

// Basic route for testing
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const settingRoutes = require('./routes/settingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const logRoutes = require('./routes/logRoutes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/trades', tradeRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/logs', logRoutes);

module.exports = app;
