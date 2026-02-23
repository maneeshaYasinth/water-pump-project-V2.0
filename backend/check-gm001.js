const mongoose = require("mongoose");
require("dotenv").config();

const MeterReading = require("./models/MeterReading");

async function checkGM001() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // Get all readings for GM-001, sorted by createdAt descending
    const readings = await MeterReading.find({ serialNumber: "GM-001" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`Total GM-001 readings found: ${await MeterReading.countDocuments({ serialNumber: "GM-001" })}\n`);
    console.log("Latest 10 readings for GM-001:\n");

    readings.forEach((r, i) => {
      console.log(`${i + 1}. createdAt: ${r.createdAt}`);
      console.log(`   Flow_Rate: ${r.Flow_Rate}, Pressure: ${r.Pressure}, Total_Units: ${r.Total_Units}`);
      console.log(`   Daily: ${r.Daily_consumption}, Monthly: ${r.Monthly_Units}`);
      console.log(`   Source: ${r.sourcePath || 'N/A'}`);
      console.log(`   Last_Updated: ${r.Last_Updated}`);
      console.log("");
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkGM001();
