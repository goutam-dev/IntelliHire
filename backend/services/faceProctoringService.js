'use strict';

const axios = require('axios');
const WebSocket = require('ws');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

const InterviewSession = require('../models/InterviewSession');
const JobApplication = require('../models/JobApplication');
const logger = require('../utils/logger');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:8001';
const FACE_WS_URL = FACE_SERVICE_URL.replace(/^http/, 'ws');

const VIDEO_REG_FPS = 2;
const VIDEO_REG_MAX_FRAMES = 60;
const VIDEO_REG_MIN_FRAMES = 5;

const activeSessions = new Map();

function runFfmpeg(configureFn) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    configureFn(cmd);
    cmd.on('end', resolve).on('error', reject).run();
  });
}

function decodeBase64Image(base64Data) {
  if (!base64Data || typeof base64Data !== 'string') return null;
  const payload = base64Data.includes(',') ? base64Data.split(',', 2)[1] : base64Data;
  try {
    return Buffer.from(payload, 'base64');
  } catch {
    return null;
  }
}

function ensureUploadDir(...parts) {
  const dir = path.join(__dirname, '..', 'uploads', ...parts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveBase64Snapshot(base64Data, relativeParts, fileName) {
  const imageBuffer = decodeBase64Image(base64Data);
  if (!imageBuffer) return null;

  const dir = ensureUploadDir(...relativeParts);
  const fullPath = path.join(dir, fileName);
  fs.writeFileSync(fullPath, imageBuffer);

  const urlParts = ['uploads', ...relativeParts, fileName].join('/');
  return `/${urlParts}`;
}

async function extractVideoFramesBase64(videoPath) {
  const tempRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'intellihire-face-reg-'));
  const framePattern = path.join(tempRoot, 'frame-%03d.jpg');

  try {
    await runFfmpeg((cmd) => {
      cmd
        .input(videoPath)
        .outputOptions([
          `-vf fps=${VIDEO_REG_FPS}`,
          `-vframes ${VIDEO_REG_MAX_FRAMES}`,
          '-q:v 3',
        ])
        .output(framePattern);
    });

    const files = (await fs.promises.readdir(tempRoot))
      .filter((name) => name.toLowerCase().endsWith('.jpg'))
      .sort((a, b) => a.localeCompare(b));

    const frames = [];
    for (const fileName of files) {
      const abs = path.join(tempRoot, fileName);
      const buffer = await fs.promises.readFile(abs);
      frames.push(`data:image/jpeg;base64,${buffer.toString('base64')}`);
    }

    return frames;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function enrollFaceFromVideo(applicationId, videoPath) {
  if (!applicationId) return;

  if (!videoPath || !fs.existsSync(videoPath)) {
    await JobApplication.findOneAndUpdate(
      { applicationId },
      {
        $set: {
          'faceEnrollment.status': 'failed',
          'faceEnrollment.errorMessage': 'Video file not found for face enrollment',
        },
      }
    ).catch(() => {});
    return;
  }

  try {
    logger.info(`[FaceProctoring] Enrolling face: applicationId=${applicationId}`);

    const frames = await extractVideoFramesBase64(videoPath);
    if (frames.length < VIDEO_REG_MIN_FRAMES) {
      throw new Error(`Not enough frames for face enrollment (${frames.length}/${VIDEO_REG_MIN_FRAMES})`);
    }

    const response = await axios.post(
      `${FACE_SERVICE_URL}/api/register`,
      {
        candidate_id: applicationId,
        frames,
      },
      {
        timeout: 180000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const data = response.data || {};
    const referenceImagePath = saveBase64Snapshot(
      frames[0],
      ['face-registrations'],
      `${applicationId}-${Date.now()}.jpg`
    );

    await JobApplication.findOneAndUpdate(
      { applicationId },
      {
        $set: {
          'faceEnrollment.candidateId': data.candidate_id || applicationId,
          'faceEnrollment.registrationType': data.registration_type || 'video_canonical',
          'faceEnrollment.canonicalEmbedding': Array.isArray(data.canonical_embedding) ? data.canonical_embedding : [],
          'faceEnrollment.framesUsed': Number(data.frames_used || 0),
          'faceEnrollment.totalFrames': Number(data.total_frames || 0),
          'faceEnrollment.usableFrames': Number(data.usable_frames || 0),
          'faceEnrollment.qualityScore': data.quality_score ?? null,
          'faceEnrollment.embeddingConsistency': data.embedding_consistency ?? null,
          'faceEnrollment.qualityBreakdown': data.quality_breakdown || null,
          'faceEnrollment.referenceImagePath': referenceImagePath,
          'faceEnrollment.enrolledAt': new Date(),
          'faceEnrollment.status': 'enrolled',
          'faceEnrollment.errorMessage': null,
        },
      }
    );

    logger.info(`[FaceProctoring] Enrollment success: applicationId=${applicationId}`);
  } catch (err) {
    const message = err.response?.data?.detail || err.response?.data?.message || err.message;
    logger.error(`[FaceProctoring] Enrollment failed for ${applicationId}: ${message}`);

    await JobApplication.findOneAndUpdate(
      { applicationId },
      {
        $set: {
          'faceEnrollment.status': 'failed',
          'faceEnrollment.errorMessage': message,
        },
      }
    ).catch(() => {});
  }
}

async function appendFaceAlert(sessionId, alert) {
  await InterviewSession.findByIdAndUpdate(sessionId, {
    $push: { 'faceProctoring.faceAlerts': alert },
    $inc: { 'faceProctoring.totalFaceAlerts': 1 },
  }).catch(() => {});
}

async function appendObjectAlert(sessionId, alert) {
  await InterviewSession.findByIdAndUpdate(sessionId, {
    $push: { 'faceProctoring.objectAlerts': alert },
    $inc: { 'faceProctoring.totalObjectAlerts': 1 },
  }).catch(() => {});
}

async function connectVerificationWS(sessionId, candidateId, canonicalEmbedding, elapsedSeconds = 0, options = {}) {
  if (activeSessions.has(String(sessionId))) return;

  if (!Array.isArray(canonicalEmbedding) || canonicalEmbedding.length === 0) {
    throw new Error('Missing canonical embedding for face proctoring');
  }

  const wsUrl = `${FACE_WS_URL}/ws/analyze`;
  const wsSessionId = `intellihire_face_${sessionId}_${Date.now()}`;
  const startedAt = Date.now();
  const elapsedAtStart = Number(elapsedSeconds || 0);

  await new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);

    const resolveOnce = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    let resolved = false;

    ws.on('open', () => {
      const initPayload = {
        candidate_id: candidateId,
        canonical_embedding: canonicalEmbedding,
      };
      ws.send(JSON.stringify(initPayload));
    });

    ws.on('message', async (data) => {
      let event;
      try {
        event = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (event.type === 'connected') {
        await InterviewSession.findByIdAndUpdate(sessionId, {
          $set: {
            'faceProctoring.enrollmentStatus': 'enrolled',
            'faceProctoring.candidateId': candidateId,
            'faceProctoring.startedAt': new Date(),
            'faceProctoring.wsSessionId': wsSessionId,
          },
        }).catch(() => {});
        resolveOnce();
        return;
      }

      if (event.type === 'error') {
        logger.warn(`[FaceProctoring] Python WS error for session=${sessionId}: ${event.message || 'unknown error'}`);
        resolveOnce();
        return;
      }

      if (event.type !== 'analysis') return;

      const elapsed = elapsedAtStart + ((Date.now() - startedAt) / 1000);
      const wallClockTime = new Date();

      const face = event.face || {};
      const object = event.object || {};
      const snapshots = event.snapshots || {};

      if (face.formal_alert_raised) {
        const violationType = face.violation_type || null;
        const status = face.status || null;

        activeSessions.set(String(sessionId), {
          ...activeSessions.get(String(sessionId)),
          latestFaceStatus: status,
          latestFaceViolationType: violationType,
          latestFaceFormalAlert: {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            violationType,
            status,
            similarity: typeof face.similarity === 'number' ? face.similarity : null,
            livenessScore: typeof face.liveness_score === 'number' ? face.liveness_score : null,
            numFaces: typeof face.num_faces === 'number' ? face.num_faces : null,
            timestamp: elapsed,
          },
        });

        const faceSnapshotPath = snapshots.face
          ? saveBase64Snapshot(
              snapshots.face,
              ['face-violations', String(sessionId)],
              `face-${Date.now()}.jpg`
            )
          : null;

        await appendFaceAlert(sessionId, {
          timestamp: elapsed,
          wallClockTime,
          violationType,
          status,
          similarity: typeof face.similarity === 'number' ? face.similarity : null,
          livenessScore: typeof face.liveness_score === 'number' ? face.liveness_score : null,
          numFaces: typeof face.num_faces === 'number' ? face.num_faces : null,
          snapshotPath: faceSnapshotPath,
        });
      } else {
        activeSessions.set(String(sessionId), {
          ...activeSessions.get(String(sessionId)),
          latestFaceStatus: face.status || null,
          latestFaceViolationType: face.violation_type || null,
        });
      }

      if (object.new_alert_fired) {
        const objectAlertTypes = Array.isArray(object.alert_types) ? object.alert_types : [];
        const objectPersonCount = Number(object.person_count || 0);
        const objectSuspiciousObjects = Array.isArray(object.suspicious_objects) ? object.suspicious_objects : [];

        // Track latest object alert so processFrame() can deliver it once to the frontend
        const sessionEntry = activeSessions.get(String(sessionId)) || {};
        activeSessions.set(String(sessionId), {
          ...sessionEntry,
          latestObjectAlert: {
            id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            alertTypes: objectAlertTypes,
            personCount: objectPersonCount,
            suspiciousObjects: objectSuspiciousObjects,
            timestamp: elapsed,
          },
          deliveredObjectAlertIds: sessionEntry.deliveredObjectAlertIds || new Set(),
        });

        const objectSnapshotPath = snapshots.object
          ? saveBase64Snapshot(
              snapshots.object,
              ['object-violations', String(sessionId)],
              `object-${Date.now()}.jpg`
            )
          : null;

        await appendObjectAlert(sessionId, {
          timestamp: elapsed,
          wallClockTime,
          alertTypes: objectAlertTypes,
          personCount: objectPersonCount,
          suspiciousObjects: objectSuspiciousObjects,
          snapshotPath: objectSnapshotPath,
        });
      }
    });

    ws.on('error', (err) => {
      logger.warn(`[FaceProctoring] WS connection error for session=${sessionId}: ${err.message}`);
      resolveOnce();
    });

    ws.on('close', async () => {
      activeSessions.delete(String(sessionId));
      await InterviewSession.findByIdAndUpdate(sessionId, {
        $set: { 'faceProctoring.stoppedAt': new Date() },
      }).catch(() => {});
    });

    activeSessions.set(String(sessionId), {
      ws,
      ownerCandidateId: options?.candidateId ? String(options.candidateId) : null,
      wsSessionId,
      latestFaceStatus: null,
      latestFaceViolationType: null,
      latestFaceFormalAlert: null,
      deliveredFaceFormalAlertIds: new Set(),
    });

    setTimeout(resolveOnce, 15000);
  });
}

function processFrame(sessionId, imageBase64, candidateId) {
  const active = activeSessions.get(String(sessionId));
  if (!active || !imageBase64) {
    return {
      forwarded: false,
      faceSignal: null,
    };
  }

  if (active.ownerCandidateId && candidateId && active.ownerCandidateId !== String(candidateId)) {
    return {
      forwarded: false,
      faceSignal: null,
    };
  }

  const { ws } = active;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return {
      forwarded: false,
      faceSignal: null,
    };
  }

  try {
    ws.send(JSON.stringify({ image: imageBase64 }));

    let faceSignal = null;
    const formalAlert = active.latestFaceFormalAlert;
    if (formalAlert?.id) {
      if (!active.deliveredFaceFormalAlertIds.has(formalAlert.id)) {
        active.deliveredFaceFormalAlertIds.add(formalAlert.id);
        faceSignal = {
          kind: 'formal_face_alert',
          alertId: formalAlert.id,
          violationType: formalAlert.violationType || null,
          status: formalAlert.status || null,
          similarity: formalAlert.similarity,
          livenessScore: formalAlert.livenessScore,
          numFaces: formalAlert.numFaces,
          timestamp: formalAlert.timestamp,
          isNoFace: (formalAlert.violationType || '') === 'no_face' || (formalAlert.status || '') === 'no_face',
        };
      }
    }

    // Deliver object alerts once — same dedup pattern as faceSignal
    let objectSignal = null;
    const objAlert = active.latestObjectAlert;
    if (objAlert?.id) {
      if (!active.deliveredObjectAlertIds) active.deliveredObjectAlertIds = new Set();
      if (!active.deliveredObjectAlertIds.has(objAlert.id)) {
        active.deliveredObjectAlertIds.add(objAlert.id);
        objectSignal = {
          kind: 'object_alert',
          alertId: objAlert.id,
          alertTypes: objAlert.alertTypes || [],
          personCount: objAlert.personCount || 0,
          suspiciousObjects: objAlert.suspiciousObjects || [],
          timestamp: objAlert.timestamp,
        };
      }
    }

    return {
      forwarded: true,
      faceSignal,
      objectSignal,
      latestFaceStatus: active.latestFaceStatus || null,
      latestFaceViolationType: active.latestFaceViolationType || null,
    };
  } catch {
    return {
      forwarded: false,
      faceSignal: null,
      objectSignal: null,
    };
  }
}

async function stopVerificationWS(sessionId, candidateId) {
  const active = activeSessions.get(String(sessionId));
  if (!active) return;

  if (active.ownerCandidateId && candidateId && active.ownerCandidateId !== String(candidateId)) {
    return;
  }

  const { ws } = active;
  if (!ws) {
    activeSessions.delete(String(sessionId));
    return;
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        ws.terminate();
      } catch {}
      resolve();
    }, 10000);

    ws.once('close', () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      else ws.terminate();
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });

  activeSessions.delete(String(sessionId));

  await InterviewSession.findByIdAndUpdate(sessionId, {
    $set: { 'faceProctoring.stoppedAt': new Date() },
  }).catch(() => {});
}

function formatFaceProctoringReport(session) {
  const fp = session.faceProctoring || {};

  return {
    enrollmentStatus: fp.enrollmentStatus || 'not_enrolled',
    candidateId: fp.candidateId || null,
    totalFaceAlerts: fp.totalFaceAlerts || 0,
    totalObjectAlerts: fp.totalObjectAlerts || 0,
    faceAlerts: (fp.faceAlerts || []).map((alert) => ({
      timestamp: alert.timestamp,
      wallClockTime: alert.wallClockTime,
      violationType: alert.violationType,
      status: alert.status,
      similarity: alert.similarity,
      livenessScore: alert.livenessScore,
      numFaces: alert.numFaces,
      snapshotUrl: alert.snapshotPath || null,
    })),
    objectAlerts: (fp.objectAlerts || []).map((alert) => ({
      timestamp: alert.timestamp,
      wallClockTime: alert.wallClockTime,
      alertTypes: alert.alertTypes || [],
      personCount: alert.personCount || 0,
      suspiciousObjects: alert.suspiciousObjects || [],
      snapshotUrl: alert.snapshotPath || null,
    })),
    startedAt: fp.startedAt || null,
    stoppedAt: fp.stoppedAt || null,
  };
}

module.exports = {
  enrollFaceFromVideo,
  connectVerificationWS,
  processFrame,
  stopVerificationWS,
  formatFaceProctoringReport,
  isSessionActive: (sessionId, candidateId) => {
    const active = activeSessions.get(String(sessionId));
    if (!active) return false;
    if (!candidateId) return true;
    if (!active.ownerCandidateId) return true;
    return active.ownerCandidateId === String(candidateId);
  },
};
