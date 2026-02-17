import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import HouseholdsPage from './pages/HouseholdsPage';
import LoginPage from './pages/LoginPage';
import WaterMeterReadings from './pages/WaterMeterReadings';
import ReadingHistory from './pages/ReadingHistory';
import MeterSelection from './pages/MeterSelection';
import AreasPage from './pages/AreasPage';
import UsersPage from './pages/UsersPage';
import BillingPage from './pages/BillingPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';
import { AdminRoute, UserRoute } from './components/ProtectedRoute';
import { isAdminOrAuthority } from './services/authService';

// Layout for admin pages with Navbar
const AdminLayout = () => (
  <>
    <Navbar />
    <div className="pt-20">
      <Outlet />
    </div>
  </>
);


// Layout for regular user pages without Navbar
const UserLayout = () => (
  <div>
    <Outlet />
  </div>
);

function App() {
  return (
    <Routes>
  {/* Public routes */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/" element={<Navigate to={isAdminOrAuthority() ? "/dashboard" : "/meters"} replace />} />

  {/* Admin routes with navbar */}
  <Route element={
    <AdminRoute>
      <AdminLayout />
    </AdminRoute>
  }>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/households" element={<HouseholdsPage />} />
    <Route path="/areas" element={<AreasPage />} />
    <Route path="/users" element={<UsersPage />} />
    <Route path="/billing" element={<BillingPage />} />
    <Route path="/alerts" element={<AlertsPage />} />
    <Route path="/settings" element={<SettingsPage />} />
  </Route>

  {/* Regular user routes without navbar */}
  <Route element={
    <UserRoute>
      <UserLayout />
    </UserRoute>
  }>
    <Route path="/meters" element={<MeterSelection />} />
    <Route path="/water-meter-readings" element={<WaterMeterReadings />} />
    <Route path="/reading-history" element={<ReadingHistory />} />
  </Route>
</Routes>
  );
}

export default App;
