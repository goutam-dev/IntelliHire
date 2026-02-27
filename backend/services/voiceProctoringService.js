/**
 * voiceProctoringService.js
 *
 * Manages the full lifecycle of voice-based speaker verification during interviews.
 *
 * Responsibilities:
 *  1. enrollSpeaker()       — POST audio to Python /api/enroll at application time
 *  2. connectVerificationWS() — Open WS to Python /ws/verify/{session_id}
 *  3. processAudioChunk()   — Forward a PCM chunk to an active WS session
 *  4. stopVerificationWS()  — Gracefully close WS, flush, persist final stats
 *  5. appendMismatch()      — Atomically persist a mismatch event to MongoDB
 *  6. formatVoiceProctoringReport() — Format the voice section for the final report
 *
 * Architecture:
 *  - activeSessions Map keeps WebSocket instances for ongoing interviews
 *  - Everything is non-fatal: if the Python service is unavailable, enrollment/
 *    verification fails silently and the interview continues normally
 *  - Mismatch audio clips are saved locally to uploads/voice-mismatches/<sessionId>/
 *
 * IMPORTANT: Voice mismatches NEVER terminate or pause the interview.
 */

'use strict';

const WebSocket = require('ws');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const InterviewSession = require('../models/InterviewSession');
const JobApplication = require('../models/JobApplication');
const logger = require('../utils/logger');

// ── Configuration ─────────────────────────────────────────────────────────────
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:8000';
const WS_SERVICE_URL = VOICE_SERVICE_URL.replace(/^http/, 'ws');

const SAMPLE_RATE = 16000;
const VAD_FRAME_SAMPLES = 512; // matches Python config.CHUNK_SAMPLES
const VAD_FRAME_BYTES = VAD_FRAME_SAMPLES * 4; // float32 mono
const FRAME_DURATION_S = VAD_FRAME_SAMPLES / SAMPLE_RATE; // 0.032s
const MIN_CLIP_SECONDS = 2.5;
const MAX_CLIP_SECONDS = 8.0;
const CLIP_PADDING_SECONDS = 0.8;

// In-process map of active WS proctoring sessions.
// Key: IntelliHire sessionId (Mongo ObjectId string)
// Value: { ws, speakerId, mismatchBuffer, cleanup }
const activeSessions = new Map();

// ── Mismatch clip storage ──────────────────────────────────────────────────────
function getMismatchDir(sessionId) {
    return path.join(__dirname, '..', 'uploads', 'voice-mismatches', String(sessionId));
}

/**
 * Save raw float32 PCM audio Buffer as a WAV file.
 * The Python WS server already produces 16kHz mono float32 segments.
 * We write a minimal WAV header so the clip is playable.
 */
function saveClipAsWav(sessionId, audioBuffer, filename) {
    try {
        const dir = getMismatchDir(sessionId);
        fs.mkdirSync(dir, { recursive: true });

        const sampleRate = 16000;
        const numChannels = 1;
        const bitsPerSample = 32; // float32
        const numSamples = audioBuffer.length / 4;
        const dataSize = numSamples * numChannels * (bitsPerSample / 8);
        const headerSize = 44;
        const wav = Buffer.alloc(headerSize + dataSize);

        /* RIFF header */
        wav.write('RIFF', 0);
        wav.writeUInt32LE(36 + dataSize, 4);
        wav.write('WAVE', 8);
        /* fmt  chunk */
        wav.write('fmt ', 12);
        wav.writeUInt32LE(16, 16);             // chunk size
        wav.writeUInt16LE(3, 20);             // PCM float32 = 3
        wav.writeUInt16LE(numChannels, 22);
        wav.writeUInt32LE(sampleRate, 24);
        wav.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
        wav.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
        wav.writeUInt16LE(bitsPerSample, 34);
        /* data chunk */
        wav.write('data', 36);
        wav.writeUInt32LE(dataSize, 40);
        audioBuffer.copy(wav, headerSize);

        const filePath = path.join(dir, filename);
        fs.writeFileSync(filePath, wav);
        return filePath;
    } catch (err) {
        logger.warn(`[VoiceProctoring] Failed to save mismatch clip: ${err.message}`);
        return null;
    }
}

// ── 1. Enrollment ─────────────────────────────────────────────────────────────

/**
 * Enroll a speaker from the extracted application audio WAV.
 * Called fire-and-forget inside applicationService.submitApplication.
 *
 * On success: updates JobApplication.voiceEnrollment with speakerId + embeddingPath
 * On failure: marks status='failed', logs error, does NOT throw (non-fatal).
 *
 * @param {string} applicationId  The application's applicationId string (used as speakerId)
 * @param {string} audioFilePath  Absolute path to the 16kHz mono WAV extracted from the video
 */
async function enrollSpeaker(applicationId, audioFilePath) {
    logger.info(`[VoiceProctoring] Enrolling speaker: applicationId=${applicationId}`);

    // Check audio file exists
    if (!fs.existsSync(audioFilePath)) {
        logger.warn(`[VoiceProctoring] Audio file not found for enrollment: ${audioFilePath}`);
        await JobApplication.findOneAndUpdate(
            { applicationId },
            {
                $set: {
                    'voiceEnrollment.status': 'failed',
                    'voiceEnrollment.errorMessage': 'Audio file not found',
                },
            }
        ).catch(() => { });
        return;
    }

    try {
        const form = new FormData();
        form.append('audio', fs.createReadStream(audioFilePath), {
            filename: `${applicationId}.wav`,
            contentType: 'audio/wav',
        });
        form.append('speaker_id', applicationId);

        const response = await axios.post(`${VOICE_SERVICE_URL}/api/enroll`, form, {
            headers: form.getHeaders(),
            timeout: 120000, // 2 min — model inference can be slow on first load
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        const { speaker_id, embedding_path } = response.data;

        await JobApplication.findOneAndUpdate(
            { applicationId },
            {
                $set: {
                    'voiceEnrollment.speakerId': speaker_id,
                    'voiceEnrollment.embeddingPath': embedding_path,
                    'voiceEnrollment.enrolledAt': new Date(),
                    'voiceEnrollment.status': 'enrolled',
                    'voiceEnrollment.errorMessage': null,
                },
            }
        );

        logger.info(`[VoiceProctoring] Enrollment success: speakerId=${speaker_id}`);
    } catch (err) {
        const msg = err.response?.data?.detail || err.message;
        logger.error(`[VoiceProctoring] Enrollment failed for ${applicationId}: ${msg}`);

        await JobApplication.findOneAndUpdate(
            { applicationId },
            {
                $set: {
                    'voiceEnrollment.status': 'failed',
                    'voiceEnrollment.errorMessage': msg,
                },
            }
        ).catch(() => { });
    }
}

// ── 2. Start WebSocket Verification ──────────────────────────────────────────

/**
 * Connect to the Python WS verification endpoint for a given interview session.
 * The WS connection is kept alive until stopVerificationWS() is called.
 *
 * @param {string} sessionId   IntelliHire session Mongo _id (used as wsSessionId)
 * @param {string} speakerId   Speaker ID from JobApplication.voiceEnrollment.speakerId
 * @param {number} elapsedSeconds  Current interview elapsed time (for mismatch timestamps)
 * @param {{ candidateId?: string }} options
 * @returns {Promise<void>}    Resolves once the WS sends a 'ready' event
 */
async function connectVerificationWS(sessionId, speakerId, elapsedSeconds = 0, options = {}) {
    if (activeSessions.has(String(sessionId))) {
        logger.warn(`[VoiceProctoring] Session ${sessionId} already has an active WS connection`);
        return;
    }

    const wsSessionId = `intellihire_${sessionId}_${Date.now()}`;
    const wsUrl = `${WS_SERVICE_URL}/ws/verify/${wsSessionId}?speaker_id=${encodeURIComponent(speakerId)}`;

    logger.info(`[VoiceProctoring] Connecting WS: ${wsUrl}`);

    // Keep a frame-level circular buffer of recently forwarded 512-sample frames.
    // This mirrors the Python VAD cadence and avoids multi-minute clip bugs.
    const MAX_BUFFER_FRAMES = Math.ceil(MAX_CLIP_SECONDS / FRAME_DURATION_S);
    const recentFrames = [];

    const startTime = Date.now();
    let elapsedAtStart = elapsedSeconds;

    await new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
            logger.info(`[VoiceProctoring] WS open: session=${sessionId}`);
        });

        ws.on('message', async (data) => {
            let event;
            try {
                event = JSON.parse(data.toString());
            } catch {
                return;
            }

            if (event.event === 'ready') {
                logger.info(`[VoiceProctoring] WS ready: session=${sessionId}`);

                // Update InterviewSession with WS session ID and start time
                await InterviewSession.findByIdAndUpdate(sessionId, {
                    $set: {
                        'voiceProctoring.wsSessionId': wsSessionId,
                        'voiceProctoring.speakerId': speakerId,
                        'voiceProctoring.enrollmentStatus': 'enrolled',
                        'voiceProctoring.startedAt': new Date(),
                    },
                }).catch((e) => logger.warn('[VoiceProctoring] DB update error:', e.message));

                resolve();
                return;
            }

            if (event.event === 'error') {
                logger.error(`[VoiceProctoring] WS error from Python: ${event.message}`);
                // Don't reject — let the session proceed without voice proctoring
                resolve();
                return;
            }

            if (event.event === 'result') {
                const { decision, raw_score, smoothed_score, segment_duration, timestamp } = event;

                // Update segment-level counters atomically
                const incFields = { 'voiceProctoring.totalSegmentsAnalyzed': 1 };
                if (decision === 'MATCH') incFields['voiceProctoring.matchCount'] = 1;
                if (decision === 'UNSURE') incFields['voiceProctoring.unsureCount'] = 1;
                if (decision === 'MISMATCH') incFields['voiceProctoring.totalMismatches'] = 1;

                await InterviewSession.findByIdAndUpdate(sessionId, { $inc: incFields }).catch(() => { });

                if (decision === 'MISMATCH') {
                    // Compute wall-clock time and interview-relative timestamp
                    const wallClockTime = new Date();
                    const interviewTimestamp = elapsedAtStart + (timestamp || 0);

                    // Save audio clip from recent PCM buffer
                    const ts = Date.now();
                    const clipFilename = `mismatch_${ts}_score${(raw_score || 0).toFixed(3)}.wav`;
                    let clipPath = null;

                    if (recentFrames.length > 0) {
                        const targetSeconds = Math.max(
                            MIN_CLIP_SECONDS,
                            Math.min(MAX_CLIP_SECONDS, Number(segment_duration || 0) + CLIP_PADDING_SECONDS)
                        );
                        const framesNeeded = Math.max(1, Math.ceil(targetSeconds / FRAME_DURATION_S));
                        const tailFrames = recentFrames.slice(-framesNeeded);

                        // Concatenate recent tail frames into one WAV clip
                        const totalBytes = tailFrames.reduce((sum, b) => sum + b.length, 0);
                        const combined = Buffer.alloc(totalBytes);
                        let offset = 0;
                        for (const frame of tailFrames) {
                            frame.copy(combined, offset);
                            offset += frame.length;
                        }
                        const savedPath = saveClipAsWav(sessionId, combined, clipFilename);
                        if (savedPath) {
                            clipPath = `/uploads/voice-mismatches/${sessionId}/${clipFilename}`;
                        }
                    }

                    // Append mismatch to DB
                    await appendMismatch(sessionId, {
                        timestamp: interviewTimestamp,
                        wallClockTime,
                        rawScore: raw_score,
                        smoothedScore: smoothed_score,
                        segmentDuration: segment_duration,
                        clipPath,
                    });

                    logger.info(
                        `[VoiceProctoring] MISMATCH at ${interviewTimestamp.toFixed(1)}s ` +
                        `(score=${raw_score?.toFixed(3)}, session=${sessionId})`
                    );
                }
            }

            if (event.event === 'session_end') {
                // Persist final summary stats from the Python service
                await InterviewSession.findByIdAndUpdate(sessionId, {
                    $set: {
                        'voiceProctoring.sessionStats': event.stats || null,
                        'voiceProctoring.stoppedAt': new Date(),
                    },
                }).catch(() => { });
                logger.info(`[VoiceProctoring] Session ended: ${sessionId}`, event.stats);
            }
        });

        ws.on('error', (err) => {
            logger.error(`[VoiceProctoring] WS connection error: ${err.message}`);
            // Non-fatal: resolve so the interview is not blocked
            resolve();
        });

        ws.on('close', () => {
            logger.info(`[VoiceProctoring] WS closed: session=${sessionId}`);
            activeSessions.delete(String(sessionId));
        });

        // Store in map so we can forward chunks and stop later
        activeSessions.set(String(sessionId), {
            ws,
            speakerId,
            ownerCandidateId: options?.candidateId ? String(options.candidateId) : null,
            recentFrames,
            maxBufferFrames: MAX_BUFFER_FRAMES,
            startTime,
            elapsedAtStart,
        });

        // Timeout: if WS never sends 'ready' within 15s, resolve anyway
        setTimeout(resolve, 15000);
    });
}

// ── 3. Forward Audio Chunk ────────────────────────────────────────────────────

// Silero VAD in the Python service is designed to process exactly 512 samples
// (2048 bytes at float32) per call — this is CHUNK_SAMPLES in config.py.
// If we send a large 3-second buffer (48000 samples) as ONE WebSocket frame,
// vad.process_chunk() treats the entire 48000-sample blob as a single VAD frame
// and only runs speech detection once — completely wrong.
//
// The fix: split every incoming buffer into 2048-byte (512-sample) frames and
// send each frame as a separate WS binary message, exactly mirroring how
// RealTimeSpeakerVerifier feeds audio from sounddevice's blocksize callback.
function pushRecentFrame(session, frameBuffer) {
    session.recentFrames.push(frameBuffer);
    if (session.recentFrames.length > session.maxBufferFrames) {
        session.recentFrames.shift();
    }
}

/**
 * Forward a raw float32 PCM Buffer to the Python WS.
 * The buffer may contain many seconds of audio (e.g. 3s = 192 000 bytes).
 * Splits into 512-sample (2048-byte) frames and sends each individually
 * so Silero VAD processes them one frame at a time.
 *
 * @param {string} sessionId
 * @param {Buffer} chunkBuffer  Raw float32 PCM bytes (any size)
 * @param {string} [candidateId]
 */
function processAudioChunk(sessionId, chunkBuffer, candidateId) {
    const session = activeSessions.get(String(sessionId));
    if (!session) return false;

    const { ws, ownerCandidateId } = session;
    if (ownerCandidateId && candidateId && ownerCandidateId !== String(candidateId)) {
        return false;
    }
    if (ws.readyState !== WebSocket.OPEN) return false;

    // Split into 512-sample (2048-byte) frames and send each over WS
    let offset = 0;
    while (offset + VAD_FRAME_BYTES <= chunkBuffer.length) {
        const frame = chunkBuffer.slice(offset, offset + VAD_FRAME_BYTES);
        pushRecentFrame(session, Buffer.from(frame));
        ws.send(frame);
        offset += VAD_FRAME_BYTES;
    }

    // If there are leftover bytes (not a full frame), send them padded to 512 samples
    // so VAD never gets an undersized chunk (vad.py pads internally but let's be safe)
    if (offset < chunkBuffer.length) {
        const paddedFrame = Buffer.alloc(VAD_FRAME_BYTES, 0); // zero-pad silence
        chunkBuffer.copy(paddedFrame, 0, offset, chunkBuffer.length);
        pushRecentFrame(session, paddedFrame);
        ws.send(paddedFrame);
    }

    return true;
}

// ── 4. Stop WebSocket Verification ───────────────────────────────────────────

/**
 * Gracefully stop voice proctoring for a session.
 * Sends 'STOP' to the Python service (triggers flush + session_end event),
 * then removes the session from activeSessions.
 *
 * @param {string} sessionId
 * @param {string} [candidateId]
 * @returns {Promise<void>}
 */
async function stopVerificationWS(sessionId, candidateId) {
    const session = activeSessions.get(String(sessionId));
    if (!session) return;

    if (session.ownerCandidateId && candidateId && session.ownerCandidateId !== String(candidateId)) {
        return;
    }

    const { ws } = session;

    return new Promise((resolve) => {
        if (ws.readyState === WebSocket.OPEN) {
            // Wait for session_end event before resolving (or timeout after 10s)
            const timeout = setTimeout(() => {
                ws.terminate();
                activeSessions.delete(String(sessionId));
                resolve();
            }, 10000);

            ws.once('close', () => {
                clearTimeout(timeout);
                activeSessions.delete(String(sessionId));
                resolve();
            });

            ws.send('STOP');
        } else {
            activeSessions.delete(String(sessionId));
            resolve();
        }
    });
}

// ── 5. Persist Mismatch ───────────────────────────────────────────────────────

/**
 * Atomically push a mismatch event into InterviewSession.voiceProctoring.mismatches.
 *
 * @param {string} sessionId
 * @param {{ timestamp, wallClockTime, rawScore, smoothedScore, segmentDuration, clipPath }} mismatch
 */
async function appendMismatch(sessionId, mismatch) {
    await InterviewSession.findByIdAndUpdate(sessionId, {
        $push: {
            'voiceProctoring.mismatches': mismatch,
        },
    });
}

// ── 6. Format Report ──────────────────────────────────────────────────────────

/**
 * Extract the voice proctoring section from an InterviewSession document
 * for inclusion in the final report returned by completeSession.
 *
 * @param {object} session  The InterviewSession mongoose document or plain object
 * @returns {object}
 */
function formatVoiceProctoringReport(session) {
    const vp = session.voiceProctoring || {};

    return {
        enrollmentStatus: vp.enrollmentStatus ?? 'not_enrolled',
        speakerId: vp.speakerId ?? null,
        totalMismatches: vp.totalMismatches ?? 0,
        totalSegmentsAnalyzed: vp.totalSegmentsAnalyzed ?? 0,
        matchCount: vp.matchCount ?? 0,
        unsureCount: vp.unsureCount ?? 0,
        mismatches: (vp.mismatches ?? []).map((m) => ({
            timestamp: m.timestamp,
            wallClockTime: m.wallClockTime,
            rawScore: m.rawScore,
            smoothedScore: m.smoothedScore,
            segmentDuration: m.segmentDuration,
            // Convert local file path to public URL served by express static
            clipUrl: m.clipPath || null,
        })),
        sessionStats: vp.sessionStats ?? null,
        startedAt: vp.startedAt ?? null,
        stoppedAt: vp.stoppedAt ?? null,
    };
}

// ── 7. Exports ────────────────────────────────────────────────────────────────

module.exports = {
    enrollSpeaker,
    connectVerificationWS,
    processAudioChunk,
    stopVerificationWS,
    appendMismatch,
    formatVoiceProctoringReport,
    // Expose for controller health checks
    isSessionActive: (sessionId, candidateId) => {
        const session = activeSessions.get(String(sessionId));
        if (!session) return false;
        if (!candidateId) return true;
        if (!session.ownerCandidateId) return true;
        return session.ownerCandidateId === String(candidateId);
    },
};
