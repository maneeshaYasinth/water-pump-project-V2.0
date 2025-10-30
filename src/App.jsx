import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import HouseholdsPage from './pages/HouseholdsPage';

function App() {
  return (
    <>
      <Navbar />
      <div className="pt-20"> {/* padding-top to prevent navbar overlap */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/households" element={<HouseholdsPage />} />
          {/* add more routes here like /areas, /users, etc */}
        </Routes>
      </div>
    </>
  );
}

export default App;
