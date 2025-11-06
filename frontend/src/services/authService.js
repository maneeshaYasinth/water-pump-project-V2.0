import axios from "axios";

// ✅ Base API URL (point this to your backend)
const API = axios.create({
  baseURL: "http://localhost:5000/api/auth",
});

// ✅ Automatically attach token if available
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// ✅ Register user
export const registerUser = (data) => API.post("/register", data);

// ✅ Login user
export const loginUser = (data) => API.post("/login", data);

// Get current user role
export const getCurrentUserRole = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? user.role : null;
};

// Check if user is admin or authority
export const isAdminOrAuthority = () => {
  const role = getCurrentUserRole();
  return role === 'admin' || role === 'authority';
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return !!(token && user);
};

// Logout user
export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// Check if user is authority
export const isAuthority = () => {
  const role = getCurrentUserRole();
  return role === 'authority';
};



// Get user's council area
export const getUserCouncilArea = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? user.councilArea : null;
};
