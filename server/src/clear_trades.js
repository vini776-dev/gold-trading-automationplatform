require('dotenv').config();
const connectDB = require('./config/db');
const Trade = require('./models/Trade');
const mongoose = require('mongoose');

const clearTrades = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Deleting all trades from the database...");
    const result = await Trade.deleteMany({});
    console.log(`Successfully deleted ${result.deletedCount} trades.`);

    // Also update BotSetting or other state if needed (not needed since Trades collection holds all trade history)
    
  } catch (error) {
    console.error("Error clearing trades:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  }
};

clearTrades();
