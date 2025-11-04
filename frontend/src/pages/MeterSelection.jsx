import React, { useEffect, useState } from "react";
import { getUserMeters } from "../services/meterService";
import { useNavigate } from "react-router-dom";

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-sky-700 animate-pulse">
        Loading your meters...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-300 flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-sky-800 mb-8">
        💧 Select Your Water Meter
      </h1>

      {meters.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {meters.map((meter) => (
            <button
              key={meter._id}
              onClick={() => handleSelect(meter.serialNumber)}
              className="bg-white/80 border border-sky-200 rounded-2xl shadow-lg px-8 py-5 text-sky-800 font-semibold hover:bg-sky-100 hover:shadow-sky-300 transition-all"
            >
              {meter.name}
              <br />
              <span className="text-sm text-sky-600 font-normal">
                {meter.serialNumber}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sky-700 text-lg font-medium">
          No meters found for this user. Please add one from Postman.
        </p>
      )}
    </div>
  );
};

export default MeterSelection;
