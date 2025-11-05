import React, { useEffect, useState } from "react";
import { getWaterData } from "../services/waterService";
import Loader from "../components/Loader";

const WaterMeterReadings = () => {
  const [data, setData] = useState(null);
  const [prevData, setPrevData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const waterData = await getWaterData();

      // If new data differs, animate update
      setPrevData(data);
      setData(waterData);
      setLoading(false);
    } catch {
      setData(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-300 pt-16">
      <div className="max-w-5xl mx-auto px-4 py-10">
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
