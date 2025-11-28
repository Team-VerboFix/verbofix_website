import axios from "axios";

// 🧩 Base URL of your Django backend
const API = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

// 🔐 Attach token (if stored in localStorage)
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers["Content-Type"] = "application/json";
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
