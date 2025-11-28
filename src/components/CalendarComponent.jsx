import React from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CalendarComponent = ({ sessions = [] }) => {
  const sessionDates = sessions.map(
    (s) => new Date(s.scheduled_at).toDateString()
  );

  return (
    <div className="mt-8 w-full max-w-lg p-6 bg-gradient-to-r from-primary-200 to-primary shadow-xl rounded-lg">
      <h2 className="text-2xl font-bold text-light flex items-center mb-6">
        📅 Session Tracker
      </h2>

      <div className="bg-white p-4 rounded-lg shadow-lg font-poppins text-dark">
        <Calendar
          className="custom-calendar mx-auto"
          tileClassName={({ date }) =>
            sessionDates.includes(date.toDateString())
              ? "bg-green-300 font-semibold"
              : ""
          }
        />
      </div>

      <div className="text-white mt-4 text-center">
        <p className="text-lg">
          <strong>Total Sessions:</strong> {sessions.length}
        </p>
      </div>
    </div>
  );
};

export default CalendarComponent;
