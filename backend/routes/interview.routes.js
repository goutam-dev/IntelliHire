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

module.exports = router;
