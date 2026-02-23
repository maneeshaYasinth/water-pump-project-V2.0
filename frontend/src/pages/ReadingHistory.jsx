import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { getReadingHistory } from "../services/waterService";
import Loader from "../components/Loader";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const ReadingHistory = () => {
  const navigate = useNavigate();
  const selectedSerialNumber = localStorage.getItem("selectedMeter");

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [usingFallbackData, setUsingFallbackData] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    const fetchHistory = async (isInitial = false) => {
      try {
        if (isInitial) {
          setInitialLoading(true);
        } else {
          setRefreshing(true);
        }
        setError("");

        const payload = await getReadingHistory({
          serialNumber: selectedSerialNumber || undefined,
          limit: 200,
        });

        if (!isSubscribed) return;

        let rows = Array.isArray(payload?.readings) ? payload.readings : [];

        if (!rows.length && selectedSerialNumber) {
          const fallbackPayload = await getReadingHistory({ limit: 200 });
          rows = Array.isArray(fallbackPayload?.readings) ? fallbackPayload.readings : [];
          setUsingFallbackData(rows.length > 0);
        } else {
          setUsingFallbackData(false);
        }

        const normalized = rows
          .map((item) => ({
            timestamp: item.createdAt || item.Last_Updated || item.lastUpdated || item.updatedAt,
            flowRate: toNumber(item.Flow_Rate ?? item.flowRate ?? item.FlowRate),
            pressure: toNumber(item.Pressure ?? item.pressure),
            totalUnits: toNumber(
              item.Total_Units ?? item.totalUnits ?? item.Total_Consumption ?? item.totalConsumption
            ),
            dailyConsumption: toNumber(
              item.Daily_consumption ?? item.Daily_Consumption ?? item.dailyConsumption
            ),
            monthlyUnits: toNumber(item.Monthly_Units ?? item.monthlyUnits),
          }))
          .filter((item) => !!item.timestamp)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (isSubscribed) {
          setHistoryRows(normalized);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err?.response?.data?.message || "Failed to load reading history");
        }
      } finally {
        if (isSubscribed) {
          if (isInitial) {
            setInitialLoading(false);
          } else {
            setRefreshing(false);
          }
        }
      }
    };

    fetchHistory(true);

    const interval = setInterval(() => fetchHistory(false), 10000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedSerialNumber]);

  const latest = historyRows.length ? historyRows[historyRows.length - 1] : null;

  const summaryCards = useMemo(() => {
    if (!latest) {
      return [
        { title: "Flow Rate", value: "--" },
        { title: "Pressure", value: "--" },
        { title: "Total Units", value: "--" },
        { title: "Daily Consumption", value: "--" },
      ];
    }

    return [
      { title: "Flow Rate", value: `${latest.flowRate} L/min` },
      { title: "Pressure", value: `${latest.pressure} bar` },
      { title: "Total Units", value: `${latest.totalUnits} m³` },
      { title: "Daily Consumption", value: `${latest.dailyConsumption} L` },
    ];
  }, [latest]);

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-100 to-sky-300 pt-16">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-sky-800">Reading History</h1>
            {refreshing && (
              <div className="flex items-center gap-2 text-sm text-sky-600">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Updating...</span>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate("/water-meter-readings")}
            className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors"
          >
            Back to Live Readings
          </button>
        </div>

        <p className="text-sky-900 mb-6">
          Meter: <span className="font-semibold">{selectedSerialNumber || "All assigned meters"}</span>
        </p>

        {usingFallbackData && (
          <p className="text-amber-700 mb-4">
            No Mongo history found for selected meter, showing available history from your accessible meters.
          </p>
        )}

        {initialLoading ? (
          <Loader />
        ) : error ? (
          <p className="text-red-600 text-center">{error}</p>
        ) : !historyRows.length ? (
          <p className="text-center text-sky-800">No history data available.</p>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {summaryCards.map((card) => (
                <div key={card.title} className="bg-white/80 border border-sky-200 rounded-xl p-4 shadow-sm">
                  <p className="text-sm text-sky-700">{card.title}</p>
                  <p className="text-xl font-bold text-sky-900 mt-1">{card.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white/80 border border-sky-200 rounded-2xl p-4 mb-6 shadow-sm h-96">
              <h2 className="text-lg font-semibold text-sky-800 mb-3">Flow Rate & Pressure Trend</h2>
              <ResponsiveContainer width="100%" height="88%">
                <LineChart data={historyRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} minTickGap={35} />
                  <YAxis />
                  <Tooltip labelFormatter={(value) => formatTime(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="flowRate"
                    name="Flow Rate"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={historyRows.length <= 1}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="pressure"
                    name="Pressure"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={historyRows.length <= 1}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white/80 border border-sky-200 rounded-2xl p-4 shadow-sm h-96">
              <h2 className="text-lg font-semibold text-sky-800 mb-3">Consumption Overview</h2>
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={historyRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} minTickGap={35} />
                  <YAxis />
                  <Tooltip labelFormatter={(value) => formatTime(value)} />
                  <Legend />
                  <Bar dataKey="dailyConsumption" name="Daily Consumption" fill="#16a34a" isAnimationActive={false} />
                  <Bar dataKey="monthlyUnits" name="Monthly Units" fill="#7c3aed" isAnimationActive={false} />
                  <Bar dataKey="totalUnits" name="Total Units" fill="#0ea5e9" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReadingHistory;
