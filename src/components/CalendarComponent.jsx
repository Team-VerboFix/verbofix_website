import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Tooltip } from "react-tooltip";

const CalendarComponent = ({ lastSession, nextSession }) => {
  const [hoveredDate, setHoveredDate] = useState(null);

  return (
    <div className="mt-8 w-full max-w-lg p-6 bg-gradient-to-r from-primary-200 to-primary shadow-xl rounded-lg">
      <h2 className="text-2xl font-bold text-light flex items-center mb-6">
        📅 Session Tracker
      </h2>

      {/* Calendar Container */}
      <div className="bg-white p-4 rounded-lg shadow-lg font-poppins text-dark">
        <Calendar
          value={lastSession}
          className="custom-calendar mx-auto"
          tileClassName={({ date }) =>
            date.toDateString() === lastSession?.toDateString()
              ? "session-past"
              : date.toDateString() === nextSession?.toDateString()
              ? "session-next"
              : "default-tile"
          }
          onMouseOver={({ target }) => setHoveredDate(target.innerText)}
          onMouseOut={() => setHoveredDate(null)}
        />
      </div>

      {/* Tooltip for Dates */}
      {hoveredDate && (
        <Tooltip
          id="calendar-tooltip"
          className="bg-dark text-white p-2 rounded-lg shadow-md"
        >
          {hoveredDate === lastSession?.getDate().toString()
            ? "Last Session Date"
            : hoveredDate === nextSession?.getDate().toString()
            ? "Upcoming Session Date"
            : "Regular Date"}
        </Tooltip>
      )}

      {/* Session Details */}
      <div className="text-white mt-4 text-center">
        <p className="text-lg">
          <strong>Last Session:</strong>{" "}
          {lastSession ? lastSession.toDateString() : "None"}
        </p>
        <p className="text-lg">
          <strong>Next Session:</strong>{" "}
          {nextSession ? nextSession.toDateString() : "Not scheduled yet"}
        </p>
      </div>

      {/* Legend Section */}
      <div className="mt-6 flex justify-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-white">Last Session</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span className="text-white">Next Session</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarComponent;