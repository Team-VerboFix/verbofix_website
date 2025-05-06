import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import userLeft from "../assets/user-img1.png";
import userRight from "../assets/user-img-2.png";
import speakerLeft from "../assets/spk-img-1.png";
import speakerRight from "../assets/spk-img-2.png";

const Signup = () => {
  const [name, setName] = useState("");
  const [place, setPlace] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [parentDetails, setParentDetails] = useState("");
  const [proof, setProof] = useState(null);
  const [role, setRole] = useState("User"); // Default role
  const [employed, setEmployed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault();

    if (!name || !place || !phone || !age || !termsAccepted) {
      alert("Please fill all required fields and accept Terms & Conditions.");
      return;
    }

    if (role === "User" && age < 18 && !parentDetails) {
      alert("Parent details are required for users below 18.");
      return;
    }

    if (role === "Speaker" && employed && !proof) {
      alert("Employment proof is required for employed individuals.");
      return;
    }

    navigate(role === "User" ? "/user-home" : "/speaker-home", {
      state: {
        userName: name,
        place: place,
        phone: phone,
        age: age,
        parentDetails: parentDetails,
        role: role,
        employed: employed,
      },
    });
  };

  const leftImage = role === "User" ? userLeft : speakerLeft;
  const rightImage = role === "User" ? userRight : speakerRight;

  return (
    <div className="flex items-center justify-center min-h-screen bg-light relative -top-44">
      <motion.img
        src={leftImage}
        alt="Left Illustration"
        className="absolute -left-28 top-2/3 transform -translate-y-1/2 w-120 h-auto z-0 opacity-90 hidden md:block"
        key={role + "-left"}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      />

      {/* Signup Card */}
      <div className="relative bg-dark bg-opacity-10 backdrop-blur-lg p-12 rounded-xl drop-shadow-md border-2 border-secondaryblue w-108 font-poppins hover:drop-shadow-2xl transition z-4 mt-36">
        <h2 className="text-3xl font-extrabold text-light text-center mb-6">
          Sign Up
        </h2>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-light text-dark border border-primary rounded-md text-lg"
            required
          />

          <input
            type="text"
            placeholder="Enter your place"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            className="w-full px-4 py-3 bg-light text-dark border border-primary rounded-md text-lg"
            required
          />

          <input
            type="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-light text-dark border border-primary rounded-md text-lg"
            required
          />

          <input
            type="number"
            placeholder="Enter your age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-3 bg-light text-dark border border-primary rounded-md text-lg"
            required
          />

          {/* Age-dependent fields for User Role */}
          {role === "User" && age < 18 && (
            <>
              <input
                type="text"
                placeholder="Enter Parent Details"
                value={parentDetails}
                onChange={(e) => setParentDetails(e.target.value)}
                className="w-full px-4 py-3 bg-light text-dark border border-primary rounded-md text-lg"
                required
              />

              <input
                type="file"
                onChange={(e) => setProof(e.target.files[0])}
                className="w-full bg-light text-dark border border-primary rounded-md text-lg"
                required
              />
            </>
          )}

          {/* Employment field for Speaker Role */}
          {role === "Speaker" && (
            <>
              <div className="flex items-center gap-4">
                <label className="text-light font-bold text-lg">Employment:</label>
                <button
                  type="button"
                  className={`px-4 py-2 text-lg font-semibold rounded-md transition ${
                    employed ? "bg-primary text-light" : "bg-gray-500 text-white"
                  }`}
                  onClick={() => setEmployed(!employed)}
                >
                  {employed ? "Employed" : "Unemployed"}
                </button>
              </div>

              {employed && (
                <input
                  type="file"
                  onChange={(e) => setProof(e.target.files[0])}
                  className="w-full bg-light text-dark border border-primary rounded-md text-lg"
                  required
                />
              )}
            </>
          )}

          {/* Role Selector */}
          <div className="flex justify-center items-center gap-4">
            <span
              className={`text-light font-bold text-lg ${
                role === "User" ? "opacity-100" : "opacity-50"
              }`}
            >
              User
            </span>

            <motion.div
              className="relative w-20 h-10 bg-light border border-primary rounded-full flex items-center px-1 cursor-pointer"
              onClick={() => setRole(role === "User" ? "Speaker" : "User")}
              initial={{ scale: 1 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                className="w-7 h-7 bg-primary rounded-full shadow-md"
                animate={{ x: role === "User" ? 0 : 40 }}
                transition={{ type: "spring", stiffness: 300 }}
              />
            </motion.div>

            <span
              className={`text-light font-bold text-lg ${
                role === "Speaker" ? "opacity-100" : "opacity-50"
              }`}
            >
              Speaker
            </span>
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={() => setTermsAccepted(!termsAccepted)}
              className="mr-2"
              required
            />
            <label className="text-light">
              I accept the{" "}
              <a href="/terms" className="text-secondaryblue font-semibold hover:underline">
                Terms & Conditions
              </a>
            </label>
          </div>

          {/* Signup Button */}
          <button
            type="submit"
            className="w-full py-3 rounded-md text-light font-semibold text-lg bg-primary-200 hover:bg-primary transition-all"
          >
            Sign Up
          </button>
        </form>
      </div>

      <motion.img
        src={rightImage}
        alt="Right Illustration"
        className="absolute -right-26 top-2/3 transform -translate-y-1/2 w-120 h-auto z-0 opacity-90 hidden md:block"
        key={role + "-right"}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
};

export default Signup;
