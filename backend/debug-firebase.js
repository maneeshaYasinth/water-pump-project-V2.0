const { ref, get } = require("firebase/database");
const db = require("./config/firebase");
require("dotenv").config();

async function debugFirebase() {
  try {
    console.log("\n===== FIREBASE REALTIME DB STRUCTURE =====\n");

    // Check root Meter_Readings
    const rootReadings = await get(ref(db, "Meter_Readings"));
    if (rootReadings.exists()) {
      console.log("Root Meter_Readings:");
      console.log(JSON.stringify(rootReadings.val(), null, 2));
    } else {
      console.log("Root Meter_Readings: NOT FOUND");
    }

    console.log("\n" + "=".repeat(50) + "\n");

    // Check canonical meters structure
    const meters = await get(ref(db, "meters"));
    if (meters.exists()) {
      console.log("Canonical meters structure:");
      const metersData = meters.val();
      for (const serial in metersData) {
        console.log(`\n${serial}:`);
        if (metersData[serial].readings?.current) {
          console.log("  Current reading:", JSON.stringify(metersData[serial].readings.current, null, 4));
        }
        if (metersData[serial].valve?.status) {
          console.log("  Valve:", JSON.stringify(metersData[serial].valve.status, null, 4));
        }
      }
    } else {
      console.log("Canonical meters: NOT FOUND");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugFirebase();
