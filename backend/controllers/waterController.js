const { ref, get } = require("firebase/database");
const db = require("../config/firebase");

exports.getWaterData = async (req, res) => {
  try {
    const snapshot = await get(ref(db, "Meter_Readings"));
    if (snapshot.exists()) {
      res.json(snapshot.val());
    } else {
      res.status(404).json({ message: "No data found" });
    }
  } catch (error) {
    console.error("Error fetching Firebase data:", error);
    res.status(500).json({ error: error.message });
  }
};
