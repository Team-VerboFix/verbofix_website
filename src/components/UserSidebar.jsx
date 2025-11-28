import React from "react";
import { NavLink } from "react-router-dom";

const UserSidebar = () => {
  return (
    <nav className="h-full w-48 fixed top-0 left-0 px-6 bg-light border-gray-300 border-3 mt-0 z-1">
      <div className="flex flex-col justify-between py-4">
        <ul className="mt-36 space-y-4 text-dark text-lg font-semibold font-poppins">
          <li>
            <NavLink
              to="/user-home"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md transition ${
                  isActive ? "bg-primary text-light" : "hover:bg-primary hover:text-light"
                }`
              }
            >
              Portal Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/user-home/session"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md transition ${
                  isActive ? "bg-primary text-light" : "hover:bg-primary hover:text-light"
                }`
              }
            >
              Attend Session
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/user-home/report"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md transition ${
                  isActive ? "bg-primary text-light" : "hover:bg-primary hover:text-light"
                }`
              }
            >
              Report
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/user-home/stammer-analysis"
              className={({ isActive }) =>
                `block px-4 py-2 rounded-md transition ${
                  isActive ? "bg-primary text-light" : "hover:bg-primary hover:text-light"
                }`
              }
            >
              Stammer Analysis
            </NavLink>
          </li>
        </ul>
      </div>
      
    </nav>
  );
};

export default UserSidebar;