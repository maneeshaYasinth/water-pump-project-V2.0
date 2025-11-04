const express = require("express");
const { getWaterData } = require("../controllers/waterController");
const router = express.Router();

router.get("/", getWaterData);

module.exports = router;