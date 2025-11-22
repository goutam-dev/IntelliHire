const { clerkClient, verifyToken } = require('@clerk/clerk-sdk-node');
const logger = require('../utils/logger');

// Middleware to verify Clerk authentication
async function requireAuth(req, res, next) {
  try {
    const sessionToken = req.cookies.__session || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized - No session token' });
    }

    // Verify the JWT token (networkless verification)
    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Unauthorized - Invalid session' });
    }

    // Get user information from Clerk (optional, only if needed)
    const user = await clerkClient.users.getUser(payload.sub);
    
    req.auth = {
      userId: payload.sub,
      sessionId: payload.sid,
      user: user,
      role: user.publicMetadata?.role || null,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized - Authentication failed' });
  }
}

// Optional auth middleware - populates req.auth if token exists, but doesn't block if missing
async function optionalAuth(req, res, next) {
  try {
    const sessionToken = req.cookies.__session || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      // No token provided, continue without auth
      return next();
    }

    // Verify the JWT token
    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    
    if (!payload || !payload.sub) {
      // Invalid token, continue without auth
      return next();
    }

    // Get user information from Clerk
    const user = await clerkClient.users.getUser(payload.sub);
    
    req.auth = {
      userId: payload.sub,
      sessionId: payload.sid,
      user: user,
      role: user.publicMetadata?.role || null,
    };

    next();
  } catch (error) {
    // Auth failed, but continue anyway (optional auth)
    logger.error('Optional auth middleware error:', error);
    next();
  }
}

// Middleware to check user role
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return res.status(403).json({ error: 'Forbidden - No role assigned' });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ 
        error: `Forbidden - Requires one of: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
