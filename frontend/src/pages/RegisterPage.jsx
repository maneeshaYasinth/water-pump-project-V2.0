import React, { useState } from "react";
import { registerUser } from "../services/api";
import { User, Mail, Lock, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import InputField from "../components/InputField";
import WaterBackground from "../components/WaterBackground";

function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    modelNumber: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser(form);
      alert("Registration successful!");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen">
      <WaterBackground />

      <form
        onSubmit={handleSubmit}
        className="z-10 bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-xl w-80 text-center"
      >
        <h1 className="text-2xl font-semibold text-waterBlue mb-6">
          Register Meter
        </h1>

        <InputField
          icon={User}
          type="text"
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <InputField
          icon={Mail}
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <InputField
          icon={Cpu}
          type="text"
          placeholder="Model Number"
          value={form.modelNumber}
          onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
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
          className="w-full mt-4 bg-waterBlue text-white py-2 rounded-xl font-semibold hover:bg-sky-700 transition"
        >
          Register
        </button>

        <p className="mt-3 text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/" className="text-waterBlue font-semibold">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;
