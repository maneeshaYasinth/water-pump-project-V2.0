const Meter = require("../models/Meter");
const MeterReading = require("../models/MeterReading");
const { ref, get } = require("firebase/database");
const db = require("../config/firebase");
const { syncCurrentRealtimeToMongo } = require("../services/realtimeToMongoSync");

const DEFAULT_LIMIT = 200;

const parseLimit = (rawValue) => {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), 500);
};

const getAccessContext = async (req) => {
  const role = req.user?.role;

  if (role === "user") {
    const userMeters = await Meter.find({ user: req.user.userId }).select("serialNumber");
    return {
      role,
      serialNumbers: userMeters.map((meter) => meter.serialNumber),
    };
  }

  if (role === "admin" || role === "authority") {
    return {
      role,
      councilArea: req.user?.councilArea || null,
      serialNumbers: [],
    };
  }

  return {
    role,
    serialNumbers: [],
  };
};

const buildBaseMatch = (accessContext) => {
  if (accessContext.role === "user") {
    return { serialNumber: { $in: accessContext.serialNumbers } };
  }

  if (accessContext.role === "authority") {
    return accessContext.councilArea ? { councilArea: accessContext.councilArea } : { _id: null };
  }

  if (accessContext.role === "admin") {
    return accessContext.councilArea ? { councilArea: accessContext.councilArea } : {};
  }

  return { _id: null };
};

const applyOptionalFilters = (match, req, accessContext) => {
  const serialNumber = req.query.serialNumber?.trim();

  if (serialNumber) {
    if (accessContext.role === "user" && !accessContext.serialNumbers.includes(serialNumber)) {
      return { _id: null };
    }

    match.serialNumber = serialNumber;
  }

  return match;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const findSerialInTree = (node, serialNumber, trail = []) => {
  if (!node || typeof node !== "object") return null;

  if (serialNumber && node[serialNumber] && typeof node[serialNumber] === "object") {
    return { payload: node[serialNumber], keyPath: [...trail, serialNumber] };
  }

  for (const [key, value] of Object.entries(node)) {
    if (value && typeof value === "object") {
      const found = findSerialInTree(value, serialNumber, [...trail, key]);
      if (found) return found;
    }
  }

  return null;
};

const formatReading = (payload, meter) => ({
  serialNumber: meter.serialNumber,
  councilArea: meter.councilArea,
  Daily_consumption: toNumber(payload?.Daily_consumption),
  Flow_Rate: toNumber(payload?.Flow_Rate),
  Monthly_Units: toNumber(payload?.Monthly_Units),
  Pressure: toNumber(payload?.Pressure),
  Total_Units: toNumber(payload?.Total_Units ?? payload?.Total_Consumption),
  Last_Updated: payload?.Last_Updated || new Date().toISOString(),
});

const isMeterLikeObject = (value) => {
  if (!value || typeof value !== "object") return false;
  return (
    "Flow_Rate" in value ||
    "flowRate" in value ||
    "Pressure" in value ||
    "pressure" in value ||
    "Total_Consumption" in value ||
    "totalConsumption" in value ||
    "Daily_consumption" in value ||
    "dailyConsumption" in value ||
    "Monthly_Units" in value ||
    "monthlyUnits" in value ||
    "Total_Units" in value ||
    "totalUnits" in value
  );
};

const walkMeterObjects = (node, path = []) => {
  if (!node || typeof node !== "object") return [];
  if (isMeterLikeObject(node)) {
    return [{ keyPath: path, payload: node }];
  }

  const entries = [];
  for (const [key, value] of Object.entries(node)) {
    entries.push(...walkMeterObjects(value, [...path, key]));
  }
  return entries;
};

const buildRealtimeFallbackReadings = async (match, limit) => {
  const sourcePaths = ["Meter_Readings", "meterReadings", "meters"];
  const rows = [];
  const requestedSerials =
    match?.serialNumber && typeof match.serialNumber === "object" && Array.isArray(match.serialNumber.$in)
      ? match.serialNumber.$in
      : typeof match?.serialNumber === "string"
      ? [match.serialNumber]
      : [];

  // Try reading root-level Meter_Readings first
  for (const rootPath of ["Meter_Readings", "meterReadings"]) {
    const rootSnapshot = await get(ref(db, rootPath));
    if (!rootSnapshot.exists()) continue;
    
    const rootData = rootSnapshot.val();
    
    // Check if this is a root-level reading (has Flow_Rate, Pressure, etc. directly)
    if (rootData && typeof rootData === "object" && 
        (rootData.Flow_Rate !== undefined || rootData.Pressure !== undefined || 
         rootData.Total_Units !== undefined || rootData.Daily_consumption !== undefined)) {
      
      console.log(`[history-fallback] Found root-level readings at ${rootPath}:`, rootData);
      
      // For each requested serial, create a reading from root data
      const serialsToProcess = requestedSerials.length ? requestedSerials : ["unknown"];
      
      for (const serial of serialsToProcess) {
        rows.push({
          serialNumber: serial,
          councilArea: match?.councilArea || null,
          Daily_consumption: toNumber(rootData.Daily_consumption ?? rootData.dailyConsumption),
          Flow_Rate: toNumber(rootData.Flow_Rate ?? rootData.flowRate),
          Monthly_Units: toNumber(rootData.Monthly_Units ?? rootData.monthlyUnits),
          Pressure: toNumber(rootData.Pressure ?? rootData.pressure),
          Total_Units: toNumber(rootData.Total_Units ?? rootData.totalUnits ?? rootData.Total_Consumption ?? rootData.totalConsumption),
          Last_Updated: rootData.Last_Updated || rootData.lastUpdated || new Date().toISOString(),
          createdAt: rootData.Last_Updated || rootData.lastUpdated || new Date().toISOString(),
          source: `firebase-root-${rootPath}`,
        });
      }
    }
  }

  // Tree-walk existing paths
  for (const sourcePath of sourcePaths) {
    const snapshot = await get(ref(db, sourcePath));
    if (!snapshot.exists()) continue;

    const entries = walkMeterObjects(snapshot.val());
    for (const entry of entries) {
      const payload = entry.payload || {};
      let serialNumber =
        payload.serialNumber ||
        payload.SerialNumber ||
        payload.meterId ||
        payload.meterID ||
        payload.meterNo ||
        payload.deviceId ||
        (sourcePath === "meters" ? entry.keyPath[0] : entry.keyPath[entry.keyPath.length - 1]) ||
        null;
      let councilArea = payload.councilArea || payload.CouncilArea || (sourcePath === "meters" ? null : entry.keyPath[0]) || null;

      if ((!serialNumber || serialNumber === "Meter_Readings" || serialNumber === "meterReadings") && requestedSerials.length) {
        serialNumber = requestedSerials[0];
      }

      if (!councilArea && match?.councilArea) {
        councilArea = match.councilArea;
      }

      if (!serialNumber) continue;
      if (requestedSerials.length) {
        const expected = requestedSerials;
        if (!expected.includes(serialNumber)) continue;
      }
      if (match?.councilArea && councilArea !== match.councilArea) continue;

      rows.push({
        serialNumber,
        councilArea,
        Daily_consumption: toNumber(payload.Daily_consumption ?? payload.dailyConsumption),
        Flow_Rate: toNumber(payload.Flow_Rate ?? payload.flowRate),
        Monthly_Units: toNumber(payload.Monthly_Units ?? payload.monthlyUnits),
        Pressure: toNumber(payload.Pressure ?? payload.pressure),
        Total_Units: toNumber(payload.Total_Units ?? payload.totalUnits ?? payload.Total_Consumption ?? payload.totalConsumption),
        Last_Updated: payload.Last_Updated || payload.lastUpdated || new Date().toISOString(),
        createdAt: payload.Last_Updated || payload.lastUpdated || new Date().toISOString(),
        source: "firebase-fallback",
      });
    }
  }

  return rows
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

const getRealtimePayloadBySerial = async (serialNumber, councilAreaHint = null) => {
  const directPaths = [
    `meters/${serialNumber}/readings/current`,
    councilAreaHint ? `Meter_Readings/${councilAreaHint}/${serialNumber}` : null,
    councilAreaHint ? `meterReadings/${councilAreaHint}/${serialNumber}` : null,
    `Meter_Readings/${serialNumber}`,
    `meterReadings/${serialNumber}`,
    `Meter_Readings`,
    `meterReadings`,
  ].filter(Boolean);

  for (const path of directPaths) {
    const directSnapshot = await get(ref(db, path));
    if (directSnapshot.exists()) {
      const parts = path.split("/");
      const data = directSnapshot.val();
      
      // Check if this is root-level reading (has metrics directly)
      if ((path === "Meter_Readings" || path === "meterReadings") && 
          data && typeof data === "object" &&
          (data.Flow_Rate !== undefined || data.Pressure !== undefined || data.Total_Units !== undefined)) {
        console.log(`[history-payload] Found root-level reading at ${path}:`, data);
        return {
          payload: data,
          councilArea: councilAreaHint,
        };
      }
      
      return {
        payload: data || {},
        councilArea: parts.length >= 3 ? parts[1] : councilAreaHint,
      };
    }
  }

  const treePaths = ["meters", "Meter_Readings", "meterReadings"];
  for (const treePath of treePaths) {
    const treeSnapshot = await get(ref(db, treePath));
    if (!treeSnapshot.exists()) continue;

    const found = findSerialInTree(treeSnapshot.val(), serialNumber);
    if (found?.payload) {
      return {
        payload: found.payload,
        councilArea:
          found.payload?.councilArea ||
          found.payload?.CouncilArea ||
          (treePath === "meters" ? councilAreaHint : found.keyPath?.length > 1 ? found.keyPath[0] : councilAreaHint),
      };
    }
  }

  return null;
};

exports.getLatestReadings = async (req, res) => {
  try {
    const accessContext = await getAccessContext(req);

    if (accessContext.role === "user" && !accessContext.serialNumbers.length) {
      return res.json({ count: 0, readings: [] });
    }

    const match = applyOptionalFilters(buildBaseMatch(accessContext), req, accessContext);

    const readings = await MeterReading.aggregate([
      { $match: match },
      { $sort: { serialNumber: 1, createdAt: -1 } },
      { $group: { _id: "$serialNumber", latest: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$latest" } },
      { $sort: { createdAt: -1 } },
    ]);

    return res.json({
      count: readings.length,
      readings,
    });
  } catch (error) {
    console.error("Error fetching latest meter readings:", error);
    return res.status(500).json({ message: "Failed to fetch latest meter readings" });
  }
};

exports.getMeterHistory = async (req, res) => {
  try {
    const accessContext = await getAccessContext(req);

    if (accessContext.role === "user" && !accessContext.serialNumbers.length) {
      return res.json({ count: 0, readings: [] });
    }

    const match = applyOptionalFilters(buildBaseMatch(accessContext), req, accessContext);
    const queryLimit = parseLimit(req.query.limit);

    // Always read from MongoDB only - this is the historical data source
    let readings = await MeterReading.find(match)
      .sort({ createdAt: -1 })
      .limit(queryLimit)
      .lean();

    // If no data, trigger a sync and retry once
    if (!readings.length) {
      console.log("[history] No MongoDB data found, triggering sync from Firebase...");
      await syncCurrentRealtimeToMongo();
      
      readings = await MeterReading.find(match)
        .sort({ createdAt: -1 })
        .limit(queryLimit)
        .lean();
      
      console.log(`[history] After sync: ${readings.length} readings found in MongoDB`);
    }

    return res.json({
      count: readings.length,
      readings,
    });
  } catch (error) {
    console.error("Error fetching meter history:", error);
    return res.status(500).json({ message: "Failed to fetch meter history" });
  }
};

exports.getRealtimeReading = async (req, res) => {
  try {
    const requestedSerial = req.query.serialNumber;
    const role = req.user?.role;

    if (!req.user) {
      if (!requestedSerial) {
        return res.status(400).json({ message: "serialNumber is required" });
      }

      const realtimeHit = await getRealtimePayloadBySerial(requestedSerial);
      if (realtimeHit?.payload) {
        return res.json({
          serialNumber: requestedSerial,
          councilArea: realtimeHit.councilArea || null,
          ...formatReading(realtimeHit.payload, {
            serialNumber: requestedSerial,
            councilArea: realtimeHit.councilArea || null,
          }),
          source: "firebase-realtime",
        });
      }

      return res.status(404).json({ message: "No realtime reading found for serial number" });
    }

    let meter = null;

    if (role === "user") {
      if (requestedSerial) {
        meter = await Meter.findOne({ user: req.user.userId, serialNumber: requestedSerial }).lean();
      }
      if (!meter) {
        meter = await Meter.findOne({ user: req.user.userId }).sort({ createdAt: -1 }).lean();
      }
    } else if (role === "admin" || role === "authority") {
      if (requestedSerial) {
        meter = await Meter.findOne({ councilArea: req.user?.councilArea, serialNumber: requestedSerial }).lean();
      }
      if (!meter) {
        meter = await Meter.findOne({ councilArea: req.user?.councilArea }).sort({ createdAt: -1 }).lean();
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!meter) {
      return res.json({
        serialNumber: requestedSerial || null,
        councilArea: null,
        Daily_consumption: 0,
        Flow_Rate: 0,
        Monthly_Units: 0,
        Pressure: 0,
        Total_Units: 0,
        Last_Updated: new Date().toISOString(),
      });
    }

    const realtimeHit = await getRealtimePayloadBySerial(meter.serialNumber, meter.councilArea);
    if (realtimeHit?.payload) {
      return res.json({
        ...formatReading(realtimeHit.payload, meter),
        source: "firebase-realtime",
      });
    }

    const latestMongo = await MeterReading.findOne({ serialNumber: meter.serialNumber })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestMongo) {
      return res.json({
        serialNumber: meter.serialNumber,
        councilArea: meter.councilArea,
        Daily_consumption: 0,
        Flow_Rate: 0,
        Monthly_Units: 0,
        Pressure: 0,
        Total_Units: 0,
        Last_Updated: new Date().toISOString(),
      });
    }

    return res.json({
      serialNumber: latestMongo.serialNumber,
      councilArea: latestMongo.councilArea,
      Daily_consumption: latestMongo.Daily_consumption ?? 0,
      Flow_Rate: latestMongo.Flow_Rate ?? 0,
      Monthly_Units: latestMongo.Monthly_Units ?? 0,
      Pressure: latestMongo.Pressure ?? 0,
      Total_Units: latestMongo.Total_Units ?? latestMongo.Total_Consumption ?? 0,
      Last_Updated: latestMongo.Last_Updated || latestMongo.createdAt,
      source: "mongodb-fallback",
    });
  } catch (error) {
    console.error("Error fetching realtime meter reading:", error);
    return res.status(500).json({ message: "Failed to fetch realtime meter reading" });
  }
};
