const mongoose = require("mongoose");
require("dotenv").config();

const MeterReading = require("./models/MeterReading");

async function checkMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // Get count of readings
    const count = await MeterReading.countDocuments();
    console.log(`Total readings in MongoDB: ${count}\n`);

    // Get latest 5 readings
    const latest = await MeterReading.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log("Latest 5 readings:");
    latest.forEach((reading, i) => {
      console.log(`${i + 1}. ${reading.serialNumber} - Flow: ${reading.Flow_Rate}, Pressure: ${reading.Pressure}, Total: ${reading.Total_Units}, Source: ${reading.sourcePath || 'N/A'}, Time: ${reading.createdAt}`);
    });

    // Get readings by meter
    const byMeter = await MeterReading.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$serialNumber", count: { $sum: 1 }, latest: { $first: "$$ROOT" } } }
    ]);

    console.log("\n\nReadings by meter:");
    byMeter.forEach(group => {
      const r = group.latest;
      console.log(`${group._id}: ${group.count} readings - Latest: Flow=${r.Flow_Rate}, Pressure=${r.Pressure}, Total=${r.Total_Units}`);
    });

    await mongoose.connection.close();
    console.log("\nConnection closed");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkMongo();
