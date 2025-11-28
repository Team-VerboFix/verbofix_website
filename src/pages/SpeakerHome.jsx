import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // ✅ Added useNavigate
import { FaBell, FaCalendarAlt } from "react-icons/fa";
import CalendarComponent from "../components/CalendarComponent";
import SpeakerSidebar from "../components/SpeakerSidebar";
import API from "../api/API";
import emptyImg from "../assets/no-pairing.png";

const SpeakerHome = () => {
  const location = useLocation();
  const navigate = useNavigate(); // ✅ initialize navigate

  const speakerDetails = {
    name: location.state?.userName || "Speaker",
    role: location.state?.role || "Speaker",
  };

  const [pairing, setPairing] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSessionAlert, setNewSessionAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // ✅ Fetch pairing and sessions initially
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pairRes, sessRes] = await Promise.all([
          API.get("/sessions/pairings/"),
          API.get("/sessions/sessions/"),
        ]);

        const activePair = pairRes.data.find((p) => p.active);
        setPairing(activePair || null);
        setSessions(sessRes.data);
      } catch (err) {
        console.error("Error fetching speaker data:", err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔄 Poll for new unapproved sessions every 10s
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await API.get("/sessions/sessions/");
        const newUnapproved = res.data.filter((s) => !s.approved_by_speaker);
        if (
          newUnapproved.length >
          sessions.filter((s) => !s.approved_by_speaker).length
        ) {
          setNewSessionAlert(true);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);
        }
        setSessions(res.data);
      } catch (err) {
        console.warn("Polling failed:", err);
      }
    }, 10000); // every 10 seconds

    return () => clearInterval(pollInterval);
  }, [sessions]);

  // ✅ Approve session and redirect
  const handleApproveSession = async (sessionId) => {
    try {
      await API.post(`/sessions/sessions/${sessionId}/approve/`);
      // ✅ Backend approved successfully, now redirect to session page
      navigate(`/session/${sessionId}`, {
        state: { role: "speaker" },
      });
    } catch (err) {
      console.error("Error approving session:", err);
      alert("Could not approve session.");
    }
  };

  if (loading) {
    return <p className="text-center mt-10 text-gray-600">Loading...</p>;
  }

  return (
    <div className="flex">
      <SpeakerSidebar />
      <div className="flex flex-col flex-1 items-center min-h-screen bg-light font-poppins px-8 py-10 relative">
        {/* 🔔 Notification Bell */}
        <div className="absolute top-6 right-10">
          <button
            className="relative text-gray-700 hover:text-primary focus:outline-none"
            onClick={() => setNewSessionAlert(false)}
          >
            <FaBell size={28} />
            {newSessionAlert && (
              <span className="absolute top-0 right-0 inline-block w-3 h-3 bg-red-600 rounded-full"></span>
            )}
          </button>
        </div>

        {/* 🎉 Toast Notification */}
        {showToast && (
          <div className="fixed top-6 right-6 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg animate-fade-in-out">
            🔔 New session request received!
          </div>
        )}

        <h1 className="text-4xl font-bold text-dark mt-4">
          Welcome, <span className="text-primary">{speakerDetails.name}!</span>
        </h1>
        <p className="text-lg text-gray-700 mt-2">
          You are logged in as a <strong>{speakerDetails.role}</strong>.
        </p>

        {/* 🧩 Not assigned yet */}
        {!pairing ? (
          <div className="flex flex-col items-center justify-center mt-16">
            <img
              src={emptyImg}
              alt="Not assigned"
              className="w-72 opacity-90 mb-6"
            />
            <p className="text-xl text-gray-700 text-center max-w-md">
              You haven’t been assigned to a user yet. You’ll get notified once
              pairing happens.
            </p>
          </div>
        ) : (
          <>
            <CalendarComponent sessions={sessions} />

            <div className="mt-8 bg-white shadow-lg rounded-lg p-6 w-full max-w-3xl">
              <h2 className="text-2xl font-semibold mb-4 text-dark flex items-center gap-2">
                <FaCalendarAlt /> Active Pairing Details
              </h2>

              <p className="text-gray-800">
                <strong>Paired User:</strong>{" "}
                {pairing.user?.username || "Unknown"}
              </p>
              <p className="text-gray-800 mt-1">
                <strong>Since:</strong>{" "}
                {new Date(pairing.created_at).toLocaleString()}
              </p>

              <div className="mt-6">
                <h3 className="text-xl font-semibold text-dark mb-2">
                  Pending Session Requests
                </h3>
                {sessions.filter((s) => !s.approved_by_speaker).length > 0 ? (
                  sessions
                    .filter((s) => !s.approved_by_speaker)
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center mb-3"
                      >
                        <div>
                          <p>
                            <strong>Requested:</strong>{" "}
                            {new Date(s.scheduled_at).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleApproveSession(s.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                        >
                          Approve & Start
                        </button>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500">
                    No new session requests right now.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default SpeakerHome;
