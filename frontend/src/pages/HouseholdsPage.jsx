import { useState } from 'react';
import {
  Search,
  Users,
  FileText,
  CircleDollarSign,
  Droplet,
  ChevronDown,
  Eye,
  Check,
  Power,
} from 'lucide-react';
import { isAuthority } from '../services/authService';

// --- MOCK DATA ---
// TODO: Replace this with data from Firebase

const statCardData = [
  { 
    title: "Total Connections", 
    value: "8", 
    icon: <Users className="w-6 h-6 text-blue-600" /> 
  },
  { 
    title: "Pending Bills", 
    value: "8", 
    icon: <FileText className="w-6 h-6 text-yellow-600" /> 
  },
  { 
    title: "Total Revenue (LKR)", 
    value: "-", 
    icon: <CircleDollarSign className="w-6 h-6 text-green-600" /> 
  },
  { 
    title: "Avg. Consumption (m³)", 
    value: "128.5", 
    icon: <Droplet className="w-6 h-6 text-cyan-600" /> 
  },
];

const householdData = [
  {
    id: "H-1000",
    owner: "S. Perera",
    contactId: "CONH-3000",
    phone: "+94 71 234 5678",
    email: "owner@example.com",
    address: "12, Late Road, City",
    meter: "MTR-50000",
    lateReading: 120,
    currentReading: 125,
    bill: "-",
    status: "Pending",
    actions: ["View", "Restore"],
  },
  {
    id: "H-1001",
    owner: "K. Silva",
    contactId: "CONH-3001",
    phone: "+94 71 234 5678",
    email: "owner@example.com",
    address: "13, Late Road, City",
    meter: "MTR-50001",
    lateReading: 121,
    currentReading: 126,
    bill: "-",
    status: "Pending",
    actions: ["View", "Cut Off"],
  },
  {
    id: "H-1002",
    owner: "N. Fernando",
    contactId: "CONH-3002",
    phone: "+94 71 234 5678",
    email: "owner@example.com",
    address: "14, Late Road, City",
    meter: "MTR-50002",
    lateReading: 122,
    currentReading: 127,
    bill: "-",
    status: "Pending",
    actions: ["View", "Cut Off"],
  },
  {
    id: "H-1003",
    owner: "R. Jayasekara",
    contactId: "CONH-3003",
    phone: "+94 71 234 5678",
    email: "owner@example.com",
    address: "15, Late Road, City",
    meter: "MTR-50003",
    lateReading: 123,
    currentReading: 128,
    bill: "-",
    status: "Pending",
    actions: ["View", "Cut Off"],
  },
];
// --------------------

/**
 * Helper component for the top stat cards
 */
function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 p-3 bg-gray-100 rounded-full">
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

/**
 * Helper component for status tags
 */
function StatusTag({ status }) {
  let classes = "";
  switch (status) {
    case "Pending":
      classes = "bg-yellow-100 text-yellow-800";
      break;
    case "Paid":
      classes = "bg-green-100 text-green-800";
      break;
    default:
      classes = "bg-gray-100 text-gray-800";
  }
  return (
    <span className={`px-3 py-1 text-xs font-medium rounded-full ${classes}`}>
      {status}
    </span>
  );
}

/**
 * Main Households Page Component
 */
function HouseholdsPage() {
  const userIsAuthority = isAuthority();
  
  const handleCutOff = async (meterId) => {
    if (!userIsAuthority) {
      return;
    }
    
    try {
      await fetch(`/api/water/valve-control/${meterId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action: 'close' })
      });
      
      // Refresh data or update UI accordingly
    } catch (error) {
      console.error('Error controlling valve:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-6 ">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        {/* Search Bar */}
        <div className="relative w-full md:w-1/3">
          <input
            type="text"
            placeholder="Search by ID, Owner, or Address..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        
        {/* Status Filter Dropdown */}
        <div className="relative w-full md:w-1/4">
          <select className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Status</option>
            <option>Pending</option>
            <option>Paid</option>
            <option>Cut Off</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statCardData.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
          />
        ))}
      </div>

      {/* Households Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">ID</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Meter</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Owner</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Contact</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Address</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Readings (m³)</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Bill (LKR)</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Billing Status</th>
                <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {householdData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">{row.id}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{row.meter}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{row.owner}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      <div className="flex flex-col">
                        <span className="font-medium">{row.contactId}</span>
                        <span>{row.phone}</span>
                        <span className="text-blue-600">{row.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{row.address}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full self-start">
                          Last month reading: {row.lateReading}
                        </span>
                        <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full self-start">
                          Current reading: {row.currentReading}
                        </span>
                      </div>
                    </td>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900">{row.bill}</td>
                  <td className="py-4 px-4 text-sm">
                    <StatusTag status={row.status} />
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <div className="flex flex-col gap-2">
                      {row.actions.includes("View") && (
                        <button className="flex items-center justify-center gap-1 w-full max-w-[100px] px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      )}
                      {row.actions.includes("Restore") && (
                        <button className="flex items-center justify-center gap-1 w-full max-w-[100px] px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                          <Check className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      )}
                      {row.actions.includes("Cut Off") && userIsAuthority && (
                        <button 
                          onClick={() => handleCutOff(row.meter)}
                          className="flex items-center justify-center gap-1 w-full max-w-[100px] px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <Power className="w-3.5 h-3.5" />
                          Cut Off
                        </button>
                      )}
                    </div>
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

/**
 * Main App component to render the HouseholdsPage.
 * In a real app, this would be part of your routing.
 */
export default function App() {
  // We are rendering HouseholdsPage directly.
  // In your app, you'd have routing to show Dashboard or HouseholdsPage.
  return <HouseholdsPage />;
}
