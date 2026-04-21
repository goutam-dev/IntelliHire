/**
 * interviewApi.js
 * 
 * Frontend service for the interview backend API.
 * All interview logic (LLM, STT, evaluation) happens server-side.
 * This layer only makes HTTP calls and handles retries.
 */

import api from '../../lib/api';

const BASE = '/interview';

/**
 * Create a new interview session.
 * Returns { sessionId, status, jobTitle, config } or { sessionId, status, resumed: true }
 */
export async function createSession(applicationId) {
  const res = await api.post(`${BASE}/sessions`, { applicationId });
  return res.data.data;
}

/**
 * Start the interview — gets the first question from the backend.
 * Returns { sessionId, question, turnIndex, phase }
 */
export async function startSession(sessionId) {
  const res = await api.post(`${BASE}/sessions/${sessionId}/start`);
  return res.data.data;
}

/**
 * Submit a text answer and receive { evaluation, nextQuestion, shouldEnd, turnIndex, interviewState }
 */
export async function submitAnswer(sessionId, { answerText, turnIndex, answerDurationMs }) {
  const res = await api.post(`${BASE}/sessions/${sessionId}/answer`, {
    answerText,
    turnIndex,
    answerDurationMs,
  });
  return res.data.data;
}

/**
 * Transcribe audio via Whisper on the backend.
 * @param {string} sessionId
 * @param {Blob} audioBlob - Audio blob (webm/wav)
 * @returns {{ text: string, duration: number }}
 */
export async function transcribeAudio(sessionId, audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const res = await api.post(`${BASE}/sessions/${sessionId}/transcribe`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return res.data.data;
}

/**
 * Complete the interview and get the full summary.
 */
export async function completeSession(
  sessionId,
  { cheatingEvents = [], totalCheatingScore = 0, terminationReason = '', completionContext = {} } = {}
) {
  const res = await api.post(`${BASE}/sessions/${sessionId}/complete`, {
    cheatingEvents,
    totalCheatingScore,
    terminationReason,
    completionContext,
  });
  return res.data.data;
}

/**
 * Heartbeat — update the elapsed time on the server.
 */
export async function updateSessionTime(sessionId, elapsedSeconds) {
  await api.patch(`${BASE}/sessions/${sessionId}/time`, { elapsedSeconds });
}

/**
 * Get current session state (for reconnection).
 */
export async function getSession(sessionId) {
  const res = await api.get(`${BASE}/sessions/${sessionId}`);
  return res.data.data;
}

export default {
  createSession,
  startSession,
  submitAnswer,
  transcribeAudio,
  completeSession,
  updateSessionTime,
  getSession,
};
