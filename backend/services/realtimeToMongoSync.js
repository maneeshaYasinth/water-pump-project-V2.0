const { ref, onValue, get, update } = require("firebase/database");
const db = require("../config/firebase");
const MeterReading = require("../models/MeterReading");
const Meter = require("../models/Meter");

let isStarted = false;
let periodicSyncTimer = null;
const lastPersistedSignatures = new Map();
const PERIODIC_SYNC_MS = 2 * 60 * 1000;
const SOURCE_CONFIGS = [
  // NOTE: Removed "meters" path because canonical structure has zeros
  // Root-level Meter_Readings has the actual values and is synced separately
  { path: "Meter_Readings", sourcePath: "Meter_Readings" },
  { path: "meterReadings", sourcePath: "meterReadings" },
  { path: "MeterReadings", sourcePath: "MeterReadings" },
  { path: "meter_readings", sourcePath: "meter_readings" },
];

const toNumber = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (!cleaned) return null;
    const parsed = Number(cleaned[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

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

const parseMeta = (keyPath, payload) => {
  const hasCanonicalShape = keyPath.includes("readings") || keyPath.includes("current") || keyPath.includes("valve");
  const serialFromPath = hasCanonicalShape ? keyPath[0] : keyPath[keyPath.length - 1];
  const councilFromPath = hasCanonicalShape ? null : keyPath[0];

  const councilArea = payload?.councilArea || payload?.CouncilArea || payload?.area || payload?.Area || councilFromPath || null;
  const serialNumber =
    payload?.serialNumber ||
    payload?.SerialNumber ||
    payload?.meterId ||
    payload?.meterID ||
    payload?.meterNo ||
    payload?.meterNumber ||
    payload?.deviceId ||
    payload?.deviceID ||
    payload?.id ||
    serialFromPath ||
    null;

  return { councilArea, serialNumber };
};

const normalizeReading = (payload, keyPath, sourcePath) => {
  const source = payload && typeof payload === "object" ? payload : {};
  const { councilArea, serialNumber } = parseMeta(keyPath, source);

  const flowRate = toNumber(source.Flow_Rate ?? source.flowRate ?? source.flow_rate ?? source.FlowRate);
  const pressure = toNumber(source.Pressure ?? source.pressure);
  const totalConsumption = toNumber(
    source.Total_Consumption ?? source.totalConsumption ?? source.total_consumption ?? source.TotalConsumption
  );
  const totalUnits = toNumber(source.Total_Units ?? source.totalUnits ?? source.TotalUnits ?? totalConsumption);
  const dailyConsumption = toNumber(
    source.Daily_consumption ?? source.Daily_Consumption ?? source.dailyConsumption ?? source.daily_consumption
  );
  const monthlyUnits = toNumber(source.Monthly_Units ?? source.monthlyUnits ?? source.MonthlyUnits);
  const lastUpdated = toDate(source.Last_Updated ?? source.lastUpdated ?? source.updatedAt ?? source.timestamp) || new Date();

  return {
    serialNumber,
    councilArea,
    Flow_Rate: flowRate,
    Pressure: pressure,
    Total_Consumption: totalConsumption ?? totalUnits,
    Daily_consumption: dailyConsumption,
    Monthly_Units: monthlyUnits,
    Total_Units: totalUnits ?? totalConsumption,
    Last_Updated: lastUpdated,
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
    const results = await Promise.allSettled(writeOperations);
    const rejected = results.filter((result) => result.status === "rejected");
    if (rejected.length) {
      console.error("Mongo sync write failures:", rejected[0]?.reason?.message || rejected[0]?.reason || rejected.length);
    }
    return results.length;
  }
  return 0;
};

const syncTreeToMongo = async (treeValue, sourcePath, options = {}) => {
  if (!treeValue || typeof treeValue !== "object") return;
  const entries = walkMeterObjects(treeValue);
  return persistReadings(entries, sourcePath, options);
};

const syncCurrentRealtimeToMongo = async (options = {}) => {
  let totalWrites = 0;
  const sourceStatus = [];

  // First, check for root-level readings and sync them for all meters
  for (const rootPath of ["Meter_Readings", "meterReadings"]) {
    const rootSnapshot = await get(ref(db, rootPath));
    const exists = rootSnapshot.exists();
    sourceStatus.push(`${rootPath}-root:${exists ? "found" : "missing"}`);
    
    if (exists) {
      const rootData = rootSnapshot.val();
      
      // Check if this is a root-level reading (has metrics directly)
      if (rootData && typeof rootData === "object" && 
          (rootData.Flow_Rate !== undefined || rootData.Pressure !== undefined || 
           rootData.Total_Units !== undefined || rootData.Daily_consumption !== undefined)) {
        
        console.log(`[sync] Found root-level readings at ${rootPath}:`, rootData);
        
        // Get all meters to sync this reading for each
        const allMeters = await Meter.find({}).select("serialNumber councilArea").lean();
        
        for (const meter of allMeters) {
          if (!meter.serialNumber) continue;
          
          const normalized = normalizeReading(rootData, [rootPath], rootPath);
          normalized.serialNumber = meter.serialNumber;
          normalized.councilArea = meter.councilArea || null;
          
          const cacheKey = `${normalized.councilArea || "unknown"}__${normalized.serialNumber}`;
          const signature = getSignature(normalized);
          
          if (!options.forceWrite && lastPersistedSignatures.get(cacheKey) === signature) {
            continue;
          }
          
          lastPersistedSignatures.set(cacheKey, signature);
          
          try {
            await MeterReading.create(normalized);
            totalWrites++;
          } catch (error) {
            console.error(`[sync] Failed to write root reading for ${meter.serialNumber}:`, error.message);
          }
        }
      }
    }
  }

  // Then sync tree-based sources
  for (const source of SOURCE_CONFIGS) {
    const snapshot = await get(ref(db, source.path));
    const exists = snapshot.exists();
    sourceStatus.push(`${source.path}:${exists ? "found" : "missing"}`);
    if (!exists) continue;
    const writes = await syncTreeToMongo(snapshot.val(), source.sourcePath, options);
    totalWrites += writes || 0;
  }

  if (options.forceWrite) {
    if (totalWrites === 0) {
      console.log(`Realtime snapshot sync: no new Firebase changes to write (${sourceStatus.join(", ")})`);
    } else {
      console.log(`Realtime snapshot sync wrote ${totalWrites} records`);
    }
  }
};

const ensureCanonicalRealtimeStructure = async () => {
  const [metersSnapshot, legacyTreeSnapshot, legacyTreeAltSnapshot, legacyValveSnapshot] = await Promise.all([
    Meter.find({}).lean(),
    get(ref(db, "Meter_Readings")),
    get(ref(db, "meterReadings")),
    get(ref(db, "Valve_Status")),
  ]);

  const legacyTree = legacyTreeSnapshot.exists() ? legacyTreeSnapshot.val() : {};
  const legacyTreeAlt = legacyTreeAltSnapshot.exists() ? legacyTreeAltSnapshot.val() : {};
  const legacyValve = legacyValveSnapshot.exists() ? legacyValveSnapshot.val() : {};

  const updates = {};
  const nowIso = new Date().toISOString();

  for (const meter of metersSnapshot) {
    const serial = meter.serialNumber;
    if (!serial) continue;

    const area = meter.councilArea || null;
    const meterId = meter._id?.toString?.() || null;
    const userId = meter.user?.toString?.() || null;
    const name = meter.name || serial;
    const meterStatus = meter.status || "active";

    const readingCandidate =
      (area ? legacyTree?.[area]?.[serial] : null) ||
      (area ? legacyTreeAlt?.[area]?.[serial] : null) ||
      legacyTree?.[serial] ||
      legacyTreeAlt?.[serial] ||
      {};

    const valveCandidate =
      (meterId ? legacyValve?.[meterId] : null) ||
      legacyValve?.[serial] ||
      {};

    updates[`meters/${serial}/meta`] = {
      serialNumber: serial,
      councilArea: area,
      name,
      meterId,
      userId,
      status: meterStatus,
      updatedAt: nowIso,
    };

    updates[`meters/${serial}/readings/current`] = {
      serialNumber: serial,
      councilArea: area,
      Flow_Rate: toNumber(readingCandidate.Flow_Rate ?? readingCandidate.flowRate) ?? 0,
      Pressure: toNumber(readingCandidate.Pressure ?? readingCandidate.pressure) ?? 0,
      Total_Consumption:
        toNumber(readingCandidate.Total_Consumption ?? readingCandidate.totalConsumption ?? readingCandidate.Total_Units) ?? 0,
      Total_Units:
        toNumber(readingCandidate.Total_Units ?? readingCandidate.totalUnits ?? readingCandidate.Total_Consumption) ?? 0,
      Daily_consumption: toNumber(readingCandidate.Daily_consumption ?? readingCandidate.dailyConsumption) ?? 0,
      Monthly_Units: toNumber(readingCandidate.Monthly_Units ?? readingCandidate.monthlyUnits) ?? 0,
      Last_Updated: readingCandidate.Last_Updated || readingCandidate.lastUpdated || nowIso,
      isActive: meterStatus !== "inactive",
    };

    updates[`meters/${serial}/valve/status`] = {
      status: valveCandidate.status || "open",
      updatedBy: valveCandidate.updatedBy || null,
      lastUpdated: valveCandidate.lastUpdated || nowIso,
      serialNumber: serial,
    };
  }

  if (Object.keys(updates).length) {
    await update(ref(db), updates);
    console.log(`Canonical realtime structure ensured for ${metersSnapshot.length} meters`);
  }
};

const startRealtimeToMongoSync = () => {
  if (isStarted) return;
  isStarted = true;

  // Listen to root-level Meter_Readings and meterReadings for direct updates
  for (const rootPath of ["Meter_Readings", "meterReadings"]) {
    const rootRef = ref(db, rootPath);
    
    onValue(
      rootRef,
      async (snapshot) => {
        try {
          if (!snapshot.exists()) return;
          
          const rootData = snapshot.val();
          
          // Check if this is a root-level reading (has metrics directly)
          if (rootData && typeof rootData === "object" && 
              (rootData.Flow_Rate !== undefined || rootData.Pressure !== undefined || 
               rootData.Total_Units !== undefined || rootData.Daily_consumption !== undefined)) {
            
            console.log(`[listener] Root-level reading updated at ${rootPath}, syncing to MongoDB...`);
            
            // Get all meters to sync this reading for each
            const allMeters = await Meter.find({}).select("serialNumber councilArea").lean();
            
            for (const meter of allMeters) {
              if (!meter.serialNumber) continue;
              
              const normalized = normalizeReading(rootData, [rootPath], rootPath);
              normalized.serialNumber = meter.serialNumber;
              normalized.councilArea = meter.councilArea || null;
              
              try {
                await MeterReading.create(normalized);
              } catch (error) {
                // Ignore duplicate errors, just log others
                if (!error.message.includes("duplicate")) {
                  console.error(`[listener] Failed to write root reading for ${meter.serialNumber}:`, error.message);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing root ${rootPath} to MongoDB:`, error.message);
        }
      },
      (error) => {
        console.error(`Root ${rootPath} listener error:`, error.message);
      }
    );
  }

  // Listen to tree-based sources
  for (const source of SOURCE_CONFIGS) {
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

  console.log("Realtime to MongoDB sync listener started✅ (periodic snapshot every 2 mins + root-level listeners)");
};

module.exports = {
  startRealtimeToMongoSync,
  syncCurrentRealtimeToMongo,
  ensureCanonicalRealtimeStructure,
};
