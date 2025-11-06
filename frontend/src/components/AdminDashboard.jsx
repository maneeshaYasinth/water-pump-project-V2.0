import React, { useState, useEffect } from 'react';
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { isAuthority } from "../services/authService";
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
  AlertTriangle,
  TrendingUp,
  Map,
  Power,
} from "lucide-react";

const AdminDashboard = ({ councilArea }) => {
  const [meters, setMeters] = useState([]);
  const [stats, setStats] = useState({
    totalFlow: 0,
    totalConsumption: 0,
    alertCount: 0,
    activeMeters: 0
  });
  const [chartData, setChartData] = useState([]);
  const userIsAuthority = isAuthority();

  useEffect(() => {
    if (councilArea) {
      // Subscribe to meters in the council area
      const metersRef = ref(db, `Meter_Readings/${councilArea}`);
      const unsubscribe = onValue(metersRef, (snapshot) => {
        if (snapshot.exists()) {
          const metersData = snapshot.val();
          const metersList = Object.entries(metersData).map(([id, data]) => ({
            id,
            ...data
          }));

          setMeters(metersList);

          // Calculate statistics
          const stats = metersList.reduce((acc, meter) => ({
            totalFlow: acc.totalFlow + (meter.Flow_Rate || 0),
            totalConsumption: acc.totalConsumption + (meter.Total_Consumption || 0),
            alertCount: acc.alertCount + (meter.Alert_Count || 0),
            activeMeters: acc.activeMeters + (meter.isActive ? 1 : 0)
          }), {
            totalFlow: 0,
            totalConsumption: 0,
            alertCount: 0,
            activeMeters: 0
          });

          setStats(stats);
        }
      });

      return () => unsubscribe();
    }
  }, [councilArea]);

  const handleValveControl = async (meterId, action) => {
    if (!userIsAuthority) return;
    
    try {
      await fetch(`/api/water/valve-control/${meterId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action })
      });
    } catch (error) {
      console.error('Error controlling valve:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Droplet className="w-10 h-10 text-blue-500" />
            <div className="ml-4">
              <p className="text-gray-500">Total Flow Rate</p>
              <p className="text-2xl font-bold">{stats.totalFlow.toFixed(2)} L/min</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Power className="w-10 h-10 text-green-500" />
            <div className="ml-4">
              <p className="text-gray-500">Active Meters</p>
              <p className="text-2xl font-bold">{stats.activeMeters}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <AlertTriangle className="w-10 h-10 text-yellow-500" />
            <div className="ml-4">
              <p className="text-gray-500">Active Alerts</p>
              <p className="text-2xl font-bold">{stats.alertCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Map className="w-10 h-10 text-purple-500" />
            <div className="ml-4">
              <p className="text-gray-500">Total Consumption</p>
              <p className="text-2xl font-bold">{stats.totalConsumption.toFixed(2)} m³</p>
            </div>
          </div>
        </div>
      </div>

      {/* Meters Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Council Area Meters</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meter ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flow Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pressure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                {userIsAuthority && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {meters.map((meter) => (
                <tr key={meter.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{meter.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {meter.Flow_Rate?.toFixed(2) || 0} L/min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {meter.Pressure?.toFixed(2) || 0} bar
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      meter.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {meter.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {userIsAuthority && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleValveControl(meter.id, 'open')}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleValveControl(meter.id, 'close')}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Close
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;