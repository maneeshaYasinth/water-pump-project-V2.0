const mongoose = require("mongoose");

const meterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // user-friendly name
    serialNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meter", meterSchema);
