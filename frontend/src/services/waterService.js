import WATER_API from "./waterApi";

export const getWaterData = async () => {
  try {
    const res = await WATER_API.get("/readings");
    return res.data;
  } catch (err) {
    console.error("Error fetching water data:", err);
    throw err;
  }
};

export const getCouncilMeters = async (councilArea) => {
  try {
    const res = await WATER_API.get(`/council-meters/${councilArea}`);
    return res.data;
  } catch (err) {
    console.error("Error fetching council meters:", err);
    throw err;
  }
};

export const controlValve = async (meterId, action) => {
  try {
    const res = await WATER_API.post(`/valve-control/${meterId}`, { action });
    return res.data;
  } catch (err) {
    console.error("Error controlling valve:", err);
    throw err;
  }
};
