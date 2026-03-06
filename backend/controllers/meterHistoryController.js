const Meter = require("../models/Meter");
const MeterReading = require("../models/MeterReading");
const { ref, get } = require("firebase/database");
const db = require("../config/firebase");
const { syncCurrentRealtimeToMongo } = require("../services/realtimeToMongoSync");

const DEFAULT_LIMIT = 200;

const parseLimit = (rawValue) => {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), 5000);
};

const parseDateQuery = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const REPORT_PERIODS = [
  { key: "last7Days", label: "Last 7 Days", days: 7 },
  { key: "last30Days", label: "Last 30 Days", days: 30 },
];

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

const toDate = (value) => {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 1e12 ? value * 1000 : value;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "string") {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      const millis = asNumber < 1e12 ? asNumber * 1000 : asNumber;
      const parsed = new Date(millis);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTotalReadingValue = (reading) => {
  const value = Number(reading?.Total_Units ?? reading?.Total_Consumption);
  return Number.isFinite(value) ? value : null;
};

const getDailyReadingValue = (reading) => {
  const value = Number(reading?.Daily_consumption);
  return Number.isFinite(value) ? value : null;
};

const calculatePeriodConsumption = (rows) => {
  if (!rows.length) return 0;

  const totals = rows
    .map(getTotalReadingValue)
    .filter((value) => Number.isFinite(value));

  if (totals.length >= 2) {
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    return Math.max(0, max - min);
  }

  const dailyValues = rows
    .map(getDailyReadingValue)
    .filter((value) => Number.isFinite(value));

  if (dailyValues.length) {
    return dailyValues.reduce((sum, value) => sum + value, 0);
  }

  return 0;
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
  Daily_consumption: toNumber(payload?.Daily_consumption ?? payload?.dailyConsumption ?? payload?.Daily_Liters ?? payload?.dailyLiters),
  Flow_Rate: toNumber(payload?.Flow_Rate ?? payload?.flowRate),
  Monthly_Units: toNumber(payload?.Monthly_Units),
  Pressure: toNumber(payload?.Pressure ?? payload?.pressure),
  Total_Units: toNumber(
    payload?.Total_M3 ?? payload?.totalM3 ?? payload?.Total_Units ?? payload?.totalUnits ?? payload?.Total_Consumption ?? payload?.totalConsumption
  ),
  Last_Updated: payload?.Last_Updated || payload?.lastUpdated || payload?.Timestamp || payload?.timestamp || payload?.ts || new Date().toISOString(),
});

const buildMongoRealtimeReading = (payload, meter, sourcePath = "Meters/latest") => {
  const formatted = formatReading(payload, meter);
  return {
    serialNumber: formatted.serialNumber,
    councilArea: formatted.councilArea,
    Daily_consumption: formatted.Daily_consumption,
    Flow_Rate: formatted.Flow_Rate,
    Monthly_Units: formatted.Monthly_Units,
    Pressure: formatted.Pressure,
    Total_Units: formatted.Total_Units,
    Total_Consumption: formatted.Total_Units,
    Last_Updated: toDate(formatted.Last_Updated) || new Date(),
    sourcePath,
    rawData: payload || {},
  };
};

const hasSameReadingSignature = (latestMongo, current) => {
  if (!latestMongo) return false;
  const latestTime = toDate(latestMongo.Last_Updated || latestMongo.createdAt)?.getTime() || 0;
  const currentTime = toDate(current.Last_Updated)?.getTime() || 0;

  return (
    Number(latestMongo.Flow_Rate ?? 0) === Number(current.Flow_Rate ?? 0) &&
    Number(latestMongo.Pressure ?? 0) === Number(current.Pressure ?? 0) &&
    Number(latestMongo.Total_Units ?? latestMongo.Total_Consumption ?? 0) === Number(current.Total_Units ?? 0) &&
    Number(latestMongo.Daily_consumption ?? 0) === Number(current.Daily_consumption ?? 0) &&
    Number(latestMongo.Monthly_Units ?? 0) === Number(current.Monthly_Units ?? 0) &&
    latestTime === currentTime
  );
};

const persistRealtimeReadingToMongo = async (payload, meter, sourcePath = "Meters/latest") => {
  const doc = buildMongoRealtimeReading(payload, meter, sourcePath);
  if (!doc.serialNumber) return;

  const latestMongo = await MeterReading.findOne({ serialNumber: doc.serialNumber })
    .sort({ createdAt: -1 })
    .lean();

  if (hasSameReadingSignature(latestMongo, doc)) {
    return;
  }

  await MeterReading.create(doc);
};

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
    "Daily_Liters" in value ||
    "dailyLiters" in value ||
    "Monthly_Units" in value ||
    "monthlyUnits" in value ||
    "Total_Units" in value ||
    "totalUnits" in value ||
    "Total_M3" in value ||
    "totalM3" in value ||
    "Timestamp" in value
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
  const sourcePaths = ["Meters"];
  const rows = [];
  const requestedSerials =
    match?.serialNumber && typeof match.serialNumber === "object" && Array.isArray(match.serialNumber.$in)
      ? match.serialNumber.$in
      : typeof match?.serialNumber === "string"
      ? [match.serialNumber]
      : [];

  // Tree-walk new Meters path only
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
        (sourcePath === "meters" || sourcePath === "Meters" ? entry.keyPath[0] : entry.keyPath[entry.keyPath.length - 1]) ||
        null;
      let councilArea =
        payload.councilArea || payload.CouncilArea || (sourcePath === "meters" || sourcePath === "Meters" ? null : entry.keyPath[0]) || null;

      if (!serialNumber && requestedSerials.length) {
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
        Daily_consumption: toNumber(payload.Daily_consumption ?? payload.dailyConsumption ?? payload.Daily_Liters ?? payload.dailyLiters),
        Flow_Rate: toNumber(payload.Flow_Rate ?? payload.flowRate),
        Monthly_Units: toNumber(payload.Monthly_Units ?? payload.monthlyUnits),
        Pressure: toNumber(payload.Pressure ?? payload.pressure),
        Total_Units: toNumber(
          payload.Total_M3 ?? payload.totalM3 ?? payload.Total_Units ?? payload.totalUnits ?? payload.Total_Consumption ?? payload.totalConsumption
        ),
        Last_Updated: payload.Last_Updated || payload.lastUpdated || payload.Timestamp || payload.timestamp || payload.ts || new Date().toISOString(),
        createdAt: payload.Last_Updated || payload.lastUpdated || payload.Timestamp || payload.timestamp || payload.ts || new Date().toISOString(),
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
    `Meters/${serialNumber}/latest`,
    `Meters/${serialNumber}`,
    `Meters`,
  ].filter(Boolean);

  for (const path of directPaths) {
    const directSnapshot = await get(ref(db, path));
    if (directSnapshot.exists()) {
      const parts = path.split("/");
      const data = directSnapshot.val();
      
      if (path === "Meters") {
        const meterNode = data?.[serialNumber] || {};
        return {
          payload: meterNode.latest || meterNode.readings?.current || meterNode,
          councilArea: councilAreaHint,
        };
      }

      if (path === `Meters/${serialNumber}`) {
        return {
          payload: data?.latest || data?.readings?.current || data || {},
          councilArea: councilAreaHint,
        };
      }
      
      return {
        payload: data || {},
        councilArea: parts.length >= 3 ? parts[1] : councilAreaHint,
      };
    }
  }

  const treePaths = ["Meters"];
  for (const treePath of treePaths) {
    const treeSnapshot = await get(ref(db, treePath));
    if (!treeSnapshot.exists()) continue;

    const found = findSerialInTree(treeSnapshot.val(), serialNumber);
    if (found?.payload) {
      const resolvedPayload =
        treePath === "meters" || treePath === "Meters"
          ? found.payload?.latest || found.payload?.readings?.current || found.payload
          : found.payload;

      return {
        payload: resolvedPayload,
        councilArea:
          resolvedPayload?.councilArea ||
          resolvedPayload?.CouncilArea ||
          (treePath === "meters" || treePath === "Meters" ? councilAreaHint : found.keyPath?.length > 1 ? found.keyPath[0] : councilAreaHint),
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
    const startDate = parseDateQuery(req.query.startDate);
    const endDate = parseDateQuery(req.query.endDate);

    const dateMatch = {};
    if (startDate) dateMatch.$gte = startDate;
    if (endDate) dateMatch.$lte = endDate;

    const finalMatch = {
      ...match,
      ...(Object.keys(dateMatch).length ? { createdAt: dateMatch } : {}),
    };

    // Always read from MongoDB only - this is the historical data source
    let readings = await MeterReading.find(finalMatch)
      .sort({ createdAt: -1 })
      .limit(queryLimit)
      .lean();

    // If no data, trigger a sync and retry once
    if (!readings.length) {
      console.log("[history] No MongoDB data found, triggering sync from Firebase...");
      await syncCurrentRealtimeToMongo();
      
      readings = await MeterReading.find(finalMatch)
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

exports.getMeterHistoryPublic = async (req, res) => {
  try {
    const serialNumber = req.query.serialNumber?.trim();
    if (!serialNumber) {
      return res.status(400).json({ message: "serialNumber is required" });
    }

    const queryLimit = parseLimit(req.query.limit);
    const startDate = parseDateQuery(req.query.startDate);
    const endDate = parseDateQuery(req.query.endDate);

    const dateMatch = {};
    if (startDate) dateMatch.$gte = startDate;
    if (endDate) dateMatch.$lte = endDate;

    const finalMatch = {
      serialNumber,
      ...(Object.keys(dateMatch).length ? { createdAt: dateMatch } : {}),
    };

    const readings = await MeterReading.find(finalMatch)
      .sort({ createdAt: -1 })
      .limit(queryLimit)
      .lean();

    return res.json({
      count: readings.length,
      readings,
    });
  } catch (error) {
    console.error("Error fetching public meter history:", error);
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
        await persistRealtimeReadingToMongo(
          realtimeHit.payload,
          { serialNumber: requestedSerial, councilArea: realtimeHit.councilArea || null },
          "Meters/latest"
        );

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
      if (!meter && !requestedSerial) {
        meter = await Meter.findOne({ user: req.user.userId }).sort({ createdAt: -1 }).lean();
      }
    } else if (role === "admin" || role === "authority") {
      if (requestedSerial) {
        meter = await Meter.findOne({ councilArea: req.user?.councilArea, serialNumber: requestedSerial }).lean();
      }
      if (!meter && !requestedSerial) {
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
      await persistRealtimeReadingToMongo(realtimeHit.payload, meter, "Meters/latest");

      return res.json({
        ...formatReading(realtimeHit.payload, meter),
        source: "firebase-realtime",
      });
    }

    return res.status(404).json({ message: "No realtime reading found for serial number in Meters/latest" });
  } catch (error) {
    console.error("Error fetching realtime meter reading:", error);
    return res.status(500).json({ message: "Failed to fetch realtime meter reading" });
  }
};

exports.getConsumptionReport = async (req, res) => {
  try {
    const accessContext = await getAccessContext(req);

    if (accessContext.role === "user" && !accessContext.serialNumbers.length) {
      return res.json({
        generatedAt: new Date().toISOString(),
        periods: REPORT_PERIODS,
        summary: {
          totalMeters: 0,
          last7Days: 0,
          last30Days: 0,
        },
        meters: [],
      });
    }

    const match = applyOptionalFilters(buildBaseMatch(accessContext), req, accessContext);
    const now = new Date();
    const maxDays = Math.max(...REPORT_PERIODS.map((period) => period.days));
    const earliestDate = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000);

    const readings = await MeterReading.find({
      ...match,
      createdAt: { $gte: earliestDate },
    })
      .sort({ serialNumber: 1, createdAt: 1 })
      .lean();

    const serials = [...new Set(readings.map((reading) => reading.serialNumber).filter(Boolean))];
    const meterDocs = serials.length
      ? await Meter.find({ serialNumber: { $in: serials } }).select("serialNumber name").lean()
      : [];
    const meterNameBySerial = meterDocs.reduce((acc, meter) => {
      acc[meter.serialNumber] = meter.name;
      return acc;
    }, {});

    const groupedBySerial = readings.reduce((acc, reading) => {
      const serial = reading.serialNumber;
      if (!serial) return acc;
      if (!acc[serial]) acc[serial] = [];
      acc[serial].push(reading);
      return acc;
    }, {});

    const meters = Object.entries(groupedBySerial).map(([serialNumber, rows]) => {
      const periodValues = REPORT_PERIODS.reduce((acc, period) => {
        const startDate = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
        const periodRows = rows.filter((row) => {
          const rowDate = toDate(row.createdAt || row.Last_Updated);
          return rowDate && rowDate >= startDate;
        });

        acc[period.key] = Number(calculatePeriodConsumption(periodRows).toFixed(2));
        return acc;
      }, {});

      const latest = rows[rows.length - 1] || {};

      return {
        serialNumber,
        meterName: meterNameBySerial[serialNumber] || null,
        councilArea: latest.councilArea || null,
        lastUpdated: latest.Last_Updated || latest.createdAt || null,
        ...periodValues,
      };
    });

    const summary = meters.reduce(
      (acc, meter) => ({
        totalMeters: acc.totalMeters + 1,
        last7Days: Number((acc.last7Days + (meter.last7Days || 0)).toFixed(2)),
        last30Days: Number((acc.last30Days + (meter.last30Days || 0)).toFixed(2)),
      }),
      { totalMeters: 0, last7Days: 0, last30Days: 0 }
    );

    return res.json({
      generatedAt: now.toISOString(),
      periods: REPORT_PERIODS,
      summary,
      meters,
    });
  } catch (error) {
    console.error("Error generating consumption report:", error);
    return res.status(500).json({ message: "Failed to generate consumption report" });
  }
};
