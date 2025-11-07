import React from 'react';
import { DollarSign, CreditCard, CircleDollarSign, TrendingUp, ChevronDown, Filter } from 'lucide-react';

const billingData = [
  {
    id: 'B001',
    householdId: 'H123',
    meterNo: 'M789',
    customer: 'John Smith',
    amount: 150.00,
    status: 'Paid',
    dueDate: '2025-11-15',
    paidDate: '2025-11-07'
  },
  {
    id: 'B002',
    householdId: 'H124',
    meterNo: 'M790',
    customer: 'Sarah Wilson',
    amount: 175.50,
    status: 'Pending',
    dueDate: '2025-11-20',
    paidDate: null
  },
  {
    id: 'B003',
    householdId: 'H125',
    meterNo: 'M791',
    customer: 'Robert Brown',
    amount: 200.25,
    status: 'Overdue',
    dueDate: '2025-11-01',
    paidDate: null
  }
];

const statsData = [
  {
    title: 'Total Revenue',
    value: '₨ 45,250',
    change: '+12.5%',
    icon: <DollarSign className="w-6 h-6 text-green-600" />
  },
  {
    title: 'Pending Payments',
    value: '₨ 12,800',
    change: '+5.2%',
    icon: <CreditCard className="w-6 h-6 text-yellow-600" />
  },
  {
    title: 'Overdue Amount',
    value: '₨ 8,500',
    change: '-2.4%',
    icon: <CircleDollarSign className="w-6 h-6 text-red-600" />
  },
  {
    title: 'Monthly Growth',
    value: '15.2%',
    change: '+3.1%',
    icon: <TrendingUp className="w-6 h-6 text-blue-600" />
  }
];

function StatCard({ title, value, change, icon }) {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-gray-100 rounded-full">
          {icon}
        </div>
        <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
      </div>
      <h3 className="mt-4 text-2xl font-bold text-gray-900">{value}</h3>
      <p className="text-sm font-medium text-gray-500">{title}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Paid: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    Overdue: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}>
      {status}
    </span>
  );
}

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Billing Management</h1>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Generate Invoices
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
            change={stat.change}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* Billing Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Recent Bills</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Bill ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Household ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Meter No</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Paid Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingData.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bill.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.householdId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.meterNo}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.customer}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ₨ {bill.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={bill.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.dueDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bill.paidDate || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                    <button className="text-blue-600 hover:text-blue-900">Print</button>
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