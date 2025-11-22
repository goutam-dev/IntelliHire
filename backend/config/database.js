const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

/**
 * Database connection configuration
 */
const connectDatabase = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      // useNewUrlParser and useUnifiedTopology are no longer needed in Mongoose 6+
    });
    logger.info('✅ Connected to MongoDB');
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = { connectDatabase };
