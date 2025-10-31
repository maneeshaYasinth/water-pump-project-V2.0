import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import HouseholdsPage from './pages/HouseholdsPage';
import LoginPage from './pages/LoginPage';

/**
 * 1. Create a new "Layout" component.
 * This component will render the Navbar and an <Outlet />.
 * The <Outlet /> is a placeholder where React Router will
 * render the child routes (like Dashboard or HouseholdsPage).
 */
const AppLayout = () => {
  return (
    <>
      <Navbar />
      <div className="pt-20">
        <Outlet /> 
      </div>
    </>
  );
}

function App() {
  return (
    <Routes>
      {/* 2. Create routes that should NOT have the Navbar.
           Now, visiting '/' or '/login' will *only* show the LoginPage. */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* 3. Create a parent route that USES the AppLayout.
           Any route nested inside this one will be rendered
           inside the AppLayout's <Outlet />, so they will all
           have the Navbar. */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/households" element={<HouseholdsPage />} />
      </Route>

    </Routes>
  );
}

export default App;