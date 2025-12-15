import React from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CalendarComponent = ({ sessions = [], onDateClick }) => {
  // map: dateString -> sessions on that date
  const sessionsByDate = sessions.reduce((acc, s) => {
    const key = new Date(s.scheduled_at).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const sessionDates = Object.keys(sessionsByDate);

  const handleDayClick = (date) => {
    const key = date.toDateString();
    const daySessions = sessionsByDate[key];

    if (!daySessions || daySessions.length === 0) return;

    // pick latest session of that day
    const latestSession = daySessions.sort(
      (a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)
    )[0];

    if (onDateClick) {
      onDateClick(latestSession);
    }
  };

  return (
    <div className="mt-8 w-full max-w-lg p-6 bg-gradient-to-r from-primary-200 to-primary shadow-xl rounded-lg">
      <h2 className="text-2xl font-bold text-light flex items-center mb-6">
        📅 Session Tracker
      </h2>

      <div className="bg-white p-4 rounded-lg shadow-lg font-poppins text-dark">
        <Calendar
          className="custom-calendar mx-auto"
          tileClassName={({ date, view }) => {
            if (view !== "month") return "";

            return sessionDates.includes(date.toDateString())
              ? "session-day"
              : "";
          }}

          onClickDay={handleDayClick}
        />
      </div>

      <div className="text-white mt-4 text-center">
        <p className="text-lg">
          <strong>Total Sessions:</strong> {sessions.length}
        </p>
        <p className="text-sm opacity-80 mt-1">
          Click a highlighted date to view the report
        </p>
      </div>
    </div>
  );
};

export default CalendarComponent;
