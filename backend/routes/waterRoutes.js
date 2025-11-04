const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const WaterMeter = require("../models/Meter");

// ✅ Create a new meter
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, serialNumber } = req.body;
    const userId = req.user.userId;

    if (!name || !serialNumber) {
      return res.status(400).json({ message: "Name and serial number required" });
    }

    const newMeter = await WaterMeter.create({ name, serialNumber, user: userId });
    res.status(201).json(newMeter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating meter" });
  }
});

// ✅ Get all meters for the logged-in user
router.get("/my-meters", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const meters = await WaterMeter.find({ user: userId });

    if (!meters.length) {
      return res.status(404).json({ message: "No meters found for this user." });
    }

    res.json(meters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching meters" });
  }
});

module.exports = router;
