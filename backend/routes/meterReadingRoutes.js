const express = require("express");
const {
	getLatestReadings,
	getMeterHistory,
	getRealtimeReading,
	getConsumptionReport,
} = require("../controllers/meterHistoryController");
const { getWaterData } = require("../controllers/waterController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/realtime-public", getRealtimeReading);
router.get("/", authenticate, getWaterData);
router.get("/latest", authenticate, getLatestReadings);
router.get("/realtime", authenticate, getRealtimeReading);
router.get("/history", authenticate, getMeterHistory);
router.get("/report", authenticate, getConsumptionReport);

module.exports = router;