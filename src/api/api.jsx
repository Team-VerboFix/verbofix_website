// src/api/API.js
import axios from "axios";

// small cookie helper to read cookies
function getCookie(name) {
  const v = `; ${document.cookie}`;
  const parts = v.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

// create axios instance
const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/", // keep as you had it
  withCredentials: true, // IMPORTANT: send cookies (csrftoken, sessionid) to backend
  headers: {
    Accept: "application/json",
  },
});

// attach token + CSRF header automatically
API.interceptors.request.use(
  (config) => {
    // 1) JWT token (if used)
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2) Ensure JSON content-type for json bodies (don't override for multipart)
    if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    // 3) Auto-add CSRF token for unsafe methods
    const method = (config.method || "").toLowerCase();
    const unsafe = method === "post" || method === "put" || method === "patch" || method === "delete";
    if (unsafe) {
      const csrftoken = getCookie("csrftoken");
      if (csrftoken) {
        config.headers["X-CSRFToken"] = csrftoken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Call once after the app starts (or before any POST) to ensure the backend
 * sets the csrftoken cookie. Calls your endpoint: GET /api/csrf/
 *
 * Usage: await ensureCsrfCookie();
 */
export async function ensureCsrfCookie() {
  try {
    // This endpoint should be implemented server-side (ensure_csrf) and return 200
    await API.get("csrf/");
  } catch (err) {
    // best-effort only; don't crash if it fails
    // console.warn("ensureCsrfCookie failed:", err);
  }
}

export default API;
