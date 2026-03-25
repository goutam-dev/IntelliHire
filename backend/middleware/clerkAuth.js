const { clerkClient, verifyToken } = require('@clerk/clerk-sdk-node');
const logger = require('../utils/logger');

const CLERK_USER_CACHE_TTL_MS = Number(process.env.CLERK_USER_CACHE_TTL_MS || 60 * 1000);
const AUTH_DEBUG_CACHE = process.env.AUTH_DEBUG_CACHE === 'true';
const clerkUserCache = new Map();

function logAuthDebug(message, meta = {}) {
  if (!AUTH_DEBUG_CACHE) return;
  logger.debug(`[AuthCache] ${message} ${JSON.stringify(meta)}`);
}

function isClerkRateLimitError(error) {
  return error?.status === 429 ||
    error?.statusCode === 429 ||
    error?.errors?.some?.((e) => e?.code === 'rate_limit_exceeded') ||
    /too many requests/i.test(error?.message || '');
}

function getCachedClerkUser(userId) {
  const cached = clerkUserCache.get(userId);
  if (!cached) {
    logAuthDebug('cache_miss', { userId, reason: 'not_found' });
    return null;
  }

  if (cached.expiresAt > Date.now()) {
    logAuthDebug('cache_hit', {
      userId,
      ttlMsRemaining: cached.expiresAt - Date.now(),
      cacheSize: clerkUserCache.size,
    });
    return cached.user;
  }

  logAuthDebug('cache_expired', {
    userId,
    expiredByMs: Date.now() - cached.expiresAt,
  });
  clerkUserCache.delete(userId);
  return null;
}

async function getClerkUserWithCache(userId, { allowStaleOnRateLimit = true } = {}) {
  const freshCachedUser = getCachedClerkUser(userId);
  if (freshCachedUser) {
    return freshCachedUser;
  }

  try {
    logAuthDebug('clerk_api_fetch_start', { userId });
    const user = await clerkClient.users.getUser(userId);
    clerkUserCache.set(userId, {
      user,
      expiresAt: Date.now() + CLERK_USER_CACHE_TTL_MS,
    });
    logAuthDebug('clerk_api_fetch_success', {
      userId,
      ttlMs: CLERK_USER_CACHE_TTL_MS,
      cacheSize: clerkUserCache.size,
    });
    return user;
  } catch (error) {
    if (allowStaleOnRateLimit && isClerkRateLimitError(error)) {
      const stale = clerkUserCache.get(userId)?.user;
      if (stale) {
        logAuthDebug('clerk_api_rate_limited_using_stale', { userId });
        logger.warn(`Using stale cached Clerk user for ${userId} due to rate limit`);
        return stale;
      }
      logAuthDebug('clerk_api_rate_limited_no_stale', { userId });
    }
    logAuthDebug('clerk_api_fetch_error', {
      userId,
      status: error?.status || error?.statusCode,
      message: error?.message || 'unknown_error',
    });
    throw error;
  }
}

// Middleware to verify Clerk authentication
async function requireAuth(req, res, next) {
  try {
    // Prioritize the fresh Authorization header over the potentially stale __session cookie
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies.__session;
    
    if (!sessionToken) {
      logAuthDebug('require_auth_no_token', { path: req.originalUrl, method: req.method });
      return res.status(401).json({ error: 'Unauthorized - No session token' });
    }

    // Verify the JWT token (networkless verification)
    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 60 * 1000, // Allowance for clock drift between server and client
    });
    logAuthDebug('jwt_verified', {
      path: req.originalUrl,
      method: req.method,
      userId: payload?.sub || null,
      sessionId: payload?.sid || null,
    });
    
    if (!payload || !payload.sub) {
      logAuthDebug('require_auth_invalid_payload', { path: req.originalUrl, method: req.method });
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
    logAuthDebug('require_auth_failed', {
      path: req.originalUrl,
      method: req.method,
      status: error?.status || error?.statusCode,
      message: error?.message || 'unknown_error',
    });
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
    // Prioritize the fresh Authorization header over the potentially stale __session cookie
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies.__session;
    
    if (!sessionToken) {
      // No token provided, continue without auth
      logAuthDebug('optional_auth_no_token', { path: req.originalUrl, method: req.method });
      return next();
    }

    // Verify the JWT token
    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY,
      clockSkewInMs: 60 * 1000, // Allowance for clock drift between server and client
    });
    logAuthDebug('optional_jwt_verified', {
      path: req.originalUrl,
      method: req.method,
      userId: payload?.sub || null,
      sessionId: payload?.sid || null,
    });
    
    if (!payload || !payload.sub) {
      // Invalid token, continue without auth
      logAuthDebug('optional_auth_invalid_payload', { path: req.originalUrl, method: req.method });
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
      logAuthDebug('optional_auth_rate_limited', {
        path: req.originalUrl,
        method: req.method,
      });
      logger.warn('Optional auth rate limited, continuing without auth context');
      return next();
    }
    // Auth failed, but continue anyway (optional auth)
    logAuthDebug('optional_auth_failed', {
      path: req.originalUrl,
      method: req.method,
      status: error?.status || error?.statusCode,
      message: error?.message || 'unknown_error',
    });
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
