import React from "react";
import { NavLink } from "react-router-dom";

const SpeakerSidebar = () => {
  return (
    <nav className="h-full w-48 fixed top-0 left-0 px-6 bg-light border-gray-300 border-3 mt-0 z-1">
      <div className="flex flex-col justify-between py-4">
        <ul className="mt-36 space-y-4 text-dark text-lg font-semibold font-poppins">
          <li>
            <NavLink
              to="/speaker-home"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md transition ${
                  isActive ? "bg-primary text-light" : "hover:bg-primary hover:text-light"
                }`
              }
            >
              Speaker Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/speaker-home/session"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md transition ${
                  isActive ? "bg-primary text-light" : "hover:bg-primary hover:text-light"
                }`
              }
            >
              Manage Sessions
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default SpeakerSidebar;
