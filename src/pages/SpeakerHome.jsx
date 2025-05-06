import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/UserSidebar";
import { FaUser, FaMapMarkerAlt, FaPhone, FaCalendar, FaUserShield, FaClock } from "react-icons/fa";
import SpeakerSidebar from "../components/SpeakerSidebar";

const SpeakerHome = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const speakerDetails = {
    name: location.state?.userName || "Speaker",
    place: location.state?.place || "Unknown",
    phone: location.state?.phone || "Not Provided",
    age: location.state?.age || "Unknown",
    role: location.state?.role || "Speaker",
  };

  const [lastSession, setLastSession] = useState(null);

  useEffect(() => {
    const storedSession = JSON.parse(localStorage.getItem("lastSession"));
    if (storedSession) {
      setLastSession(storedSession.date);
    }
  }, []);

  return (
    <div className="flex">
      <SpeakerSidebar/>
      <div className="flex flex-col flex-1 items-center min-h-screen bg-light font-poppins px-8 ml-38 py-10">
        <h1 className="text-4xl font-bold text-dark">
          Welcome, <span className="text-primary">{speakerDetails.name}!</span>
        </h1>
        <p className="text-lg text-gray-700 mt-2">
          You are logged in as a <strong>{speakerDetails.role}</strong>.
        </p>

        {/* Last Session Attended */}
        <div className="session-card mt-8 w-full max-w-lg">
          <h2 className="text-xl font-semibold text-dark mb-4 flex items-center">
            <FaClock className="mr-2 text-primary" />
            Last Session Attended
          </h2>
          <p className="text-gray-700"><strong>Date:</strong> {lastSession || "None"}</p>
        </div>

        {/* Button to Start New Session */}
        <button
          className="mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-dark"
          onClick={() => navigate("/speaker-home/session")}
        >
          Start New Session
        </button>
      </div>
    </div>
  );
};

export default SpeakerHome;
