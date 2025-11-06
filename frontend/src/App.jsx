import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import HouseholdsPage from './pages/HouseholdsPage';
import LoginPage from './pages/LoginPage';
import WaterMeterReadings from './pages/WaterMeterReadings';
import MeterSelection from './pages/MeterSelection';
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
  </Route>

  {/* Regular user routes without navbar */}
  <Route element={
    <UserRoute>
      <UserLayout />
    </UserRoute>
  }>
    <Route path="/meters" element={<MeterSelection />} />
    <Route path="/water-meter-readings" element={<WaterMeterReadings />} />
  </Route>
</Routes>
  );
}

export default App;
