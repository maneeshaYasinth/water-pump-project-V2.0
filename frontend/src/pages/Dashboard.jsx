import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { isAdminOrAuthority, getUserCouncilArea } from "../services/authService";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Droplet,
  CircleDollarSign,
  Home,
  AlertTriangle,
  TrendingUp,
  Map,
  CheckCircle2,
  XCircle,
  Power,
  Check,
} from "lucide-react";

// ────────────────────────────────
// Admin-specific valve control
// ────────────────────────────────
const AdminControls = ({ meter, isAuthority }) => {
  const [isLoading, setIsLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));
  const isActualAuthority = user?.role === "authority"; // Check if user is an authority

  const handleValveControl = async (meterId, action) => {
    if (!isActualAuthority) return; // Extra security check
    try {
      setIsLoading(true);
      await fetch(`/api/water/valve-control/${meterId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ action }),
      });
    } catch (error) {
      console.error("Error controlling valve:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // View-only status for non-authority users (including admin)
  if (!isActualAuthority) {
    // If the user is an admin, hide valve-related info entirely (view only removed)
    if (user?.role === "admin") return null;

    // For regular users (non-admin, non-authority) show a minimal status indicator
    return (
      <div className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              meter.valve_status ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <p className="text-sm text-gray-600">
            <span className="font-medium">{meter.valve_status ? "Open" : "Closed"}</span>
          </p>
        </div>
      </div>
    );
  }

  // Control panel for authority users only
  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex rounded-lg overflow-hidden border border-gray-200">
        <button
          onClick={() => handleValveControl(meter.id, "open")}
          disabled={isLoading || meter.valve_status}
          className={`px-4 py-2 flex items-center justify-center text-sm font-medium ${
            meter.valve_status
              ? "bg-green-50 text-green-700 cursor-not-allowed"
              : "bg-white text-green-600 hover:bg-green-50 hover:text-green-700"
          } border-r border-gray-200 transition-colors`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Power className="w-4 h-4 mr-1.5" />
              Open Valve
            </>
          )}
        </button>
        <button
          onClick={() => handleValveControl(meter.id, "close")}
          disabled={isLoading || !meter.valve_status}
          className={`px-4 py-2 flex items-center justify-center text-sm font-medium ${
            !meter.valve_status
              ? "bg-red-50 text-red-700 cursor-not-allowed"
              : "bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
          } transition-colors`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Power className="w-4 h-4 mr-1.5" />
              Close Valve
            </>
          )}
        </button>
      </div>
      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
        Authority Access Granted
      </div>
    </div>
  );
};

// ────────────────────────────────
// Dashboard component
// ────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const userIsAdmin = isAdminOrAuthority();
  const councilArea = getUserCouncilArea();

  // ─── State ────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [currentData, setCurrentData] = useState({
    Flow_Rate: 0,
    Pressure: 0,
    Total_Consumption: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [councilMeters, setCouncilMeters] = useState([]);
  const [areasData, setAreasData] = useState([]);
  const [alertsData, setAlertsData] = useState([]);

  // ─── Mock data for visuals ────────────────
  const mockStats = {
    totalUsers: 150,
    activeMeters: 89,
    totalRevenue: 45250,
    alerts: 12,
  };

  // ─── Redirect if not logged in ────────────
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) navigate("/login");
  }, [navigate]);

  // ─── Firebase listener for both admin and user ────────────
  useEffect(() => {
    if (!councilArea && userIsAdmin) {
      setLoading(false);
      return;
    }

    const metersRef = userIsAdmin
      ? ref(db, `Meter_Readings/${councilArea}`)
      : ref(db, "Meter_Readings");

    const unsubscribe = onValue(
      metersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          if (userIsAdmin) {
            const formattedMeters = Object.entries(data).map(([id, val]) => ({
              id,
              ...val,
            }));
            setCouncilMeters(formattedMeters);
          } else {
            setCurrentData(data);

            // Chart update (keep last 5 min)
            const now = Date.now();
            const newPoint = {
              timestamp: now,
              time: new Date(now).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              flow: data.Flow_Rate,
            };

            setChartData((prev) => {
              const updated = [...prev, newPoint];
              return updated.filter((p) => p.timestamp >= now - 5 * 60 * 1000);
            });
          }
        } else {
          // no firebase data yet
          setCouncilMeters([]);
        }

        // Fallback mock data
        setAreasData([
          {
            name: "Downtown",
            flow: 220,
            consumption: 184,
            pressure: 3.1,
            valve: "Open",
          },
          {
            name: "Hilltop",
            flow: 195,
            consumption: 176,
            pressure: 2.9,
            valve: "Closed",
          },
          {
            name: "Lakeside",
            flow: 240,
            consumption: 198,
            pressure: 3.3,
            valve: "Open",
          },
          {
            name: "Greenfield",
            flow: 180,
            consumption: 162,
            pressure: 2.7,
            valve: "Open",
          },
        ]);

        setAlertsData([
          {
            name: "Downtown Zone",
            status: "ok",
            pressure: 3.1,
          },
          {
            name: "Hilltop Zone",
            status: "critical",
            issues: 2,
            pressure: 1.8,
          },
          {
            name: "Lakeside Zone",
            status: "warning",
            issues: 1,
            pressure: 2.2,
          },
          {
            name: "Greenfield Zone",
            status: "ok",
            pressure: 3.0,
          },
        ]);

        // mock admin meters
        setCouncilMeters([
          {
            id: "MTR001",
            Flow_Rate: 210,
            Pressure: 3.2,
            Total_Consumption: 11890,
            valve_status: true,
          },
          {
            id: "MTR002",
            Flow_Rate: 185,
            Pressure: 2.9,
            Total_Consumption: 9745,
            valve_status: false,
          },
          {
            id: "MTR003",
            Flow_Rate: 230,
            Pressure: 3.5,
            Total_Consumption: 10230,
            valve_status: true,
          },
        ]);

        setLoading(false);
      },
      (error) => {
        console.error("Error fetching meter data:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userIsAdmin, councilArea]);

  // ─── Loading Spinner ────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ─── Admin / Authority Dashboard ────────────
  if (userIsAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Council Overview
          </h2>
          <p className="text-gray-600">
            {councilArea || "Please select a council area"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {councilMeters.map((meter) => (
            <div
              key={meter.id}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Meter {meter.id}
                    </h3>
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        meter.valve_status 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {meter.valve_status ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">Flow Rate</p>
                      <p className="text-xl font-semibold text-blue-900">
                        {meter.Flow_Rate || 0}
                        <span className="text-sm text-blue-600 ml-1">L/min</span>
                      </p>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">Pressure</p>
                      <p className="text-xl font-semibold text-purple-900">
                        {meter.Pressure || 0}
                        <span className="text-sm text-purple-600 ml-1">bar</span>
                      </p>
                    </div>
                    
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-emerald-600 font-medium">Total</p>
                      <p className="text-xl font-semibold text-emerald-900">
                        {meter.Total_Consumption || 0}
                        <span className="text-sm text-emerald-600 ml-1">L</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <span className="text-sm text-gray-500">Valve Control</span>
                  <AdminControls meter={meter} isAuthority={userIsAdmin} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Regular User Dashboard ────────────
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Flow (L/min)"
          value={currentData.Flow_Rate}
          subtitle="Across all zones"
          icon={<Droplet className="w-8 h-8 text-blue-500" />}
        />
        <StatCard
          title="Outstanding (LKR)"
          value="1.25M"
          subtitle="Billing backlog"
          icon={<CircleDollarSign className="w-8 h-8 text-green-500" />}
        />
        <StatCard
          title="Active Connections"
          value="3,482"
          subtitle="+12 this week"
          icon={<Home className="w-8 h-8 text-indigo-500" />}
        />
        <StatCard
          title="Alerts"
          value={mockStats.alerts}
          subtitle="View"
          icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
          isAlert={true}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
              System Trend (Last 5 Minutes)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="flow"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorFlow)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3b82f6" }}
                  activeDot={{
                    r: 6,
                    stroke: "white",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Areas at a glance */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Map className="w-6 h-6 mr-2 text-blue-600" />
              Areas at a glance
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b-2 border-gray-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">
                      Area
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">
                      Flow (L/min)
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">
                      Consumption (m³/mo)
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">
                      Pressure (bar)
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">
                      Bulk Valve
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {areasData.map((area) => (
                    <tr
                      key={area.name}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4 font-medium text-gray-800">
                        {area.name}
                      </td>
                      <td className="py-4 px-4 text-gray-700">{area.flow}</td>
                      <td className="py-4 px-4 text-gray-700">
                        {area.consumption}
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {area.pressure}
                      </td>
                      <td className="py-4 px-4 text-gray-700">{area.valve}</td>
                      <td className="py-4 px-4">
                        {JSON.parse(localStorage.getItem("user"))?.role === "authority" ? (
                          <button
                            className={`flex items-center justify-center px-4 py-2 rounded-lg text-white font-semibold text-sm ${
                              area.valve === "Open"
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {area.valve === "Open" ? (
                              <Power className="w-4 h-4 mr-1.5" />
                            ) : (
                              <Check className="w-4 h-4 mr-1.5" />
                            )}
                            {area.valve === "Open" ? "Cut Off" : "Open Valve"}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              area.valve === "Open" ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <span className="text-sm text-gray-600">
                              {area.valve}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              View Only
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-red-500" />
              Alerts
            </h3>
            <div className="flex flex-col gap-4">
              {alertsData.map((alert) => (
                <div
                  key={alert.name}
                  className={`p-4 rounded-lg ${
                    alert.status === "ok"
                      ? "bg-green-50 border-green-200"
                      : alert.status === "warning"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-red-50 border-red-200"
                  } border`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800">
                      {alert.name}
                    </span>
                    {alert.status === "ok" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="flex items-center">
                        <span className="text-xs font-bold text-red-700 mr-2">
                          {alert.issues} issue(s)
                        </span>
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Pressure: {alert.pressure} bar
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Component ────────────
function StatCard({ title, value, subtitle, icon, isAlert = false }) {
  return (
    <div className="bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl">
      <div className="flex items-start space-x-4">
        <div className="shrink-0 p-3 bg-blue-50 rounded-xl">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <h2 className="text-2xl font-bold text-gray-900 my-1">{value}</h2>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{subtitle}</p>
            {isAlert && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                View
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
