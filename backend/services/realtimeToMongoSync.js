const { ref, onValue, get } = require("firebase/database");
const db = require("../config/firebase");
const MeterReading = require("../models/MeterReading");

let isStarted = false;
let periodicSyncTimer = null;
const lastPersistedSignatures = new Map();
const PERIODIC_SYNC_MS = 2 * 60 * 1000;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isMeterLikeObject = (value) => {
  if (!value || typeof value !== "object") return false;

  return (
    "Flow_Rate" in value ||
    "flowRate" in value ||
    "flow_rate" in value ||
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

const hasNestedObjectChildren = (value) => {
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some((child) => child && typeof child === "object");
};

const walkMeterObjects = (node, path = []) => {
  if (!node || typeof node !== "object") return [];
  if (isMeterLikeObject(node) && !hasNestedObjectChildren(node)) {
    return [{ keyPath: path, payload: node }];
  }

  const entries = [];
  for (const [key, value] of Object.entries(node)) {
    entries.push(...walkMeterObjects(value, [...path, key]));
  }
  return entries;
};

const parseMeta = (keyPath, payload) => {
  const councilArea = payload?.councilArea || payload?.CouncilArea || keyPath[0] || null;
  const serialNumber =
    payload?.serialNumber || payload?.SerialNumber || payload?.meterId || payload?.meterID || keyPath[keyPath.length - 1] || null;

  return { councilArea, serialNumber };
};

const normalizeReading = (payload, keyPath, sourcePath) => {
  const source = payload && typeof payload === "object" ? payload : {};
  const { councilArea, serialNumber } = parseMeta(keyPath, source);

  return {
    serialNumber,
    councilArea,
    Flow_Rate: toNumber(source.Flow_Rate ?? source.flowRate ?? source.flow_rate),
    Pressure: toNumber(source.Pressure ?? source.pressure),
    Total_Consumption: toNumber(source.Total_Consumption ?? source.totalConsumption ?? source.total_consumption),
    Daily_consumption: toNumber(source.Daily_consumption ?? source.dailyConsumption),
    Monthly_Units: toNumber(source.Monthly_Units ?? source.monthlyUnits),
    Total_Units: toNumber(source.Total_Units ?? source.totalUnits),
    Last_Updated: toDate(source.Last_Updated ?? source.lastUpdated),
    sourcePath,
    rawData: source,
  };
};

const getSignature = (reading) =>
  JSON.stringify({
    Flow_Rate: reading.Flow_Rate,
    Pressure: reading.Pressure,
    Total_Consumption: reading.Total_Consumption,
    Daily_consumption: reading.Daily_consumption,
    Monthly_Units: reading.Monthly_Units,
    Total_Units: reading.Total_Units,
    Last_Updated: reading.Last_Updated ? reading.Last_Updated.toISOString() : null,
  });

const persistReadings = async (entries, sourcePath, { forceWrite = false } = {}) => {
  if (!entries.length) return;

  const writeOperations = [];

  for (const entry of entries) {
    const normalized = normalizeReading(entry.payload, entry.keyPath, sourcePath);
    if (!normalized.serialNumber) continue;

    const cacheKey = `${normalized.councilArea || "unknown"}__${normalized.serialNumber}`;
    const signature = getSignature(normalized);

    if (!forceWrite && lastPersistedSignatures.get(cacheKey) === signature) {
      continue;
    }

    lastPersistedSignatures.set(cacheKey, signature);
    writeOperations.push(MeterReading.create(normalized));
  }

  if (writeOperations.length) {
    await Promise.allSettled(writeOperations);
  }
};

const syncTreeToMongo = async (treeValue, sourcePath, options = {}) => {
  if (!treeValue || typeof treeValue !== "object") return;
  const entries = walkMeterObjects(treeValue);
  await persistReadings(entries, sourcePath, options);
};

const syncCurrentRealtimeToMongo = async (options = {}) => {
  const sourceConfigs = [
    { path: "Meter_Readings", sourcePath: "Meter_Readings" },
    { path: "meterReadings", sourcePath: "meterReadings" },
  ];

  for (const source of sourceConfigs) {
    const snapshot = await get(ref(db, source.path));
    if (!snapshot.exists()) continue;
    await syncTreeToMongo(snapshot.val(), source.sourcePath, options);
  }
};

const startRealtimeToMongoSync = () => {
  if (isStarted) return;
  isStarted = true;

  const sourceConfigs = [
    { path: "Meter_Readings", sourcePath: "Meter_Readings" },
    { path: "meterReadings", sourcePath: "meterReadings" },
  ];

  for (const source of sourceConfigs) {
    const readingRef = ref(db, source.path);

    onValue(
      readingRef,
      async (snapshot) => {
        try {
          if (!snapshot.exists()) return;
          await syncTreeToMongo(snapshot.val(), source.sourcePath);
        } catch (error) {
          console.error("Error syncing realtime readings to MongoDB:", error.message);
        }
      },
      (error) => {
        console.error("Realtime database listener error:", error.message);
      }
    );
  }

  syncCurrentRealtimeToMongo({ forceWrite: true }).catch((error) => {
    console.error("Initial periodic sync failed:", error.message);
  });

  periodicSyncTimer = setInterval(() => {
    syncCurrentRealtimeToMongo({ forceWrite: true }).catch((error) => {
      console.error("Periodic sync failed:", error.message);
    });
  }, PERIODIC_SYNC_MS);

  console.log("Realtime to MongoDB sync listener started✅ (periodic snapshot every 2 mins)");
};

module.exports = {
  startRealtimeToMongoSync,
  syncCurrentRealtimeToMongo,
};
