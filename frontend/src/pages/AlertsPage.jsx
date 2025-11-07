import React from 'react';
import { Bell, AlertTriangle, AlertOctagon, CheckCircle, Info } from 'lucide-react';

const alertsData = [
  {
    id: 'A001',
    type: 'Critical',
    message: 'High water usage detected in Meter M123',
    area: 'Colombo North',
    timestamp: '2025-11-07 10:30',
    status: 'Pending'
  },
  {
    id: 'A002',
    type: 'Warning',
    message: 'Possible leak detected in household H456',
    area: 'Colombo Central',
    timestamp: '2025-11-07 09:45',
    status: 'In Progress'
  },
  {
    id: 'A003',
    type: 'Info',
    message: 'Scheduled maintenance completed for Area B2',
    area: 'Colombo South',
    timestamp: '2025-11-07 08:15',
    status: 'Resolved'
  }
];

const statsData = [
  {
    title: 'Total Alerts',
    value: '24',
    type: 'total',
    icon: <Bell className="w-6 h-6 text-blue-600" />
  },
  {
    title: 'Critical Alerts',
    value: '3',
    type: 'critical',
    icon: <AlertOctagon className="w-6 h-6 text-red-600" />
  },
  {
    title: 'Warnings',
    value: '8',
    type: 'warning',
    icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />
  },
  {
    title: 'Resolved Today',
    value: '12',
    type: 'resolved',
    icon: <CheckCircle className="w-6 h-6 text-green-600" />
  }
];

function StatCard({ title, value, type, icon }) {
  const bgColors = {
    total: 'bg-blue-50',
    critical: 'bg-red-50',
    warning: 'bg-yellow-50',
    resolved: 'bg-green-50'
  };

  return (
    <div className={`p-6 rounded-lg shadow ${bgColors[type]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="p-3 bg-white rounded-full shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

function AlertTypeBadge({ type }) {
  const colors = {
    Critical: 'bg-red-100 text-red-800',
    Warning: 'bg-yellow-100 text-yellow-800',
    Info: 'bg-blue-100 text-blue-800'
  };

  const icons = {
    Critical: <AlertOctagon className="w-4 h-4" />,
    Warning: <AlertTriangle className="w-4 h-4" />,
    Info: <Info className="w-4 h-4" />
  };

  return (
    <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${colors[type]}`}>
      {icons[type]}
      {type}
    </span>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    Resolved: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
      {status}
    </span>
  );
}

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Alert Management</h1>
        <div className="flex gap-4">
          <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Areas</option>
            <option value="north">Colombo North</option>
            <option value="central">Colombo Central</option>
            <option value="south">Colombo South</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {statsData.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            type={stat.type}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Alerts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Alert ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Message</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Area</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {alertsData.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{alert.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <AlertTypeBadge type={alert.type} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{alert.message}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alert.area}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alert.timestamp}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={alert.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                    {alert.status !== 'Resolved' && (
                      <button className="text-green-600 hover:text-green-900">Resolve</button>
                    )}
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