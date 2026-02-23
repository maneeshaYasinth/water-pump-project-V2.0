import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { controlValve, getCouncilMeters, getWaterData } from "../services/waterService";
import { getUserCouncilArea, isAuthority } from "../services/authService";
import { getUserMeters } from "../services/meterService";
import Loader from "../components/Loader";

const WaterMeterReadings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMeterId, setSelectedMeterId] = useState(null);
  const [valveOpen, setValveOpen] = useState(false);
  const [controllingValve, setControllingValve] = useState(false);
  const [valveMessage, setValveMessage] = useState("");
  const navigate = useNavigate();

  const userIsAuthority = isAuthority();
  const councilArea = getUserCouncilArea();

  const selectedSerialNumber = localStorage.getItem("selectedMeter");

  const loadSelectedMeter = async () => {
    if (!selectedSerialNumber) return;

    try {
      const response = userIsAuthority && councilArea
        ? await getCouncilMeters(councilArea)
        : await getUserMeters();

      const meters = Array.isArray(response?.data) ? response.data : [];
      const selectedMeter = meters.find((meter) => meter.serialNumber === selectedSerialNumber);

      if (selectedMeter?._id) {
        setSelectedMeterId(selectedMeter._id);
      }
    } catch (error) {
      console.error("Error loading selected meter for valve control:", error);
    }
  };

  const fetchData = async () => {
    try {
      const waterData = await getWaterData(selectedSerialNumber || undefined);
      setData(waterData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching water data:", error);
      setData(null);
      setLoading(false);
    }
  };

  const handleValveToggle = async () => {
    if (!selectedMeterId) {
      setValveMessage("Select a meter first from meter selection.");
      return;
    }

    const action = valveOpen ? "close" : "open";

    try {
      setControllingValve(true);
      setValveMessage("");
      await controlValve(selectedMeterId, action);
      setValveOpen((prev) => !prev);
      setValveMessage(`Valve ${action}ed successfully.`);
    } catch (error) {
      console.error("Error controlling valve:", error);
      setValveMessage(error?.response?.data?.message || `Failed to ${action} valve.`);
    } finally {
      setControllingValve(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadSelectedMeter();
    const interval = setInterval(fetchData, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-100 to-sky-300 pt-16">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-3 justify-end mb-4">
          <button
            onClick={() => navigate("/reading-history")}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Reading History
          </button>

          <button
            onClick={handleValveToggle}
            disabled={controllingValve || !selectedMeterId}
            className={`px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
              valveOpen ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {controllingValve
              ? "Processing..."
              : valveOpen
              ? "Close Valve"
              : "Open Valve"}
          </button>
        </div>

        {valveMessage && (
          <p className="text-center text-sm font-medium text-sky-900 mb-4">{valveMessage}</p>
        )}

        <h1 className="text-3xl font-bold text-sky-800 text-center mb-10">
          💧 Smart Water Meter Readings
        </h1>

        {loading ? (
          <Loader />
        ) : data ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 transition-all duration-500 ease-in-out">
            <ReadingCard title="Daily Consumption" value={`${data.Daily_consumption} L`} />
            <ReadingCard title="Flow Rate" value={`${data.Flow_Rate} L/min`} />
            <ReadingCard title="Monthly Units" value={`${data.Monthly_Units} m³`} />
            <ReadingCard title="Pressure" value={`${data.Pressure} bar`} />
            <ReadingCard title="Total Units" value={`${data.Total_Units} m³`} />
          </div>
        ) : (
          <p className="text-center text-red-500">Failed to load data</p>
        )}
      </div>
    </div>
  );
};

const ReadingCard = ({ title, value }) => (
  <div className="bg-white/70 backdrop-blur-lg border border-sky-200 shadow-lg rounded-2xl p-6 text-center transform transition duration-700 hover:scale-105 hover:shadow-sky-200">
    <h2 className="text-lg font-semibold text-sky-700">{title}</h2>
    <p className="text-2xl font-bold text-sky-900 mt-2 transition-opacity duration-500 ease-in-out animate-fade-in">
      {value}
    </p>
  </div>
);

export default WaterMeterReadings;
