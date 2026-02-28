/**
 * interviewController.js
 * 
 * Thin controller — delegates all logic to interviewService and voiceProctoringService.
 * Handles request validation, auth checks, and response formatting.
 */

const interviewService = require('../services/interviewService');
const voiceProctoringService = require('../services/voiceProctoringService');
const faceProctoringService = require('../services/faceProctoringService');
const JobApplication = require('../models/JobApplication');
const InterviewSession = require('../models/InterviewSession');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

async function authorizeVoiceSession(sessionId, candidateId) {
  if (!candidateId) return null;
  const session = await InterviewSession.findById(sessionId, 'applicationId candidateId status voiceProctoring faceProctoring').lean();
  if (!session) return null;
  if (String(session.candidateId) !== String(candidateId)) return null;
  return session;
}

/**
 * POST /api/interview/sessions
 * Create a new interview session for an application.
 */
exports.createSession = asyncHandler(async (req, res) => {
  const { applicationId } = req.body;
  if (!applicationId) {
    return res.status(400).json({ success: false, message: 'applicationId is required' });
  }

  const candidateId = req.auth?.userId;
  if (!candidateId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Check for existing active session
  const existing = await interviewService.getActiveSession(applicationId, candidateId);
  if (existing) {
    return res.json({
      success: true,
      data: {
        sessionId: existing._id,
        status: existing.status,
        resumed: true,
      },
    });
  }

  const session = await interviewService.createSession(applicationId, candidateId);
  res.status(201).json({
    success: true,
    data: {
      sessionId: session._id,
      status: session.status,
      jobTitle: session.jobTitle,
      config: session.config,
    },
  });
});

/**
 * POST /api/interview/sessions/:sessionId/start
 * Start the interview — generates the first question.
 */
exports.startSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const result = await interviewService.startSession(sessionId);
  res.json({ success: true, data: result });
});

/**
 * POST /api/interview/sessions/:sessionId/answer
 * Submit an answer (text) and get the next question.
 */
exports.submitAnswer = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { answerText, turnIndex, answerDurationMs } = req.body;

  if (turnIndex == null) {
    return res.status(400).json({ success: false, message: 'turnIndex is required' });
  }

  const result = await interviewService.submitAnswer(sessionId, {
    answerText: answerText || '',
    turnIndex,
    answerDurationMs: answerDurationMs || 0,
  });

  res.json({ success: true, data: result });
});

/**
 * POST /api/interview/sessions/:sessionId/transcribe
 * Transcribe audio using Whisper (Groq).
 * Expects multipart/form-data with an 'audio' file field.
 */
exports.transcribeAudio = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Audio file is required' });
  }

  const mimeType = req.file.mimetype || 'audio/webm';
  const audioBuffer = req.file.buffer;

  logger.info(`[Interview] Transcribing audio: ${(audioBuffer.length / 1024).toFixed(1)}KB, type: ${mimeType}`);

  const result = await interviewService.transcribeAudio(audioBuffer, mimeType);

  res.json({
    success: true,
    data: {
      text: result.text,
      duration: result.duration,
      language: result.language,
    },
  });
});

/**
 * POST /api/interview/sessions/:sessionId/complete
 * Finalize the interview and generate the summary.
 */
exports.completeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { cheatingEvents, totalCheatingScore, terminationReason } = req.body;

  const summary = await interviewService.completeSession(sessionId, {
    cheatingEvents: cheatingEvents || [],
    totalCheatingScore: totalCheatingScore || 0,
    terminationReason: terminationReason || '',
  });

  res.json({ success: true, data: summary });
});

/**
 * PATCH /api/interview/sessions/:sessionId/time
 * Update the elapsed time of the session.
 */
exports.updateTime = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { elapsedSeconds } = req.body;

  await interviewService.updateSessionTime(sessionId, elapsedSeconds || 0);
  res.json({ success: true });
});

/**
 * GET /api/interview/sessions/:sessionId
 * Get session state.
 */
exports.getSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const candidateId = req.auth?.userId;

  const session = await interviewService.getSession(sessionId, candidateId);
  res.json({ success: true, data: session });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  VOICE PROCTORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/interview/sessions/:sessionId/voice-proctoring/start
 * Open a WebSocket to the Python voice verification service for this session.
 * Requires the application to have a voiceEnrollment.speakerId.
 */
exports.startVoiceProctoring = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { elapsedSeconds = 0 } = req.body;
  const candidateId = req.auth?.userId;

  if (!candidateId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const session = await authorizeVoiceSession(sessionId, candidateId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  if (!['created', 'started', 'in_progress', 'completing'].includes(session.status)) {
    return res.status(400).json({ success: false, message: `Cannot start voice proctoring in status: ${session.status}` });
  }

  logger.info(`[VoiceProctoring] startVoiceProctoring: sessionId=${sessionId} applicationId=${session.applicationId}`);

  // Load application to get speakerId
  let application = await JobApplication.findOne(
    { applicationId: session.applicationId },
    'voiceEnrollment applicationId audioFile'
  );

  if (!application?.voiceEnrollment?.speakerId) {
    // If enrollment is pending but audio already exists, trigger on-demand enrollment.
    if (application?.voiceEnrollment?.status === 'pending' && application?.audioFile?.filePath) {
      const relativeAudioPath = String(application.audioFile.filePath).replace(/^[/\\]+/, '');
      const absoluteAudioPath = path.join(__dirname, '..', relativeAudioPath);

      if (fs.existsSync(absoluteAudioPath)) {
        voiceProctoringService.enrollSpeaker(application.applicationId, absoluteAudioPath)
          .catch((err) => logger.warn(`[VoiceProctoring] On-demand enrollment failed: ${err.message}`));
      }
    }

    // Reload once in case speakerId was populated between read and now.
    application = await JobApplication.findOne(
      { applicationId: session.applicationId },
      'voiceEnrollment applicationId audioFile'
    );

    if (application?.voiceEnrollment?.speakerId) {
      // Continue below and connect WS.
    } else {
    logger.warn(`[VoiceProctoring] No speakerId for applicationId=${session.applicationId} (status=${application?.voiceEnrollment?.status})`);
    return res.json({
      success: true,
      data: {
        started: false,
        reason: application?.voiceEnrollment?.status === 'failed'
          ? 'Voice enrollment failed during application — proctoring unavailable'
            : 'Voice enrollment not yet complete. Please wait a few seconds and retry.',
      },
    });
    }
  }

  if (voiceProctoringService.isSessionActive(sessionId, candidateId)) {
    logger.info(`[VoiceProctoring] Session already active: ${sessionId}`);
    return res.json({ success: true, data: { started: true, resumed: true } });
  }

  // Connect to Python WS (non-blocking — resolves once WS is 'ready' or times out)
  voiceProctoringService.connectVerificationWS(
    sessionId,
    application.voiceEnrollment.speakerId,
    elapsedSeconds,
    { candidateId }
  ).catch((err) => {
    logger.warn(`[VoiceProctoring] connectVerificationWS error (session=${sessionId}): ${err.message}`);
  });

  logger.info(`[VoiceProctoring] Started for session=${sessionId} speaker=${application.voiceEnrollment.speakerId}`);
  res.json({ success: true, data: { started: true, speakerId: application.voiceEnrollment.speakerId } });
});

/**
 * POST /api/interview/sessions/:sessionId/voice-proctoring/chunk
 * Forward a raw float32 PCM audio chunk (2048 bytes = 512 samples at 16kHz) to the Python WS.
 * Body must be raw binary (Content-Type: application/octet-stream).
 */
exports.streamAudioChunk = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const candidateId = req.auth?.userId;
  const chunkBuffer = req.body; // express.raw() middleware parses this

  if (!candidateId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const session = await authorizeVoiceSession(sessionId, candidateId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  if (!Buffer.isBuffer(chunkBuffer) || chunkBuffer.length === 0) {
    return res.status(400).json({ success: false, message: 'Expected raw audio buffer' });
  }

  const forwarded = voiceProctoringService.processAudioChunk(sessionId, chunkBuffer, candidateId);

  // 200 always — silence failures to keep interview flowing
  res.json({ success: true, data: { forwarded } });
});

/**
 * POST /api/interview/sessions/:sessionId/voice-proctoring/stop
 * Gracefully stop voice proctoring — sends STOP to the Python service, waits for session_end.
 */
exports.stopVoiceProctoring = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const candidateId = req.auth?.userId;

  if (!candidateId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const session = await authorizeVoiceSession(sessionId, candidateId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  await voiceProctoringService.stopVerificationWS(sessionId, candidateId);

  res.json({ success: true, data: { stopped: true } });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  FACE PROCTORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/interview/sessions/:sessionId/face-proctoring/start
 * Open a WebSocket to the Unified Face Analysis service for this session.
 */
exports.startFaceProctoring = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { elapsedSeconds = 0 } = req.body;
  const candidateId = req.auth?.userId;

  if (!candidateId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const session = await authorizeVoiceSession(sessionId, candidateId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  if (!['created', 'started', 'in_progress', 'completing'].includes(session.status)) {
    return res.status(400).json({ success: false, message: `Cannot start face proctoring in status: ${session.status}` });
  }

  let application = await JobApplication.findOne(
    { applicationId: session.applicationId },
    'applicationId faceEnrollment silentVideoFile video'
  );

  const hasEmbedding = Array.isArray(application?.faceEnrollment?.canonicalEmbedding)
    && application.faceEnrollment.canonicalEmbedding.length > 0;

  if (!hasEmbedding) {
    const relativeVideoPath = application?.silentVideoFile?.filePath || application?.video?.filePath;

    if (application?.faceEnrollment?.status === 'pending' && relativeVideoPath) {
      const cleaned = String(relativeVideoPath).replace(/^[/\\]+/, '');
      const absoluteVideoPath = path.join(__dirname, '..', cleaned);

      if (fs.existsSync(absoluteVideoPath)) {
        faceProctoringService.enrollFaceFromVideo(application.applicationId, absoluteVideoPath)
          .catch((err) => logger.warn(`[FaceProctoring] On-demand enrollment failed: ${err.message}`));
      }
    }

    application = await JobApplication.findOne(
      { applicationId: session.applicationId },
      'applicationId faceEnrollment'
    );

    const embeddingReady = Array.isArray(application?.faceEnrollment?.canonicalEmbedding)
      && application.faceEnrollment.canonicalEmbedding.length > 0;

    if (!embeddingReady) {
      return res.json({
        success: true,
        data: {
          started: false,
          reason: application?.faceEnrollment?.status === 'failed'
            ? 'Face enrollment failed during application — proctoring unavailable'
            : 'Face enrollment not yet complete. Please wait a few seconds and retry.',
        },
      });
    }
  }

  if (faceProctoringService.isSessionActive(sessionId, candidateId)) {
    return res.json({ success: true, data: { started: true, resumed: true } });
  }

  const canonicalEmbedding = application.faceEnrollment.canonicalEmbedding;
  const faceCandidateId = application.faceEnrollment.candidateId || application.applicationId;

  faceProctoringService.connectVerificationWS(
    sessionId,
    faceCandidateId,
    canonicalEmbedding,
    elapsedSeconds,
    { candidateId }
  ).catch((err) => {
    logger.warn(`[FaceProctoring] connectVerificationWS error (session=${sessionId}): ${err.message}`);
  });

  res.json({
    success: true,
    data: {
      started: true,
      candidateId: faceCandidateId,
    },
  });
});

/**
 * POST /api/interview/sessions/:sessionId/face-proctoring/frame
 * Forward a base64 camera frame to unified face analysis WS.
 */
exports.streamFaceFrame = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const candidateId = req.auth?.userId;
  const { image } = req.body || {};

  if (!candidateId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const session = await authorizeVoiceSession(sessionId, candidateId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ success: false, message: 'image base64 is required' });
  }

  const frameResult = faceProctoringService.processFrame(sessionId, image, candidateId);
  if (!frameResult?.forwarded) {
    logger.warn(`[FaceProctoring] Frame not forwarded: session=${sessionId} candidate=${candidateId}`);
  }
  res.json({ success: true, data: frameResult });
});

/**
 * POST /api/interview/sessions/:sessionId/face-proctoring/stop
 * Stop unified face proctoring for this session.
 */
exports.stopFaceProctoring = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const candidateId = req.auth?.userId;

  if (!candidateId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const session = await authorizeVoiceSession(sessionId, candidateId);
  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found' });
  }

  await faceProctoringService.stopVerificationWS(sessionId, candidateId);

  res.json({ success: true, data: { stopped: true } });
});
