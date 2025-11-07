import React from 'react';
import { MapPin, Users, Droplet, AlertTriangle } from 'lucide-react';

const areaData = [
  {
    id: 'A001',
    name: 'Colombo North',
    totalHouseholds: 1250,
    activeConnections: 1200,
    avgConsumption: '2,500',
    alerts: 3,
    status: 'Active'
  },
  {
    id: 'A002',
    name: 'Colombo Central',
    totalHouseholds: 1800,
    activeConnections: 1750,
    avgConsumption: '3,200',
    alerts: 1,
    status: 'Active'
  },
  {
    id: 'A003',
    name: 'Colombo South',
    totalHouseholds: 1500,
    activeConnections: 1480,
    avgConsumption: '2,800',
    alerts: 0,
    status: 'Active'
  },
];

const statsData = [
  {
    title: 'Total Areas',
    value: '3',
    icon: <MapPin className="w-6 h-6 text-blue-600" />
  },
  {
    title: 'Total Households',
    value: '4,550',
    icon: <Users className="w-6 h-6 text-green-600" />
  },
  {
    title: 'Avg. Consumption (m³)',
    value: '8,500',
    icon: <Droplet className="w-6 h-6 text-cyan-600" />
  },
  {
    title: 'Active Alerts',
    value: '4',
    icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />
  }
];

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gray-100 rounded-full">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function AreasPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statsData.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Areas Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Council Areas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Area Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Households</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Active Connections</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Avg. Consumption (m³)</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Alerts</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {areaData.map((area) => (
                <tr key={area.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{area.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{area.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{area.totalHouseholds}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{area.activeConnections}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{area.avgConsumption}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      area.alerts > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {area.alerts}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {area.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}