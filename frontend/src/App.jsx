import { Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import HouseholdsPage from './pages/HouseholdsPage';
import LoginPage from './pages/LoginPage';
import WaterMeterReadings from './pages/WaterMeterReadings';

// Layout for pages with Navbar
const AppLayout = () => (
  <>
    <Navbar />
    <div className="pt-20">
      <Outlet />
    </div>
  </>
);

function App() {
  return (
    <Routes>
      {/* Public / no navbar pages */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/water-meter-readings" element={<WaterMeterReadings />} />

      {/* Protected / pages with navbar */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/households" element={<HouseholdsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
