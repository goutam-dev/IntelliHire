const { requireAuth } = require('./clerkAuth');
const User = require('../models/User');
const { NotFoundError } = require('../utils/errorHandler');

/**
 * Auth middleware that verifies Clerk token AND resolves the MongoDB user.
 * This ensures req.user is populated with the MongoDB document, compatible with legacy logic.
 */
const auth = async (req, res, next) => {
  // First, verify Clerk token
  await requireAuth(req, res, async () => {
    try {
      // req.auth is populated by requireAuth
      const clerkUserId = req.auth.userId;
      
      if (!clerkUserId) {
        return res.status(401).json({ error: 'Unauthorized - No Clerk ID' });
      }

      // Find user in MongoDB
      const user = await User.findOne({ clerkUserId });
      
      if (!user) {
        // Option: Auto-create user if not found? 
        // For now, let's return 401 or 404. 
        // But backend-1 logic often assumed user exists or created it.
        // Let's return 404 for now, as registration should happen via auth flow.
        return res.status(404).json({ error: 'User not found in database' });
      }

      // Attach MongoDB user to req.user
      req.user = user;
      
      next();
    } catch (error) {
      console.error('Auth middleware user resolution error:', error);
      res.status(500).json({ error: 'Internal Server Error during auth' });
    }
  });
};

module.exports = auth;
