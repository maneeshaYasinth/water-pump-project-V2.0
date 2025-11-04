import API from "./api.js";

// Get all user meters
export const getUserMeters = () => API.get("/meters/my-meters");

// Get live data for selected meter
export const getMeterData = (serialNumber) =>
  API.get(`/water/${serialNumber || "current"}`);
