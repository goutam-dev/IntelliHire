const { clerkClient, verifyToken } = require('@clerk/clerk-sdk-node');
const logger = require('../utils/logger');

const CLERK_USER_CACHE_TTL_MS = Number(process.env.CLERK_USER_CACHE_TTL_MS || 60 * 1000);
const clerkUserCache = new Map();

function isClerkRateLimitError(error) {
  return error?.status === 429 ||
    error?.statusCode === 429 ||
    error?.errors?.some?.((e) => e?.code === 'rate_limit_exceeded') ||
    /too many requests/i.test(error?.message || '');
}

function getCachedClerkUser(userId) {
  const cached = clerkUserCache.get(userId);
  if (!cached) return null;

  if (cached.expiresAt > Date.now()) {
    return cached.user;
  }

  clerkUserCache.delete(userId);
  return null;
}

async function getClerkUserWithCache(userId, { allowStaleOnRateLimit = true } = {}) {
  const freshCachedUser = getCachedClerkUser(userId);
  if (freshCachedUser) {
    return freshCachedUser;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    clerkUserCache.set(userId, {
      user,
      expiresAt: Date.now() + CLERK_USER_CACHE_TTL_MS,
    });
    return user;
  } catch (error) {
    if (allowStaleOnRateLimit && isClerkRateLimitError(error)) {
      const stale = clerkUserCache.get(userId)?.user;
      if (stale) {
        logger.warn(`Using stale cached Clerk user for ${userId} due to rate limit`);
        return stale;
      }
    }
    throw error;
  }
}

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

    // Resolve Clerk user with short-lived in-memory cache to avoid API bursts.
    const user = await getClerkUserWithCache(payload.sub);
    
    req.auth = {
      userId: payload.sub,
      sessionId: payload.sid,
      user: user,
      role: user.publicMetadata?.role || null,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    if (isClerkRateLimitError(error)) {
      return res.status(429).json({ error: 'Too Many Requests - Authentication service is rate limited' });
    }
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

    // Resolve Clerk user with cache and continue gracefully on transient rate limits.
    const user = await getClerkUserWithCache(payload.sub);
    
    req.auth = {
      userId: payload.sub,
      sessionId: payload.sid,
      user: user,
      role: user.publicMetadata?.role || null,
    };

    next();
  } catch (error) {
    if (isClerkRateLimitError(error)) {
      logger.warn('Optional auth rate limited, continuing without auth context');
      return next();
    }
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
