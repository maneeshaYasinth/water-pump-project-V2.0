import axios from "axios";

const WATER_API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// optional: attach token automatically
WATER_API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default WATER_API;
