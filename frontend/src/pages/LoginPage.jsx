import React, { useState } from "react";
import { loginUser } from "../services/authService"; // ✅ use authService
import { Mail, Lock, Droplets } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import InputField from "../components/InputField";
import WaterBackground from "../components/WaterBackground";

function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser(form);
      // ✅ Save token to local storage
      localStorage.setItem("token", res.data.token);

      alert("Login successful!");
      console.log("User logged in:", res.data);

      // ✅ Navigate to meter selection page
      navigate("/select-meter");
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen">
      <WaterBackground />

      <form
        onSubmit={handleSubmit}
        className="z-10 bg-white/80 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-96 text-center"
      >
        <div className="flex justify-center mb-4">
          <Droplets size={45} className="text-sky-500" />
        </div>
        <h1 className="text-3xl font-bold text-sky-600 mb-6">
          SMART H2O
        </h1>

        <InputField
          icon={Mail}
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <InputField
          icon={Lock}
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button
          type="submit"
          className="w-full mt-5 bg-sky-600 text-white py-2 rounded-xl font-semibold hover:bg-sky-700 transition"
        >
          Login
        </button>

        <p className="mt-4 text-sm text-gray-700">
          Don’t have an account?{" "}
          <Link to="/register" className="text-sky-600 font-semibold">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
