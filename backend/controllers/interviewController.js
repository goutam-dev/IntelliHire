/**
 * interviewController.js
 * 
 * Thin controller — delegates all logic to interviewService.
 * Handles request validation, auth checks, and response formatting.
 */

const interviewService = require('../services/interviewService');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

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
