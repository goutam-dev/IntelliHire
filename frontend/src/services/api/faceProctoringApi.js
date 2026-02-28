import api from '../../lib/api';

const API_BASE = '/interview';

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
