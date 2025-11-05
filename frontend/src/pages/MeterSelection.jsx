import React, { useEffect, useState } from "react";
import { getUserMeters } from "../services/meterService";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Loader from "../components/Loader";

const MeterSelection = () => {
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMeters = async () => {
      try {
        const res = await getUserMeters();
        setMeters(res.data);
      } catch (err) {
        console.error("❌ Error fetching meters:", err);
        setMeters([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMeters();
  }, []);

  const handleSelect = (serialNumber) => {
    localStorage.setItem("selectedMeter", serialNumber);
    navigate("/water-meter-readings");
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-sky-100 to-blue-200">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="bg-white/80 backdrop-blur-md border border-blue-100 shadow-lg rounded-3xl w-full max-w-2xl p-10 flex flex-col items-center text-gray-800"
      >
        <h1 className="text-3xl font-bold mb-8 tracking-tight text-blue-800">
          💧 Select Your Water Meter
        </h1>

        {meters.length > 0 ? (
          <div className="w-full flex flex-col gap-5">
            {meters.map((meter) => (
              <motion.button
                key={meter._id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 200 }}
                onClick={() => handleSelect(meter.serialNumber)}
                className="w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl px-6 py-5 shadow-sm transition-all duration-300"
              >
                <p className="text-lg font-semibold text-blue-900">{meter.name}</p>
                <p className="text-sm text-blue-700 mt-1">
                  Serial: {meter.serialNumber}
                </p>
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-blue-800 text-center text-lg font-medium bg-blue-50 border border-blue-100 px-6 py-3 rounded-2xl shadow-sm"
          >
            No meters found for this user. Please add one via Postman.
          </motion.p>
        )}
      </motion.div>
    </div>
  );
};

export default MeterSelection;
