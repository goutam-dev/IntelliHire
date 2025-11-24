const { requireAuth } = require('./clerkAuth');
const User = require('../models/User');
const { NotFoundError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Auth middleware that verifies Clerk token AND resolves the MongoDB user.
 * This ensures req.user is populated with the MongoDB document, compatible with legacy logic.
 */
const auth = async (req, res, next) => {
  try {
    // First, verify Clerk token
    await new Promise((resolve, reject) => {
      requireAuth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // req.auth is populated by requireAuth
    const clerkUserId = req.auth?.userId;
    
    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized - No Clerk ID' });
    }

    // Find user in MongoDB
    const user = await User.findOne({ clerkUserId });
    
    if (!user) {
      logger.warn(`User not found in database for Clerk ID: ${clerkUserId}`);
      return res.status(404).json({ error: 'User not found in database. Please complete your profile setup.' });
    }

    // Attach MongoDB user to req.user
    req.user = user;
    
    next();
  } catch (error) {
    logger.error('Auth middleware user resolution error:', error);
    return res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
};

module.exports = auth;
