const express = require("express");
const { getWaterData } = require("../controllers/waterController");
const { getMeterHistory } = require("../controllers/meterHistoryController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", authenticate, getWaterData);
router.get("/history", authenticate, getMeterHistory);

module.exports = router;