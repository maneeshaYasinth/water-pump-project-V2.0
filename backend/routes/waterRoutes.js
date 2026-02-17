const express = require("express");
const router = express.Router();
const { authenticate, isAdminOrAuthority } = require("../middleware/authMiddleware");
const WaterMeter = require("../models/Meter");
const { ref, set, get } = require("firebase/database");
const db = require("../config/firebase");

// ✅ Create a new meter
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, serialNumber, councilArea } = req.body;
    const userId = req.user.userId;

    if (!name || !serialNumber || !councilArea) {
      return res.status(400).json({ message: "Name, serial number, and council area are required" });
    }

    const newMeter = await WaterMeter.create({ 
      name, 
      serialNumber, 
      user: userId,
      councilArea,
      status: 'active'
    });
    
    // Initialize meter readings in Firebase
    await set(ref(db, `Meter_Readings/${councilArea}/${serialNumber}`), {
      Flow_Rate: 0,
      Pressure: 0,
      Total_Consumption: 0,
      Last_Updated: new Date().toISOString(),
      isActive: true
    });

    res.status(201).json(newMeter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating meter" });
  }
});

// ✅ Get all meters for the logged-in user
router.get("/my-meters", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const meters = await WaterMeter.find({ user: userId });

    if (!meters.length) {
      return res.status(404).json({ message: "No meters found" });
    }

    res.json(meters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching meters" });
  }
});

// Get meters by council area (for admin and authority)
router.get("/council-meters/:councilArea", isAdminOrAuthority, async (req, res) => {
  try {
    const { councilArea } = req.params;
    
    // Verify the admin/authority has access to this council area
    if (req.user.councilArea !== councilArea) {
      return res.status(403).json({ message: "Access denied for this council area" });
    }

    const meters = await WaterMeter.find({ councilArea });
    res.json(meters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching council meters" });
  }
});

// Control valve (authority/admin can open/close, user can open/close own meter)
router.post("/valve-control/:meterId", authenticate, async (req, res) => {
  try {
    const { meterId } = req.params;
    const { action } = req.body; // 'open' or 'close'
    const userRole = req.user.role;

    if (!['open', 'close'].includes(action)) {
      return res.status(400).json({ message: "Invalid valve action" });
    }

    if (!['user', 'authority', 'admin'].includes(userRole)) {
      return res.status(403).json({ message: "Access denied for valve control" });
    }

    const meter = await WaterMeter.findById(meterId);
    if (!meter) {
      return res.status(404).json({ message: "Meter not found" });
    }

    if (userRole === 'user') {
      if (meter.user.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Access denied for this meter" });
      }
    } else if (meter.councilArea !== req.user.councilArea) {
      return res.status(403).json({ message: "Access denied for this council area" });
    }

    // Update valve state in Firebase
    await set(ref(db, `Valve_Status/${meterId}`), {
      status: action,
      lastUpdated: new Date().toISOString(),
      updatedBy: req.user.userId
    });

    res.json({ message: `Valve successfully ${action}ed` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error controlling valve" });
  }
});

module.exports = router;
