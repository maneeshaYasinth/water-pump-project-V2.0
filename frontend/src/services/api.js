import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/auth",
});

// Register new user
export const registerUser = (data) => API.post("/register", data);

// Login user
export const loginUser = (data) => API.post("/login", data);

// Optionally, you can add token-based endpoints like:
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;
