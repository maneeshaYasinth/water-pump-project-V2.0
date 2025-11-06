import React, { useEffect, useState } from "react";
import { getUserMeters } from "../services/meterService";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Loader from "../components/Loader";
import { isAdminOrAuthority, isAuthority, getUserCouncilArea } from "../services/authService";
import { getCouncilMeters, controlValve } from "../services/waterService";

const MeterSelection = () => {
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [controllingValve, setControllingValve] = useState(null);
  const navigate = useNavigate();

  const userIsAdmin = isAdminOrAuthority();
  const userIsAuthority = isAuthority();
  const councilArea = getUserCouncilArea();

  useEffect(() => {
    const fetchMeters = async () => {
      try {
        let res;
        if (userIsAdmin) {
          // Fetch meters for the council area
          res = await getCouncilMeters(councilArea);
        } else {
          // Fetch user's own meters
          res = await getUserMeters();
        }
        setMeters(res.data);
      } catch (err) {
        console.error("❌ Error fetching meters:", err);
        setError(err.response?.data?.message || "Failed to fetch meters");
        setMeters([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMeters();
  }, [userIsAdmin, councilArea]);

  const handleValveControl = async (meterId, action) => {
    try {
      setControllingValve(meterId);
      await controlValve(meterId, action);
      // Optionally refresh meter data after valve control
      const res = await getCouncilMeters(councilArea);
      setMeters(res.data);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} valve`);
    } finally {
      setControllingValve(null);
    }
  };

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

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {meters.length > 0 ? (
          <div className="w-full flex flex-col gap-5">
            {meters.map((meter) => (
              <motion.div
                key={meter._id}
                className="w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl px-6 py-5 shadow-sm transition-all duration-300 flex justify-between items-center"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => handleSelect(meter.serialNumber)}
                >
                  <p className="text-lg font-semibold text-blue-900">{meter.name}</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Serial: {meter.serialNumber}
                  </p>
                </div>
                
                {userIsAuthority && (
                  <div className="flex gap-2 ml-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleValveControl(meter._id, 'open');
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                      disabled={controllingValve === meter._id}
                    >
                      {controllingValve === meter._id ? 'Processing...' : 'Open Valve'}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleValveControl(meter._id, 'close');
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      disabled={controllingValve === meter._id}
                    >
                      {controllingValve === meter._id ? 'Processing...' : 'Close Valve'}
                    </motion.button>
                  </div>
                )}
              </motion.div>
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
