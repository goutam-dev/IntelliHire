/**
 * voiceProctoringApi.js
 *
 * Frontend API client for the three voice proctoring HTTP endpoints.
 * All calls are fire-and-forget — errors are swallowed so the interview
 * flow is never interrupted by voice proctoring failures.
 */

import api from '../../lib/api';

const API_BASE = '/interview';

/**
 * Tell the backend to open a WS session with the Python voice service.
 * @param {string} sessionId  IntelliHire interview session ID
 * @param {number} elapsedSeconds  Current elapsed interview time
 */
export async function startVoiceProctoring(sessionId, elapsedSeconds = 0) {
    const response = await api.post(
        `${API_BASE}/sessions/${sessionId}/voice-proctoring/start`,
        { elapsedSeconds }
    );
    return response.data;
}

/**
 * Stream a raw float32 PCM audio chunk to the backend (which forwards to Python WS).
 * @param {string} sessionId
 * @param {ArrayBuffer} pcmChunk  2048 bytes = 512 float32 samples at 16kHz mono
 */
export async function sendAudioChunk(sessionId, pcmChunk) {
    await api.post(
        `${API_BASE}/sessions/${sessionId}/voice-proctoring/chunk`,
        pcmChunk,
        {
            headers: { 'Content-Type': 'application/octet-stream' },
            // Do not JSON-stringify the body
            transformRequest: [(data) => data],
        }
    );
}

/**
 * Stop voice proctoring for a session.
 * @param {string} sessionId
 */
export async function stopVoiceProctoring(sessionId) {
    const response = await api.post(
        `${API_BASE}/sessions/${sessionId}/voice-proctoring/stop`
    );
    return response.data;
}
