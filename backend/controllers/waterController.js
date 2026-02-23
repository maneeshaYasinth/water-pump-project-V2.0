const { ref, get } = require("firebase/database");
const db = require("../config/firebase");
const Meter = require("../models/Meter");
const MeterReading = require("../models/MeterReading");

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (!cleaned) return 0;
    const parsed = Number(cleaned[0]);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeReading = (payload = {}) => ({
  Daily_consumption: toNumber(payload.Daily_consumption ?? payload.dailyConsumption),
  Flow_Rate: toNumber(payload.Flow_Rate ?? payload.flowRate),
  Monthly_Units: toNumber(payload.Monthly_Units ?? payload.monthlyUnits),
  Pressure: toNumber(payload.Pressure ?? payload.pressure),
  Total_Units: toNumber(payload.Total_Units ?? payload.totalUnits ?? payload.Total_Consumption ?? payload.totalConsumption),
  Last_Updated: payload.Last_Updated || payload.lastUpdated || new Date().toISOString(),
  serialNumber: payload.serialNumber || payload.SerialNumber || null,
  councilArea: payload.councilArea || payload.CouncilArea || null,
});

const parseTimestamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const readingStrength = (reading) => {
  return (
    Math.abs(reading.Flow_Rate || 0) +
    Math.abs(reading.Pressure || 0) +
    Math.abs(reading.Total_Units || 0) +
    Math.abs(reading.Daily_consumption || 0) +
    Math.abs(reading.Monthly_Units || 0)
  );
};

const normalizeMongoReading = (payload = {}) => ({
  Daily_consumption: toNumber(payload.Daily_consumption ?? payload.dailyConsumption),
  Flow_Rate: toNumber(payload.Flow_Rate ?? payload.flowRate),
  Monthly_Units: toNumber(payload.Monthly_Units ?? payload.monthlyUnits),
  Pressure: toNumber(payload.Pressure ?? payload.pressure),
  Total_Units: toNumber(payload.Total_Units ?? payload.totalUnits ?? payload.Total_Consumption ?? payload.totalConsumption),
  Last_Updated: payload.Last_Updated || payload.lastUpdated || payload.updatedAt || payload.createdAt || new Date().toISOString(),
  serialNumber: payload.serialNumber || null,
  councilArea: payload.councilArea || null,
});

const readLatestMongoByMeter = async (meter) => {
  const latest = await MeterReading.findOne({ serialNumber: meter.serialNumber })
    .sort({ createdAt: -1 })
    .lean();

  if (!latest) return null;

  console.log("[live-reading][mongo] latest fallback row found", {
    serialNumber: meter.serialNumber,
    Flow_Rate: latest.Flow_Rate,
    Pressure: latest.Pressure,
    Total_Units: latest.Total_Units,
    Total_Consumption: latest.Total_Consumption,
    Daily_consumption: latest.Daily_consumption,
    Monthly_Units: latest.Monthly_Units,
    Last_Updated: latest.Last_Updated,
    createdAt: latest.createdAt,
  });

  return {
    ...normalizeMongoReading(latest),
    sourcePath: "mongo/latest",
  };
};

const resolveReadableMeter = async (req) => {
  const requestedSerial = req.query.serialNumber?.trim();
  const role = req.user?.role;

  if (role === "user") {
    if (requestedSerial) {
      return Meter.findOne({ user: req.user.userId, serialNumber: requestedSerial }).lean();
    }
    return Meter.findOne({ user: req.user.userId }).sort({ createdAt: -1 }).lean();
  }

  if (role === "authority") {
    if (requestedSerial) {
      return Meter.findOne({ serialNumber: requestedSerial, councilArea: req.user?.councilArea }).lean();
    }
    return Meter.findOne({ councilArea: req.user?.councilArea }).sort({ createdAt: -1 }).lean();
  }

  if (role === "admin") {
    if (requestedSerial) {
      const adminMatch = { serialNumber: requestedSerial };
      if (req.user?.councilArea) {
        adminMatch.councilArea = req.user.councilArea;
      }
      return Meter.findOne(adminMatch).lean();
    }

    const adminScope = req.user?.councilArea ? { councilArea: req.user.councilArea } : {};
    return Meter.findOne(adminScope).sort({ createdAt: -1 }).lean();
  }

  return null;
};

const readRealtimeByMeter = async (meter) => {
  const paths = [
    `meters/${meter.serialNumber}/readings/current`,
    meter.councilArea ? `Meter_Readings/${meter.councilArea}/${meter.serialNumber}` : null,
    meter.councilArea ? `meterReadings/${meter.councilArea}/${meter.serialNumber}` : null,
    `Meter_Readings/${meter.serialNumber}`,
    `meterReadings/${meter.serialNumber}`,
    "Meter_Readings",
    "meterReadings",
  ].filter(Boolean);

  const candidates = [];

  for (const path of paths) {
    const snapshot = await get(ref(db, path));
    console.log("[live-reading][firebase] path probe", {
      serialNumber: meter.serialNumber,
      path,
      exists: snapshot.exists(),
    });

    if (snapshot.exists()) {
      const rawValue = snapshot.val() || {};

      const rootReadingCandidate =
        path === "Meter_Readings" || path === "meterReadings"
          ? {
              Flow_Rate: rawValue.Flow_Rate,
              Pressure: rawValue.Pressure,
              Total_Consumption: rawValue.Total_Consumption,
              Total_Units: rawValue.Total_Units,
              Daily_consumption: rawValue.Daily_consumption,
              Monthly_Units: rawValue.Monthly_Units,
              Last_Updated: rawValue.Last_Updated || rawValue.lastUpdated || rawValue.ts,
            }
          : rawValue;

      const normalized = normalizeReading({
        serialNumber: meter.serialNumber,
        councilArea: meter.councilArea,
        ...rootReadingCandidate,
      });

      console.log("[live-reading][firebase] path value", {
        serialNumber: meter.serialNumber,
        path,
        rawValue,
        normalized,
      });

      candidates.push({
        path,
        reading: normalized,
        strength: readingStrength(normalized),
        timestamp: parseTimestamp(normalized.Last_Updated),
      });
    }
  }

  if (!candidates.length) return null;

  console.log("[live-reading] candidate summary", {
    serialNumber: meter.serialNumber,
    candidates: candidates.map((item) => ({
      path: item.path,
      strength: item.strength,
      timestamp: item.timestamp,
      reading: item.reading,
    })),
  });

  candidates.sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength;
    return b.timestamp - a.timestamp;
  });

  const bestReading = {
    ...candidates[0].reading,
    sourcePath: candidates[0].path,
  };

  if (readingStrength(bestReading) > 0) {
    console.log("[live-reading] selected firebase candidate", {
      serialNumber: meter.serialNumber,
      sourcePath: bestReading.sourcePath,
      reading: bestReading,
    });
    return bestReading;
  }

  console.log("[live-reading] firebase candidates are zero-like, switching to mongo fallback", {
    serialNumber: meter.serialNumber,
    sourcePath: bestReading.sourcePath,
    reading: bestReading,
  });

  const mongoFallback = await readLatestMongoByMeter(meter);

  if (mongoFallback) {
    console.log("[live-reading] selected mongo fallback", {
      serialNumber: meter.serialNumber,
      sourcePath: mongoFallback.sourcePath,
      reading: mongoFallback,
    });
  } else {
    console.log("[live-reading] mongo fallback not found, returning firebase zero-like candidate", {
      serialNumber: meter.serialNumber,
      sourcePath: bestReading.sourcePath,
      reading: bestReading,
    });
  }

  return mongoFallback || bestReading;
};

exports.getWaterData = async (req, res) => {
  try {
    console.log("[live-reading] incoming request", {
      requestedSerial: req.query.serialNumber || null,
      userId: req.user?.userId || null,
      role: req.user?.role || null,
      councilArea: req.user?.councilArea || null,
    });

    const meter = await resolveReadableMeter(req);

    if (!meter) {
      console.log("[live-reading] no readable meter resolved for requester");
      return res.status(404).json({ message: "No meter found for this user" });
    }

    console.log("[live-reading] resolved meter", {
      serialNumber: meter.serialNumber,
      meterId: meter._id,
      councilArea: meter.councilArea || null,
      status: meter.status || null,
    });

    const reading = await readRealtimeByMeter(meter);

    if (!reading) {
      console.log("[live-reading] no reading found in firebase or mongo fallback", {
        serialNumber: meter.serialNumber,
      });
      return res.status(404).json({ message: "No realtime reading found for meter" });
    }

    console.log("[live-reading] final response payload", {
      serialNumber: meter.serialNumber,
      sourcePath: reading.sourcePath || "unknown",
      reading,
    });

    return res.json(reading);
  } catch (error) {
    console.error("Error fetching Firebase data:", error);
    return res.status(500).json({ error: error.message });
  }
};