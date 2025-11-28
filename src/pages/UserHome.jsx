import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import CalendarComponent from "../components/CalendarComponent";
import UserSidebar from "../components/UserSidebar";
import {
  getSpeakersWithStatus,
  createPairing,
  createSession,
  getCurrentSession,
} from "../api/sessions";
import API from "../api/API";
import speakerSelect from "../assets/speaker-select.png"

const UserHome = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userDetails = {
    name: location.state?.userName || "User",
    role: location.state?.role || "User",
  };

  const [pairing, setPairing] = useState(null);
  const [speakers, setSpeakers] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Fetch pairing status and sessions on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [pairingRes, sessionRes] = await Promise.all([
          API.get("/sessions/pairings/"),
          API.get("/sessions/sessions/"),
        ]);

        const pairingData = pairingRes.data.find((p) => p.active);
          setPairing(pairingData || null);
          setSessions(sessionRes.data);

          if (pairingData) {
            const active = sessionRes.data.find((s) => !s.ended_at);
            setActiveSession(active || null);
          } else {
            // ✅ If no pairing exists, show available speakers
            fetchSpeakers();
          }

      } catch (err) {
        console.warn("No active pairing found — showing speaker list.");
        fetchSpeakers();
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // 🔍 Fetch all speakers if no pairing
  const fetchSpeakers = async () => {
    try {
      const data = await getSpeakersWithStatus();
      setSpeakers(data);
    } catch (err) {
      console.error("Error fetching speakers:", err);
    }
  };

  // 🤝 Create new pairing
  const handlePairing = async (speakerId) => {
    try {
      setLoading(true);
      const newPair = await createPairing(speakerId);
      setPairing(newPair);
    } catch (err) {
      console.error("Error creating pairing:", err);
      setError("Could not create pairing. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Create new session
  const handleStartSession = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();
      const newSession = await createSession(now);
      setActiveSession(newSession);
      setSessions((prev) => [...prev, newSession]);
    } catch (err) {
      setError("Could not start session.");
    } finally {
      setLoading(false);
    }
  };

  // 🧩 Habits
  useEffect(() => {
    if (activeSession) {
      setHabits([
        { id: 1, text: "Practice 10 minutes daily", completed: false },
        { id: 2, text: "Speak in front of a mirror", completed: false },
        { id: 3, text: "Try storytelling exercises", completed: false },
      ]);
    } else {
      setHabits([]);
    }
  }, [activeSession]);

  const toggleHabit = (id) =>
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h))
    );

  if (loading && !pairing) {
    return <p className="text-center mt-10 text-gray-600">Loading...</p>;
  }

  return (
    <div className="flex">
      <UserSidebar />
      <div className="flex flex-col flex-1 items-center min-h-screen bg-light font-poppins px-8 py-10">
        <h1 className="text-4xl font-bold text-dark">
          Welcome, <span className="text-primary">{userDetails.name}!</span>
        </h1>

        {/* ✅ If no pairing, show speaker list */}
        {!pairing ? (
          <div className="mt-8 bg-none rounded-lg p-6 w-full max-w-3xl text-center items-center">
            <img
                src={speakerSelect}
                alt="Not assigned"
                className="w-120 opacity-90 mb-6 -mt-12 ml-30"
              />
              <h3 className="text-xl text-dark -mt-2 mb-8">Select a Talkmate of your choice. Please wait if all mates are busy.</h3>
            <h2 className="text-2xl text-dark font-semibold mb-4">Available Speakers</h2>
            <table className="min-w-full border border-gray-400 rounded-xl ml-4">
              <thead>
                <tr className="bg-primary text-center text-light">
                  <th className="p-3 border border-gray-400">Name</th>
                  <th className="p-3 border border-gray-400">Status</th>
                  <th className="p-3 border border-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {speakers.map((sp) => (
                  <tr key={sp.id} className="border-t hover:bg-gray-200 border border-gray-400">
                    <td className="p-3 text-dark font-semibold border border-gray-400">{sp.username}</td>
                    <td className="p-3 border border-gray-400">
                      {sp.status === "free" ? (
                        <span className="text-green-600 font-semibold">
                          Available
                        </span>
                      ) : sp.status === "paired_with_you" ? (
                        <span className="text-blue-600">You’re Paired</span>
                      ) : (
                        <span className="text-red-500">Busy</span>
                      )}
                    </td>
                    <td className="p-3">
                      {sp.status === "free" && (
                        <button
                          onClick={() => handlePairing(sp.id)}
                          className="px-4 py-2 bg-primary text-white rounded hover:bg-dark"
                        >
                          Pair
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            {/* ✅ If paired — show current session UI */}
            <CalendarComponent sessions={sessions} />

            {activeSession ? (
              <div className="mt-8 w-full max-w-lg p-6 bg-white shadow-lg rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">
                  Your Current Session
                </h2>
                <p className="text-gray-800">
                  <strong>Scheduled:</strong>{" "}
                  {new Date(activeSession.scheduled_at).toLocaleString()}
                </p>
                <p className="mt-2 text-gray-800">
                  <strong>Speaker:</strong> {pairing.speaker.username}
                </p>

                <button
                  onClick={() =>
                    navigate(`/session/${activeSession.id}`, {
                      state: { session: activeSession },
                    })
                  }
                  className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Join Session
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartSession}
                disabled={loading}
                className="mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-dark transition"
              >
                {loading ? "Starting..." : "Start New Session"}
              </button>
            )}

            {/* 🧩 Daily Habits */}
            {habits.length > 0 && (
              <div className="mt-8 w-full max-w-lg bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-3">Daily Habits</h3>
                <ul className="space-y-3">
                  {habits.map((habit) => (
                    <li
                      key={habit.id}
                      onClick={() => toggleHabit(habit.id)}
                      className={`flex justify-between p-3 border rounded-lg cursor-pointer ${
                        habit.completed ? "bg-green-200" : "bg-gray-100"
                      }`}
                    >
                      <span
                        className={
                          habit.completed
                            ? "line-through text-gray-500"
                            : "text-dark"
                        }
                      >
                        {habit.text}
                      </span>
                      {habit.completed && (
                        <FaCheckCircle className="text-green-500" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default UserHome;
