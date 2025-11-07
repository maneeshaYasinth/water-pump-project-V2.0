import React from 'react';
import { Users, ShieldCheck, UserPlus, Search } from 'lucide-react';

const userData = [
  {
    id: 'U001',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin',
    councilArea: 'Colombo North',
    status: 'Active',
    lastLogin: '2025-11-07 09:30'
  },
  {
    id: 'U002',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'Authority',
    councilArea: 'Colombo Central',
    status: 'Active',
    lastLogin: '2025-11-07 08:45'
  },
  {
    id: 'U003',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    role: 'User',
    councilArea: 'Colombo South',
    status: 'Active',
    lastLogin: '2025-11-06 17:15'
  }
];

const statsData = [
  {
    title: 'Total Users',
    value: '150',
    icon: <Users className="w-6 h-6 text-blue-600" />
  },
  {
    title: 'Admin Users',
    value: '5',
    icon: <ShieldCheck className="w-6 h-6 text-green-600" />
  },
  {
    title: 'New Users (This Week)',
    value: '12',
    icon: <UserPlus className="w-6 h-6 text-purple-600" />
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

function RoleBadge({ role }) {
  const colors = {
    Admin: 'bg-purple-100 text-purple-800',
    Authority: 'bg-blue-100 text-blue-800',
    User: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[role]}`}>
      {role}
    </span>
  );
}

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header with Search and Add User */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        <button className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Add New User
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {statsData.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">System Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Council Area</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userData.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.councilArea}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.lastLogin}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-blue-600 hover:text-blue-900">Edit</button>
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