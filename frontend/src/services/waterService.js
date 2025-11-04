import WATER_API from "./waterApi"; // the instance above

export const getWaterData = async () => {
  try {
    const res = await WATER_API.get("/readings");
    return res.data;
  } catch (err) {
    console.error("Error fetching water data:", err);
    throw err;
  }
};
