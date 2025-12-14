// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Ensure Tailwind is imported

// ensure CSRF cookie helper from your API module
import { ensureCsrfCookie } from "./api/API";

async function boot() {
  try {
    // Attempt to make the server set csrftoken cookie (no harm if it fails)
    await ensureCsrfCookie();
  } catch (err) {
    // swallow — we'll still render
    // console.warn("CSRF cookie step failed", err);
  } finally {
    ReactDOM.createRoot(document.getElementById("root")).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

// run boot
boot();
