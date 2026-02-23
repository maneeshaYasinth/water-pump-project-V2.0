const { ref, update } = require("firebase/database");
const db = require("./config/firebase");
require("dotenv").config();

async function triggerSync() {
  try {
    console.log("Updating Firebase root Meter_Readings timestamp to trigger sync...\n");

    // Update the timestamp at root level to trigger the listener
    await update(ref(db), {
      "Meter_Readings/ts": Date.now()
    });

    console.log("✅ Firebase updated! The listener should sync new readings to MongoDB.");
    console.log("Wait a few seconds, then check the frontend.\n");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

triggerSync();
