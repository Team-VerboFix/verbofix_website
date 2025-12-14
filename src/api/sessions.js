// src/api/sessions.js
import API, { ensureCsrfCookie } from "./API";

// GET helpers (no leading slash)
export const getSpeakersWithStatus = async () => {
  const res = await API.get("sessions/speakers/with-status/");
  return res.data;
};

export const createPairing = async (speakerId) => {
  // ensure csrf cookie (best-effort)
  await ensureCsrfCookie();
  const res = await API.post("sessions/pairings/", { speaker_id: speakerId });
  return res.data;
};

export const createSession = async (scheduledAt) => {
  await ensureCsrfCookie();
  const response = await API.post("sessions/sessions/", {
    scheduled_at: scheduledAt,
  });
  return response.data;
};

export const getCurrentSession = async () => {
  const response = await API.get("sessions/sessions/");
  const sessions = response.data;
  const active = sessions.find((s) => !s.ended_at);
  return active || null;
};

// signaling + upload helpers
export const postOffer = async (sessionId, offer) => {
  await ensureCsrfCookie();
  const res = await API.post(`sessions/sessions/${sessionId}/offer/`, { offer });
  return res.data;
};

export const postAnswer = async (sessionId, answer) => {
  await ensureCsrfCookie();
  const res = await API.post(`sessions/sessions/${sessionId}/answer/`, { answer });
  return res.data;
};

export const getSignaling = async (sessionId) => {
  const res = await API.get(`sessions/sessions/${sessionId}/signaling/`);
  return res.data;
};

export const approveSession = async (sessionId) => {
  // ensure CSRF cookie so X-CSRFToken header is attached
  await ensureCsrfCookie();
  const res = await API.post(`sessions/sessions/${sessionId}/approve/`);
  return res.data;
};

export const endSession = async (sessionId) => {
  // ensure CSRF cookie / headers already handled by your API instance
  const res = await API.post(`sessions/sessions/${sessionId}/end/`);
  return res.data;
};

export async function uploadAudioFile(sessionId, blob) {
  await ensureCsrfCookie();
  const fd = new FormData();
  fd.append("audio", blob, "session_audio.webm"); // browser webm typical

  // let axios figure Content-Type/boundary
  return API.post(`sessions/sessions/${sessionId}/upload-audio/`, fd, {
    timeout: 120000,
    // withCredentials already configured on API instance
  });
}
