const mongoose = require("mongoose");
require("dotenv").config();
const MeterReading = require("./models/MeterReading");

async function cleanupLegacyReadings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const result = await MeterReading.deleteMany({ serialNumber: { $regex: /^GM-001$/i } });
    console.log(`Deleted ${result.deletedCount} GM-001 reading(s)`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error.message);
    process.exit(1);
  }
}

cleanupLegacyReadings();
