// src/api/sessions.js   (extend your existing file)
import API from "./API";

export const getSpeakersWithStatus = async () => {
  const res = await API.get("/sessions/speakers/with-status/");
  return res.data;
};

export const createPairing = async (speakerId) => {
  const res = await API.post("/sessions/pairings/", { speaker_id: speakerId });
  return res.data;
};

export const createSession = async (scheduledAt) => {
  const response = await API.post("/sessions/sessions/", {
    scheduled_at: scheduledAt,
  });
  return response.data;
};

export const getCurrentSession = async () => {
  const response = await API.get("/sessions/sessions/");
  const sessions = response.data;
  const active = sessions.find((s) => !s.ended_at);
  return active || null;
};

// signaling + upload helpers
export const postOffer = async (sessionId, offer) => {
  const res = await API.post(`/sessions/sessions/${sessionId}/offer/`, { offer });
  return res.data;
};

export const postAnswer = async (sessionId, answer) => {
  const res = await API.post(`/sessions/sessions/${sessionId}/answer/`, { answer });
  return res.data;
};

export const getSignaling = async (sessionId) => {
  const res = await API.get(`/sessions/sessions/${sessionId}/signaling/`);
  return res.data;
};

export const approveSession = async (sessionId) => {
  const res = await API.post(`/sessions/sessions/${sessionId}/approve/`);
  return res.data;
};

export const uploadAudioFile = async (sessionId, file) => {
  const fd = new FormData();
  fd.append("audio", file);
  const res = await API.post(`/sessions/sessions/${sessionId}/upload-audio/`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
