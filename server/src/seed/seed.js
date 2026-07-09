const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const BotSetting = require('../models/BotSetting');

const seedData = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Clear existing collections (optional, for clean slate)
    await User.deleteMany();
    await BotSetting.deleteMany();
    console.log('Existing users and bot settings cleared.');

    // 3. Setup Default Admin Credentials from ENV
    const adminName = process.env.ADMIN_NAME || 'Admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gtap.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // 4. Create Default Admin User
    const adminUser = await User.create({
      fullName: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'Admin',
      isActive: true,
    });
    console.log(`Admin user created with email: ${adminEmail}`);

    // 5. Create Default Bot Settings for the Admin User
    await BotSetting.create({
      userId: adminUser._id,
      symbol: 'XAUUSD',
      timeframe: 'M1',
      emaPeriod: 11,
      rsiPeriod: 14,
      fractalPeriod: 5,
      lotSize: 0.2,
      maxTrades: 5,
      stopLossBuffer: 0.02,
      riskReward: '1:2',
      trailingSL: true,
      telegramEnabled: true,
      botStatus: false,
      isAutoTrading: false,
    });
    console.log('Default bot settings created.');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedData();
