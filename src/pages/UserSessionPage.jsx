import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/UserSidebar";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaFlag,
  FaClock,
} from "react-icons/fa";
import UserSidebar from "../components/UserSidebar";

const UserSessionPage = () => {
  const [callActive, setCallActive] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (callActive) {
      const timer = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [callActive]);

  const endCall = () => {
    setCallActive(false);

    const sessionData = {
      date: new Date().toLocaleDateString(),
      duration: timeElapsed,
      fluencyScore: "72%",
      clarity: "Moderate",
      recommendation: "Try slower speech pacing exercises.",
    };

    localStorage.setItem("lastSession", JSON.stringify(sessionData));

    setTimeout(() => setReportGenerated(true), 2000);
  };

  return (
    <div className="flex h-screen bg-light text-primary font-poppins font-bold -mt-25 ml-12 w-full">
      <UserSidebar />
      <div className="flex flex-col flex-1 items-center justify-center relative px-6">
        <h1 className="text-4xl font-extrabold mb-6">Live Session</h1>

        {callActive ? (
          <div className="relative w-full max-w-5xl h-[70vh] bg-black rounded-lg overflow-hidden shadow-lg">
            {/* Speaker Video */}
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
              <p className="text-xl text-light">Mentor Video Feed</p>
            </div>

            {/* Small User Video */}
            {videoOn && (
              <div className="absolute bottom-4 right-4 w-40 h-28 bg-gray-500 rounded-lg flex items-center justify-center">
                <p className="text-sm text-light font-poppins">Your Video</p>
              </div>
            )}

            {/* Time & Controls */}
            <div className="absolute bottom-0 w-full flex flex-col items-center">
              <p className="text-lg flex items-center mb-2">
                <FaClock className="mr-2 text-yellow-500" /> {timeElapsed}s
              </p>

              <div className="flex gap-6 bg-gray-800 p-4 rounded-full shadow-md">
                {/* Mute Button */}
                <button
                  className={`p-5 rounded-full ${muted ? "bg-gray-500" : "bg-blue-500"} text-light`}
                  onClick={() => setMuted(!muted)}
                >
                  {muted ? <FaMicrophoneSlash size={32} /> : <FaMicrophone size={32} />}
                </button>

                {/* Video On/Off */}
                <button
                  className={`p-5 rounded-full ${videoOn ? "bg-green-500" : "bg-gray-500"} text-light`}
                  onClick={() => setVideoOn(!videoOn)}
                >
                  {videoOn ? <FaVideo size={32} /> : <FaVideoSlash size={32} />}
                </button>

                {/* Report Issue */}
                <button className="p-5 bg-yellow-600 rounded-full text-light" onClick={() => setShowReportModal(true)}>
                  <FaFlag size={32} />
                </button>

                {/* End Call */}
                <button className="p-5 bg-red-700 rounded-full text-light" onClick={endCall}>
                  <FaPhoneSlash size={32} />
                </button>
              </div>
            </div>
          </div>
        ) : reportGenerated ? (
          <div className="bg-white text-black shadow-lg p-8 rounded-lg w-full max-w-xl">
            <h2 className="text-2xl font-bold">Session Report</h2>
            <p className="text-gray-700 mt-2 text-lg">Speech Clarity: Moderate</p>
            <p className="text-gray-700 text-lg">Fluency Score: 72%</p>
            <p className="text-gray-700 text-lg">Recommendation: Try slower speech pacing exercises.</p>

            {/* Navigation Buttons */}
            <div className="mt-6 flex gap-4">
              <button
                className="px-6 py-3 bg-blue-900 text-light rounded-lg hover:bg-dark"
                onClick={() => navigate("/user-home")}
              >
                Go to Home Page
              </button>
              <button
                className="px-6 py-3 bg-primary text-light rounded-lg hover:bg-dark"
                onClick={() => navigate("/user-home/report")}
              >
                View Full Report
              </button>
            </div>
          </div>
        ) : (
          <p className="text-2xl mt-4">Generating report...</p>
        )}

        {/* Report Issue Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-none bg-opacity-50 flex justify-center items-center">
            <div className="bg-white text-black p-6 rounded-lg w-96 text-center">
              <h2 className="text-2xl font-bold mb-4">Report an Issue</h2>
              <textarea className="w-full p-4 border rounded-md text-lg" placeholder="Describe the issue..." />
              <button
                className="mt-4 bg-red-500 text-white py-3 px-6 rounded-md text-lg"
                onClick={() => setShowReportModal(false)}
              >
                Submit Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSessionPage;
