/**
 * interview.routes.js
 * 
 * All interview API routes — session lifecycle + Whisper STT.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const interviewController = require('../controllers/interviewController');
const auth = require('../middleware/auth');

// Multer configured for in-memory audio uploads (max 25MB for Whisper)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg',
      'audio/ogg', 'audio/flac', 'audio/x-wav', 'audio/mp3',
      'video/webm', // Chrome records audio in video/webm container
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}`), false);
    }
  },
});

// ── Session Lifecycle ────────────────────────────────────────────────────────
router.post('/sessions', auth, interviewController.createSession);
router.post('/sessions/:sessionId/start', auth, interviewController.startSession);
router.post('/sessions/:sessionId/answer', auth, interviewController.submitAnswer);
router.post('/sessions/:sessionId/complete', auth, interviewController.completeSession);
router.patch('/sessions/:sessionId/time', auth, interviewController.updateTime);
router.get('/sessions/:sessionId', auth, interviewController.getSession);

// ── Whisper STT ──────────────────────────────────────────────────────────────
router.post(
  '/sessions/:sessionId/transcribe',
  auth,
  audioUpload.single('audio'),
  interviewController.transcribeAudio
);

// ── Voice Proctoring ──────────────────────────────────────────────────────────
// Chunk endpoint receives raw float32 PCM from the browser (3s = ~192kb at 16kHz).
// The backend splits each chunk into 512-sample (32ms) frames before forwarding
// to the Python WebSocket — this is what Silero VAD requires.
const rawBody = express.raw({ type: 'application/octet-stream', limit: '256kb' });
router.post('/sessions/:sessionId/voice-proctoring/start', auth, interviewController.startVoiceProctoring);
router.post('/sessions/:sessionId/voice-proctoring/chunk', auth, rawBody, interviewController.streamAudioChunk);
router.post('/sessions/:sessionId/voice-proctoring/stop', auth, interviewController.stopVoiceProctoring);
router.get('/sessions/:sessionId/voice-proctoring/status', auth, interviewController.getVoiceProctoringStatus);

// ── Face Proctoring (Unified face + object analysis) ────────────────────────
router.post('/sessions/:sessionId/face-proctoring/start', auth, interviewController.startFaceProctoring);
router.post('/sessions/:sessionId/face-proctoring/frame', auth, interviewController.streamFaceFrame);
router.post('/sessions/:sessionId/face-proctoring/stop', auth, interviewController.stopFaceProctoring);

module.exports = router;
