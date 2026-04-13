import api from '../../lib/api';

const API_BASE = '/interview';
const WS_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api')
  .replace(/\/api$/, '')
  .replace(/^http/, 'ws');

export function createFaceStreamSocket() {
  return new WebSocket(`${WS_BASE}/ws`);
}

export function sendFaceStreamAuth(ws, { token, sessionId, elapsedSeconds = 0 }) {
  ws.send(JSON.stringify({
    type: 'face_auth',
    token,
    sessionId,
    elapsedSeconds,
  }));
}

export function sendFaceStreamFrame(ws, { frameId, image }) {
  ws.send(JSON.stringify({
    type: 'face_frame',
    frameId,
    image,
  }));
}

export async function startFaceProctoring(sessionId, elapsedSeconds = 0) {
  const response = await api.post(
    `${API_BASE}/sessions/${sessionId}/face-proctoring/start`,
    { elapsedSeconds }
  );
  return response.data;
}

export async function sendFaceFrame(sessionId, image) {
  const response = await api.post(`${API_BASE}/sessions/${sessionId}/face-proctoring/frame`, { image });
  return response.data;
}

export async function stopFaceProctoring(sessionId) {
  const response = await api.post(`${API_BASE}/sessions/${sessionId}/face-proctoring/stop`);
  return response.data;
}
