const { WebSocketServer } = require('ws');
const { verifyToken } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const logger = require('./logger');

/**
 * WebSocket Manager
 *
 * Maintains an in-memory map of  userId (MongoDB ObjectId string) → WebSocket
 * so that any service can push a real-time event to a specific user.
 *
 * Scale note: This in-memory map works correctly for a single Node.js process.
 * If the app ever scales to multiple processes/containers, replace the Map with
 * a Redis pub/sub adapter here — the sendToUser API stays the same everywhere.
 */

/** @type {Map<string, import('ws').WebSocket>} */
const clients = new Map();

let wss;

/**
 * Authenticate a WebSocket connection.
 * Expects the client to send a JSON message immediately after connecting:
 *   { type: "auth", token: "<clerk-jwt>", userId?: "<mongodb-user-id>" }
 *
 * Server verifies the Clerk JWT and resolves the MongoDB user itself.
 * Any optional client-provided userId is treated as advisory only and must
 * match the resolved MongoDB user id.
 */

async function authenticateSocket(authMessage = {}) {
  const token = authMessage?.token;
  if (!token) {
    throw new Error('Missing token');
  }

  const payload = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
    clockSkewInMs: 60 * 1000,
  });

  if (!payload?.sub) {
    throw new Error('Invalid token payload');
  }

  const user = await User.findOne({ clerkUserId: payload.sub }).select('_id');
  if (!user) {
    throw new Error('User not found for token');
  }

  const resolvedUserId = String(user._id);
  const claimedUserId = authMessage?.userId ? String(authMessage.userId) : null;

  if (claimedUserId && claimedUserId !== resolvedUserId) {
    throw new Error('Token/user mismatch');
  }

  return resolvedUserId;
}

/**
 * Initialise the WebSocket server and attach it to the existing HTTP server.
 * Call this once after server.listen().
 *
 * @param {import('http').Server} server
 */
function init(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let userId = null;

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'auth') {
          const authenticatedUserId = await authenticateSocket(msg);

          // Ensure only one active socket per user in this process.
          const previousSocket = clients.get(authenticatedUserId);
          if (previousSocket && previousSocket !== ws) {
            try {
              previousSocket.close();
            } catch {
              // ignore close failures on stale socket
            }
          }

          userId = authenticatedUserId;
          clients.set(userId, ws);
          logger.info(`[wsManager] Client registered: userId=${userId}`);
          ws.send(JSON.stringify({ type: 'auth_ok' }));
        }
      } catch (err) {
        if (!userId) {
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Authentication failed' }));
          ws.close();
        }
        logger.warn(`[wsManager] Ignored WS message or auth failed: ${err.message}`);
      }
    });

    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        logger.info(`[wsManager] Client disconnected: userId=${userId}`);
      }
    });

    ws.on('error', (err) => {
      logger.error(`[wsManager] WS error for userId=${userId}: ${err.message}`);
    });

    // Send a ping every 30 s to keep the connection alive through proxies/load-balancers
    const heartbeat = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      } else {
        clearInterval(heartbeat);
      }
    }, 30_000);

    ws.on('close', () => clearInterval(heartbeat));
  });

  logger.info('[wsManager] WebSocket server initialised on path /ws');
}

/**
 * Push a JSON payload to a specific user if they have an open connection.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {object} payload
 */
function sendToUser(userId, payload) {
  const id = String(userId);
  const ws = clients.get(id);
  if (ws && ws.readyState === ws.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch (err) {
      logger.error(`[wsManager] Failed to send to userId=${id}: ${err.message}`);
    }
  }
}

module.exports = { init, sendToUser };
