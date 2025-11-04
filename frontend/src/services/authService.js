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
