import { Link } from 'react-router-dom';
import { getCurrentUserRole, isAdminOrAuthority, logoutUser, isAuthenticated } from '../services/authService';

export default function Navbar() {
  const userRole = getCurrentUserRole();
  
  const handleLogout = () => {
    logoutUser();
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <nav className="bg-white shadow-md p-4 flex justify-between items-center fixed top-0 left-0 w-full z-50">
      <h1 className="text-2xl font-bold text-blue-600">Municipal Water</h1>
      <ul className="flex space-x-6 text-gray-700 font-medium">
        <li>
          <Link to="/">Dashboard</Link>
        </li>
        {isAdminOrAuthority() && (
          <>
            <li>
              <Link to="/areas">Areas</Link>
            </li>
            <li>
              <Link to="/users">Users</Link>
            </li>
          </>
        )}
        <li>
          <Link to="/households">Households</Link>
        </li>
        <li>
          <Link to="/billing">Billing</Link>
        </li>
        <li>
          <Link to="/alerts">Alerts</Link>
        </li>
        <li>
          <Link to="/settings">Settings</Link>
        </li>
      </ul>
      <div className="flex items-center space-x-4">
        <span className="text-gray-600 capitalize">{userRole}</span>
        <button 
          onClick={handleLogout}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Log out
        </button>
      </div>
    </nav>
  );
}
