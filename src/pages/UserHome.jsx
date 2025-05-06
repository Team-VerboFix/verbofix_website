import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/UserSidebar";
import CalendarComponent from "../components/CalendarComponent";
import { FaCheckCircle } from "react-icons/fa";
import UserSidebar from "../components/UserSidebar";

const UserHome = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const userDetails = {
    name: location.state?.userName || "User",
    role: location.state?.role || "User",
  };

  const [lastSession, setLastSession] = useState(null);
  const [nextSession, setNextSession] = useState(null);
  const [habits, setHabits] = useState([]);

  useEffect(() => {
    const storedSession = JSON.parse(localStorage.getItem("lastSession"));
    
    if (storedSession) {
      setLastSession(new Date(storedSession.date));

      // Set next session 7 days later
      const nextDate = new Date(storedSession.date);
      nextDate.setDate(nextDate.getDate() + 7);
      setNextSession(nextDate);

      // Load habits only after first session
      setHabits([
        { id: 1, text: "Practice 10 min daily", completed: false },
        { id: 2, text: "Speak in front of a mirror", completed: false },
        { id: 3, text: "Try storytelling exercises", completed: false },
      ]);
    }
  }, []);

  const toggleHabit = (id) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) =>
        habit.id === id ? { ...habit, completed: !habit.completed } : habit
      )
    );
  };

  return (
    <div className="flex">
      <UserSidebar />
      <div className="flex flex-col flex-1 items-center min-h-screen bg-light font-poppins px-8 ml-38 py-10">
        <h1 className="text-4xl font-bold text-dark">
          Welcome, <span className="text-primary">{userDetails.name}!</span>
        </h1>
        <p className="text-lg text-gray-700 mt-2">
          You are logged in as a <strong>{userDetails.role}</strong>.
        </p>

        {/* Calendar Component */}
        <CalendarComponent lastSession={lastSession} nextSession={nextSession} />

        {/* Habit Tracker */}
        {lastSession && (
          <div className="mt-8 w-full max-w-lg p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-xl font-semibold text-dark mb-4 flex items-center">
              <FaCheckCircle className="mr-2 text-primary" />
              Daily Habits to Improve
            </h2>
            <ul className="space-y-3">
              {habits.map((habit) => (
                <li
                  key={habit.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer ${
                    habit.completed ? "bg-green-200" : "bg-gray-100"
                  }`}
                  onClick={() => toggleHabit(habit.id)}
                >
                  <span className={habit.completed ? "line-through text-gray-500" : "text-dark"}>
                    {habit.text}
                  </span>
                  {habit.completed && <FaCheckCircle className="text-green-500" />}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Start New Session Button */}
        <button
          className="mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:bg-dark"
          onClick={() => navigate("/user-home/session")}
        >
          Start New Session
        </button>
      </div>
    </div>
  );
};

export default UserHome;
