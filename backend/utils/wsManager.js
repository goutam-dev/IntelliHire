const { WebSocketServer } = require('ws');
const { verifyToken } = require('@clerk/clerk-sdk-node');
const User = require('../models/User');
const InterviewSession = require('../models/InterviewSession');
const JobApplication = require('../models/JobApplication');
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

  return {
    mongoUserId: resolvedUserId,
    clerkUserId: String(payload.sub),
  };
}

async function ensureFaceSessionReady(sessionId, authCtx, elapsedSeconds = 0) {
  const faceProctoringService = require('../services/faceProctoringService');
  const session = await InterviewSession.findById(sessionId, 'applicationId candidateId status').lean();
  if (!session) return { ok: false, code: 'invalid_session', message: 'Session not found' };

  const sessionCandidateId = String(session.candidateId || '');
  const ownsSession = sessionCandidateId === String(authCtx?.clerkUserId || '')
    || sessionCandidateId === String(authCtx?.mongoUserId || '');

  if (!ownsSession) {
    return { ok: false, code: 'unauthorized', message: 'Session not found' };
  }

  if (!['created', 'started', 'in_progress', 'completing'].includes(session.status)) {
    return { ok: false, code: 'invalid_status', message: `Cannot start face proctoring in status: ${session.status}` };
  }

  const application = await JobApplication.findOne(
    { applicationId: session.applicationId },
    'applicationId faceEnrollment'
  ).lean();

  const hasEmbedding = Array.isArray(application?.faceEnrollment?.canonicalEmbedding)
    && application.faceEnrollment.canonicalEmbedding.length > 0;

  if (!hasEmbedding) {
    return {
      ok: false,
      code: 'not_enrolled',
      message: application?.faceEnrollment?.status === 'failed'
        ? 'Face enrollment failed during application - proctoring unavailable'
        : 'Face enrollment not yet complete. Please wait a few seconds and retry.',
    };
  }

  const canonicalEmbedding = application.faceEnrollment.canonicalEmbedding;
  const faceCandidateId = application.faceEnrollment.candidateId || application.applicationId;

  const ownerCandidateId = sessionCandidateId || String(authCtx?.clerkUserId || authCtx?.mongoUserId || '');

  if (!faceProctoringService.isSessionActive(sessionId, ownerCandidateId)) {
    await faceProctoringService.connectVerificationWS(
      sessionId,
      faceCandidateId,
      canonicalEmbedding,
      elapsedSeconds,
      { candidateId: ownerCandidateId }
    );
  }

  return { ok: true, candidateId: faceCandidateId, ownerCandidateId };
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
    let faceSessionId = null;
    let faceOwnerCandidateId = null;
    let registeredNotificationClient = false;

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'auth') {
          const authCtx = await authenticateSocket(msg);
          const authenticatedUserId = authCtx.mongoUserId;

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
          registeredNotificationClient = true;
          logger.info(`[wsManager] Client registered: userId=${userId}`);
          ws.send(JSON.stringify({ type: 'auth_ok' }));
          return;
        }

        if (msg.type === 'face_auth') {
          logger.info(`[wsManager] Face stream auth attempt: sessionId=${msg?.sessionId || 'n/a'}`);
          const authCtx = await authenticateSocket({ token: msg?.token, userId: msg?.userId });
          userId = authCtx.mongoUserId;
          const sessionId = msg?.sessionId;
          const elapsedSeconds = Number(msg?.elapsedSeconds || 0);

          if (!sessionId) {
            ws.send(JSON.stringify({ type: 'auth_error', code: 'invalid_session', message: 'sessionId is required' }));
            return;
          }

          const readiness = await ensureFaceSessionReady(sessionId, authCtx, elapsedSeconds);
          if (!readiness.ok) {
            logger.info(`[wsManager] Face stream auth rejected: sessionId=${sessionId} code=${readiness.code} message=${readiness.message}`);
            ws.send(JSON.stringify({ type: 'auth_error', code: readiness.code, message: readiness.message }));
            return;
          }

          faceSessionId = String(sessionId);
          faceOwnerCandidateId = readiness.ownerCandidateId || null;

          ws.send(JSON.stringify({
            type: 'auth_ok',
            data: {
              started: true,
              sessionId: faceSessionId,
              candidateId: readiness.candidateId,
            },
          }));
          logger.info(`[wsManager] Face stream authenticated: ownerCandidateId=${faceOwnerCandidateId} sessionId=${faceSessionId}`);
          return;
        }

        if (msg.type === 'face_frame') {
          const faceProctoringService = require('../services/faceProctoringService');
          const frameId = msg?.frameId ?? null;
          if (!faceSessionId || !faceOwnerCandidateId) {
            ws.send(JSON.stringify({
              type: 'analysis',
              frameId,
              data: { forwarded: false, failReason: 'not_authenticated' },
            }));
            return;
          }

          const image = msg?.image;
          if (!image || typeof image !== 'string') {
            ws.send(JSON.stringify({
              type: 'analysis',
              frameId,
              data: { forwarded: false, failReason: 'missing_image' },
            }));
            return;
          }

          logger.debug(`[wsManager] Face frame received: sessionId=${faceSessionId} frameId=${frameId || 'n/a'}`);
          const frameResult = faceProctoringService.processFrame(faceSessionId, image, faceOwnerCandidateId);
          if (!frameResult?.forwarded) {
            logger.warn(
              `[wsManager] Face frame not forwarded: sessionId=${faceSessionId} frameId=${frameId || 'n/a'} reason=${frameResult?.failReason || 'unknown'} wsState=${frameResult?.wsReadyState || 'n/a'}`
            );
          }
          ws.send(JSON.stringify({ type: 'analysis', frameId, data: frameResult }));
          return;
        }
      } catch (err) {
        if (typeof msg?.type === 'string' && msg.type.startsWith('face_')) {
          logger.warn(`[wsManager] Face stream message failed: type=${msg.type} error=${err.message}`);
        }
        if (!userId) {
          ws.send(JSON.stringify({ type: 'auth_error', message: 'Authentication failed' }));
          ws.close();
        }
        logger.warn(`[wsManager] Ignored WS message or auth failed: ${err.message}`);
      }
    });

    ws.on('close', () => {
      if (registeredNotificationClient && userId) {
        clients.delete(userId);
        logger.info(`[wsManager] Client disconnected: userId=${userId}`);
      }
      if (faceSessionId) {
        logger.info(`[wsManager] Face stream disconnected: sessionId=${faceSessionId} ownerCandidateId=${faceOwnerCandidateId || 'n/a'}`);
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
