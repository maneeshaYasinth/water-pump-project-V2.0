import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase"; 
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

// --- MOCK DATA (for parts that are not live yet) ---
const alertsData = [
  { name: "North Ward", pressure: 3.6, status: "issue", issues: 1 },
  { name: "East Ward", pressure: 3.1, status: "ok" },
  { name: "West Ward", pressure: 0.0, status: "issue", issues: 2 },
];

const areasData = [
  { name: "North Ward", flow: 920, consumption: 1342, pressure: 3.6, valve: "Open" },
  { name: "East Ward", flow: 610, consumption: 982, pressure: 3.1, valve: "Open" },
  { name: "West Ward", flow: 0, consumption: 450, pressure: 0.0, valve: "Closed" },
];
// ---------------------------------------------------


export default function Dashboard() {
  // State for your stat cards (the single, latest value)
  const [currentData, setCurrentData] = useState({
    Flow_Rate: 0,
    Pressure: 0,
    // ...other values
  });

  // State for the graph (an array of history)
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const dataRef = ref(db, "Meter_Readings");

    onValue(dataRef, (snapshot) => {
      if (snapshot.exists()) {
        const newData = snapshot.val();
        
        // 1. Update the state for your stat cards
        setCurrentData(newData);

        // 2. Add new reading and filter for last 5 minutes
        setChartData(prevData => {
          const now = Date.now();
          const fiveMinutesInMs = 5 * 60 * 1000;
          const fiveMinutesAgo = now - fiveMinutesInMs;

          const newPoint = {
            timestamp: now, 
            time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            flow: newData.Flow_Rate, 
          };

          const updatedHistory = [...prevData, newPoint];
          const filteredHistory = updatedHistory.filter(
            point => point.timestamp >= fiveMinutesAgo
          );

          return filteredHistory;
        });
      }
    });
  }, []);

  return (
    // You might need to adjust padding-top (pt-24) to match your Navbar height
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
          value={3} 
          subtitle="View" 
          icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
          isAlert={true}
        />
      </div>

      {/* Main Content (Chart/Table on Left, Alerts on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* System Trend Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
              System Trend (Last 5 Minutes)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                <Area type="monotone" dataKey="flow" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFlow)" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Areas at a glance Table */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Map className="w-6 h-6 mr-2 text-blue-600" />
              Areas at a glance
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b-2 border-gray-200">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">Area</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">Flow (L/min)</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">Consumption (m³/mo)</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">Pressure (bar)</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">Bulk Valve</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {areasData.map((area) => (
                    <tr key={area.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-800">{area.name}</td>
                      <td className="py-4 px-4 text-gray-700">{area.flow}</td>
                      <td className="py-4 px-4 text-gray-700">{area.consumption}</td>
                      <td className="py-4 px-4 text-gray-700">{area.pressure}</td>
                      <td className="py-4 px-4 text-gray-700">{area.valve}</td>
                      <td className="py-4 px-4">
                        <button
                          className={`flex items-center justify-center px-4 py-2 rounded-lg text-white font-semibold text-sm ${
                            area.valve === "Open" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {area.valve === "Open" ? (
                            <Power className="w-4 h-4 mr-1.5" />
                          ) : (
                            <Check className="w-4 h-4 mr-1.5" />
                          )}
                          {area.valve === "Open" ? "Cut Off" : "Open Valve"}
                        </button>
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
                    alert.status === 'ok' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  } border`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800">{alert.name}</span>
                    {alert.status === 'ok' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className="flex items-center">
                        <span className="text-xs font-bold text-red-700 mr-2">{alert.issues} issue(s)</span>
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Pressure: {alert.pressure} bar</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Component for Stat Cards (Now with Icon support) ---
function StatCard({ title, value, subtitle, icon, isAlert = false }) {
  return (
    <div className="bg-white p-5 shadow rounded-lg flex items-center space-x-4">
      <div className="flex-shrink-0 p-3 bg-gray-100 rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <h2 className="text-2xl font-bold text-gray-800 my-1">{value}</h2>
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-400">{subtitle}</p>
          {isAlert && (
            <span className="text-xs text-red-500 font-bold bg-red-100 px-2 py-0.5 rounded-full ml-2">View</span>
          )}
        </div>
      </div>
    </div>
  );
}

