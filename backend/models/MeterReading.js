const mongoose = require("mongoose");

const meterReadingSchema = new mongoose.Schema(
  {
    serialNumber: { type: String, required: true, index: true },
    councilArea: { type: String, index: true },
    Flow_Rate: { type: Number, default: null },
    Pressure: { type: Number, default: null },
    Total_Consumption: { type: Number, default: null },
    Daily_consumption: { type: Number, default: null },
    Monthly_Units: { type: Number, default: null },
    Total_Units: { type: Number, default: null },
    Last_Updated: { type: Date, default: null },
    sourcePath: { type: String, default: "Meter_Readings" },
    rawData: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

meterReadingSchema.index({ serialNumber: 1, createdAt: -1 });
meterReadingSchema.index({ councilArea: 1, createdAt: -1 });

module.exports = mongoose.model("MeterReading", meterReadingSchema);
