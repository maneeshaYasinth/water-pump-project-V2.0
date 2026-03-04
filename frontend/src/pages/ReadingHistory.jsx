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
import { Download, FileText } from "lucide-react";
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

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const ReadingHistory = () => {
  const navigate = useNavigate();
  const selectedSerialNumber = localStorage.getItem("selectedMeter");

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return toDateInputValue(date);
  });
  const [endDate, setEndDate] = useState(() => toDateInputValue(new Date()));

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
          limit: 5000,
          startDate,
          endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
        });

        if (!isSubscribed) return;

        let rows = Array.isArray(payload?.readings) ? payload.readings : [];

        if (!rows.length && selectedSerialNumber) {
          const fallbackPayload = await getReadingHistory({
            limit: 5000,
            startDate,
            endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
          });
          rows = Array.isArray(fallbackPayload?.readings) ? fallbackPayload.readings : [];
          setUsingFallbackData(rows.length > 0);
        } else {
          setUsingFallbackData(false);
        }

        const normalized = rows
          .map((item) => ({
            timestamp: item.createdAt || item.Last_Updated || item.lastUpdated || item.updatedAt || item.Timestamp || item.timestamp || item.ts,
            serialNumber: item.serialNumber || "--",
            councilArea: item.councilArea || "--",
            flowRate: toNumber(item.Flow_Rate ?? item.flowRate ?? item.FlowRate),
            pressure: toNumber(item.Pressure ?? item.pressure),
            totalM3: toNumber(
              item.rawData?.Total_M3 ??
                item.rawData?.totalM3 ??
                item.Total_M3 ??
                item.totalM3 ??
                item.Total_Units ??
                item.totalUnits ??
                item.Total_Consumption ??
                item.totalConsumption
            ),
            dailyConsumption: toNumber(
              item.Daily_consumption ?? item.Daily_Consumption ?? item.dailyConsumption ?? item.Daily_Liters ?? item.dailyLiters
            ),
            monthlyUnits: toNumber(item.Monthly_Units ?? item.monthlyUnits),
            totalConsumption: toNumber(item.Total_Consumption ?? item.totalConsumption),
            totalUnits: toNumber(item.Total_Units ?? item.totalUnits),
            lastUpdated: item.Last_Updated || item.lastUpdated || item.updatedAt || item.Timestamp || item.timestamp || item.ts || "--",
            createdAt: item.createdAt || "--",
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
  }, [selectedSerialNumber, startDate, endDate]);

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
      { title: "Total M3", value: `${latest.totalM3} m³` },
      { title: "Daily Consumption", value: `${latest.dailyConsumption} L` },
    ];
  }, [latest]);

  const handleDownloadReport = () => {
    if (!historyRows.length) return;

    const rows = [
      [
        "Timestamp",
        "Serial Number",
        "Council Area",
        "Flow Rate (L/min)",
        "Pressure (bar)",
        "Daily Consumption (L)",
        "Monthly Units",
        "Total M3",
        "Total Units",
        "Total Consumption",
        "Last Updated",
        "Created At",
      ],
      ...historyRows.map((row) => [
        formatTime(row.timestamp),
        row.serialNumber,
        row.councilArea,
        row.flowRate,
        row.pressure,
        row.dailyConsumption,
        row.monthlyUnits,
        row.totalM3,
        row.totalUnits,
        row.totalConsumption,
        row.lastUpdated,
        row.createdAt,
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reading-history-report-${startDate || "start"}-to-${endDate || "end"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdfReport = async () => {
    if (!historyRows.length) return;

    try {
      setPdfGenerating(true);
      setPdfError("");
      const jsPdfModule = await import("jspdf");

      const JsPdfConstructor = jsPdfModule?.jsPDF || jsPdfModule?.default;

      if (!JsPdfConstructor || typeof JsPdfConstructor !== "function") {
        throw new Error("PDF library failed to load correctly");
      }

      const doc = new JsPdfConstructor("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (required = 8) => {
        if (y + required > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const drawSeriesChart = ({ title, seriesList }) => {
        const chartHeight = 55;
        const chartWidth = usableWidth;
        const chartLeft = margin;
        const chartTop = y + 4;

        ensureSpace(chartHeight + 16);
        doc.setFontSize(11);
        doc.text(title, margin, y);
        y += 4;

        doc.setDrawColor(220);
        doc.rect(chartLeft, chartTop, chartWidth, chartHeight);

        const pointsCount = historyRows.length;
        if (pointsCount < 2) {
          doc.setFontSize(9);
          doc.text("Not enough points to plot chart", chartLeft + 4, chartTop + 8);
          y += chartHeight + 8;
          return;
        }

        const allValues = seriesList
          .flatMap((series) => historyRows.map((row) => Number(row[series.key])))
          .filter((value) => Number.isFinite(value));

        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        const range = maxValue - minValue || 1;

        const xForIndex = (index) => chartLeft + (index / (pointsCount - 1)) * chartWidth;
        const yForValue = (value) => chartTop + chartHeight - ((value - minValue) / range) * chartHeight;

        seriesList.forEach((series) => {
          doc.setDrawColor(...series.color);
          doc.setLineWidth(0.6);

          for (let index = 1; index < pointsCount; index += 1) {
            const prev = Number(historyRows[index - 1][series.key]);
            const curr = Number(historyRows[index][series.key]);
            if (!Number.isFinite(prev) || !Number.isFinite(curr)) continue;

            doc.line(xForIndex(index - 1), yForValue(prev), xForIndex(index), yForValue(curr));
          }
        });

        let legendX = chartLeft;
        const legendY = chartTop + chartHeight + 4;
        seriesList.forEach((series) => {
          doc.setFillColor(...series.color);
          doc.rect(legendX, legendY - 3, 3, 3, "F");
          doc.setTextColor(40);
          doc.setFontSize(8);
          doc.text(series.label, legendX + 5, legendY);
          legendX += 28;
        });

        y += chartHeight + 10;
      };

      const drawBarChart = ({ title, bars }) => {
        const chartHeight = 55;
        const chartWidth = usableWidth;
        const chartLeft = margin;
        const chartTop = y + 4;

        ensureSpace(chartHeight + 16);
        doc.setFontSize(11);
        doc.text(title, margin, y);
        y += 4;

        doc.setDrawColor(220);
        doc.rect(chartLeft, chartTop, chartWidth, chartHeight);

        const latestPoint = historyRows[historyRows.length - 1] || {};
        const values = bars.map((bar) => Number(latestPoint[bar.key]) || 0);
        const maxValue = Math.max(...values, 1);

        const slotWidth = chartWidth / bars.length;
        bars.forEach((bar, index) => {
          const value = values[index];
          const barHeight = (value / maxValue) * (chartHeight - 8);
          const barX = chartLeft + index * slotWidth + slotWidth * 0.2;
          const barY = chartTop + chartHeight - barHeight;
          const barWidth = slotWidth * 0.6;

          doc.setFillColor(...bar.color);
          doc.rect(barX, barY, barWidth, barHeight, "F");
          doc.setFontSize(7);
          doc.setTextColor(60);
          doc.text(bar.label, barX, chartTop + chartHeight + 4);
        });

        y += chartHeight + 10;
      };

      doc.setFontSize(16);
      doc.text("Water Meter Reading History Report", margin, y);
      y += 7;

      doc.setFontSize(10);
      doc.text(`Meter: ${selectedSerialNumber || "All assigned meters"}`, margin, y);
      y += 5;
      doc.text(`Date Range: ${startDate || "--"} to ${endDate || "--"}`, margin, y);
      y += 5;
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 7;

      if (latest) {
        ensureSpace(18);
        doc.setFontSize(11);
        doc.text("Latest Values", margin, y);
        y += 5;
        doc.setFontSize(10);
        doc.text(`Flow Rate: ${latest.flowRate} L/min`, margin, y);
        y += 4;
        doc.text(`Pressure: ${latest.pressure} bar`, margin, y);
        y += 4;
        doc.text(`Total M3: ${latest.totalM3} m³`, margin, y);
        y += 4;
        doc.text(`Daily Consumption: ${latest.dailyConsumption} L`, margin, y);
        y += 6;
      }

      ensureSpace(8);
      doc.setFontSize(11);
      doc.text("Data Points", margin, y);
      y += 5;

      doc.setFontSize(8);
      for (const row of historyRows) {
        const line = `${formatTime(row.timestamp)} | ${row.serialNumber} | F:${row.flowRate} L/min | P:${row.pressure} bar | D:${row.dailyConsumption} L | M:${row.monthlyUnits} | T:${row.totalM3} m³`;
        const wrappedLines = doc.splitTextToSize(line, usableWidth);
        ensureSpace(wrappedLines.length * 4 + 1);
        doc.text(wrappedLines, margin, y);
        y += wrappedLines.length * 4;
      }

      drawSeriesChart({
        title: "Flow Rate, Pressure & Total M3 Trend",
        seriesList: [
          { key: "flowRate", label: "Flow", color: [2, 132, 199] },
          { key: "pressure", label: "Pressure", color: [249, 115, 22] },
          { key: "totalM3", label: "Total M3", color: [16, 185, 129] },
        ],
      });

      drawBarChart({
        title: "Consumption Overview (latest point)",
        bars: [
          { key: "dailyConsumption", label: "Daily", color: [22, 163, 74] },
          { key: "monthlyUnits", label: "Monthly", color: [124, 58, 237] },
          { key: "totalM3", label: "Total M3", color: [14, 165, 233] },
        ],
      });

      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reading-history-report-${startDate || "start"}-to-${endDate || "end"}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF report:", error);
      setPdfError(error?.message || "Failed to generate PDF report");
    } finally {
      setPdfGenerating(false);
    }
  };

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

        <div className="bg-white/80 border border-sky-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="grid sm:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-sky-800 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-sky-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-sky-800 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-sky-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <button
                onClick={() => {
                  const date = new Date();
                  date.setDate(date.getDate() - 7);
                  setStartDate(toDateInputValue(date));
                  setEndDate(toDateInputValue(new Date()));
                }}
                className="w-full bg-sky-100 text-sky-800 px-4 py-2 rounded-lg hover:bg-sky-200 transition-colors"
              >
                Last 7 Days
              </button>
            </div>
            <div>
              <button
                onClick={handleDownloadReport}
                disabled={!historyRows.length}
                className="w-full inline-flex items-center justify-center bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </button>
            </div>
            <div>
              <button
                onClick={handleDownloadPdfReport}
                disabled={!historyRows.length || pdfGenerating}
                className="w-full inline-flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4 mr-2" />
                {pdfGenerating ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>
          {pdfError && <p className="mt-3 text-sm text-red-600">{pdfError}</p>}
        </div>

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
              <h2 className="text-lg font-semibold text-sky-800 mb-3">Flow Rate, Pressure & Total M3 Trend</h2>
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
                  <Line
                    type="monotone"
                    dataKey="totalM3"
                    name="Total M3"
                    stroke="#10b981"
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
                  <Bar dataKey="totalM3" name="Total M3" fill="#0ea5e9" isAnimationActive={false} />
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
