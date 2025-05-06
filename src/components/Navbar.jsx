import React from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/verbofix-logo.png";

const Navbar = () => {
  return (
    <nav className="w-full fixed top-0 left-0 px-6 bg-light mt-0 z-5">
      {/* Container to hold both logo & nav links in a row */}
      <div className="flex justify-between items-center py-4">
        {/* Logo & Title */}
        <div className="flex items-center ml-2">
          <a href="/"><img src={logo} alt="Logo" className="w-18 h-18 mr-3" /></a>
          <div>
          <a href="/"><h1 className="text-4xl text-dark font-poppins font-extrabold -mb-1 -ml-1">
              VerboFix
            </h1></a>
            <h2 className="text-gray-500 text-lg font-poppins font-semibold">
              Speak Freely
            </h2>
          </div>
        </div>

        {/* Navigation Links - Aligned Right */}
        <div className="flex space-x-6 mr-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-lg font-poppins font-semibold cursor-pointer transition duration-300 ${
                isActive ? "text-primary" : "text-dark hover:text-primary"
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `text-lg font-poppins font-semibold cursor-pointer transition duration-300 ${
                isActive ? "text-primary" : "text-dark hover:text-primary"
              }`
            }
          >
            Login
          </NavLink>
          <NavLink
            to="/signup"
            className={({ isActive }) =>
              `text-lg font-poppins font-semibold cursor-pointer transition duration-300 ${
                isActive ? "text-primary" : "text-dark hover:text-primary"
              }`
            }
          >
            Signup
          </NavLink>
        </div>
      </div>

      {/* Divider Line */}
      <hr className="border-t-2 border-gray-300" />
    </nav>
  );
};

export default Navbar;
