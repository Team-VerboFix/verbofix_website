import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react"; // 👁️ import icons
import API from "../api/api";

// Import images
import userLeft from "../assets/user-img1.png";
import userRight from "../assets/user-img-2.png";
import speakerLeft from "../assets/spk-img-1.png";
import speakerRight from "../assets/spk-img-2.png";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialRole = location.state?.role || "User";

  const [role, setRole] = useState(initialRole);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👁️ toggle visibility
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await API.post("accounts/login/", {
        username,
        password,
        role,
      });

      const { access, refresh } = res.data;
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);

      const me = await API.get("accounts/me/");
      const userRole = me.data.role;

      if (userRole !== role) {
        setError(
          `This account is registered as a ${userRole}. Please switch to ${userRole} login.`
        );
        localStorage.clear();
        return;
      }

      if (userRole === "Speaker") {
        navigate("/speaker-home", { state: { userName: me.data.username } });
      } else if (userRole === "User") {
        navigate("/user-home", { state: { userName: me.data.username } });
      } else {
        setError("Unknown user role. Contact support.");
      }
    } catch (err) {
      console.error("Login error:", err.response ? err.response.data : err.message);
      setError("Invalid username, password, or role.");
    } finally {
      setLoading(false);
    }
  };

  const leftImage = role === "User" ? userLeft : speakerLeft;
  const rightImage = role === "User" ? userRight : speakerRight;

  return (
    <div className="flex items-center justify-center min-h-screen bg-light relative -top-44">
      {/* Left Image */}
      <motion.img
        src={leftImage}
        alt="Left Illustration"
        className="absolute -left-28 top-2/3 transform -translate-y-1/2 w-120 h-auto z-0 mt-8 opacity-90 hidden md:block"
        key={role + "-left"}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      />

      {/* Login Card */}
      <div className="relative bg-dark bg-opacity-10 backdrop-blur-lg p-12 rounded-xl drop-shadow-md border-2 border-secondaryblue w-108 font-poppins hover:drop-shadow-2xl transition z-4">
        <h2 className="text-3xl font-extrabold text-light text-center mb-6">
          Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-light text-dark placeholder-primary-200 border border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-200 font-semibold text-lg"
          />

          {/* Password with Eye Toggle */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-light text-dark placeholder-primary-200 border border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-200 font-semibold text-lg pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-600 hover:text-primary focus:outline-none"
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          {/* Role Toggle */}
          <div className="flex justify-center items-center gap-4">
            <span
              className={`text-light font-bold transition-all text-lg ${
                role === "User" ? "opacity-100" : "opacity-50"
              }`}
            >
              User
            </span>

            <motion.div
              className="relative w-20 h-10 bg-light border border-primary-200 rounded-full flex items-center px-1 cursor-pointer"
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
              className={`text-light font-bold transition-all text-lg ${
                role === "Speaker" ? "opacity-100" : "opacity-50"
              }`}
            >
              Speaker
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-md text-light font-semibold text-lg bg-primary-200 hover:bg-primary hover:text-light transition-all"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && (
          <p className="text-red-400 text-center mt-3 font-medium">{error}</p>
        )}

        <p className="text-center text-light mt-4">
          Don’t have an account?{" "}
          <a
            href="/signup"
            className="text-secondaryblue font-semibold hover:underline"
          >
            Sign Up
          </a>
        </p>
      </div>

      {/* Right Image */}
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

export default Login;
