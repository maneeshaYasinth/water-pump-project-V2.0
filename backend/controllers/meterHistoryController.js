const Meter = require("../models/Meter");
const { admin, firestore, adminDb } = require("../config/firebaseAdmin");

const HISTORY_COLLECTION = "meterHistory";
const DEFAULT_LIMIT = 200;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isMeterLikeObject = (value) => {
  if (!value || typeof value !== "object") return false;

  return (
    "reading" in value ||
    "value" in value ||
    "meterValue" in value ||
    "amount" in value ||
    "Flow_Rate" in value ||
    "Total_Consumption" in value ||
    "Pressure" in value ||
    "Daily_consumption" in value ||
    "Monthly_Units" in value ||
    "Total_Units" in value
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

const normalizeReading = (raw) => {
  const source = raw && typeof raw === "object" ? raw : { reading: raw };
  return {
    Flow_Rate: toNumber(source.Flow_Rate ?? source.flowRate),
    Pressure: toNumber(source.Pressure ?? source.pressure),
    Total_Consumption: toNumber(source.Total_Consumption ?? source.totalConsumption ?? source.Total_Units),
    Daily_consumption: toNumber(source.Daily_consumption ?? source.dailyConsumption),
    Monthly_Units: toNumber(source.Monthly_Units ?? source.monthlyUnits),
    Total_Units: toNumber(source.Total_Units ?? source.totalUnits),
  };
};

const parseMirrorMeta = (sourcePath, keyPath, payload) => {
  const payloadSerial = payload?.serialNumber || payload?.SerialNumber || payload?.meterId || payload?.meterID;
  const payloadCouncil = payload?.councilArea || payload?.CouncilArea || payload?.council_area;

  if (sourcePath === "Meter_Readings") {
    const councilArea = payloadCouncil || keyPath[0] || null;
    const serialNumber = payloadSerial || keyPath[keyPath.length - 1] || null;
    return { councilArea, serialNumber };
  }

  const serialNumber = payloadSerial || keyPath[keyPath.length - 1] || null;
  return { councilArea: payloadCouncil || null, serialNumber };
};

const collectRealtimeReadings = async () => {
  const sourceConfigs = [
    { sourcePath: "meterReadings", dbPath: "/meterReadings" },
    { sourcePath: "Meter_Readings", dbPath: "/Meter_Readings" },
  ];

  const allReadings = [];

  for (const source of sourceConfigs) {
    const snapshot = await adminDb.ref(source.dbPath).get();
    if (!snapshot.exists()) continue;

    const entries = walkMeterObjects(snapshot.val());
    for (const entry of entries) {
      const documentId = entry.keyPath.join("_") || `${source.sourcePath}_${Date.now()}`;
      const { councilArea, serialNumber } = parseMirrorMeta(source.sourcePath, entry.keyPath, entry.payload);

      allReadings.push({
        id: documentId,
        ...(entry.payload && typeof entry.payload === "object" ? entry.payload : { reading: entry.payload }),
        ...normalizeReading(entry.payload),
        sourcePath: source.sourcePath,
        sourceKeyPath: entry.keyPath,
        sourceDocId: documentId,
        councilArea,
        serialNumber,
        mirroredAt: new Date().toISOString(),
      });
    }
  }

  return allReadings;
};

const isFirestoreUnavailableError = (error) => {
  const message = (error?.message || "").toLowerCase();
  return (
    error?.code === 7 ||
    error?.code === "permission-denied" ||
    message.includes("permission_denied") ||
    message.includes("firestore api has not been used") ||
    message.includes("firestore.googleapis.com")
  );
};

const syncRealtimeToFirestore = async () => {
  const sourceConfigs = [
    { sourcePath: "meterReadings", dbPath: "/meterReadings" },
    { sourcePath: "Meter_Readings", dbPath: "/Meter_Readings" },
  ];

  for (const source of sourceConfigs) {
    const snapshot = await adminDb.ref(source.dbPath).get();
    if (!snapshot.exists()) continue;

    const entries = walkMeterObjects(snapshot.val());
    if (!entries.length) continue;

    const writes = entries.map((entry) => {
      const documentId = entry.keyPath.join("_") || `${source.sourcePath}_${Date.now()}`;
      const { councilArea, serialNumber } = parseMirrorMeta(source.sourcePath, entry.keyPath, entry.payload);

      return firestore
        .collection(HISTORY_COLLECTION)
        .doc(documentId)
        .set(
          {
            ...(entry.payload && typeof entry.payload === "object" ? entry.payload : { reading: entry.payload }),
            ...normalizeReading(entry.payload),
            sourcePath: source.sourcePath,
            sourceKeyPath: entry.keyPath,
            sourceDocId: documentId,
            councilArea,
            serialNumber,
            mirroredAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    });

    await Promise.all(writes);
  }
};

const filterReadingsByRole = async (req, readings) => {
  const role = req.user?.role;

  if (role === "user") {
    const userMeters = await Meter.find({ user: req.user.userId }).select("serialNumber");
    const allowedSerials = new Set(userMeters.map((meter) => meter.serialNumber));
    return readings.filter((item) => item.serialNumber && allowedSerials.has(item.serialNumber));
  }

  if (role === "admin" || role === "authority") {
    const councilArea = req.user?.councilArea;
    if (!councilArea) return [];
    return readings.filter((item) => item.councilArea === councilArea);
  }

  return [];
};

const convertFirestoreDoc = (doc) => {
  const data = doc.data();
  let mirroredAt = null;

  if (data.mirroredAt && typeof data.mirroredAt.toDate === "function") {
    mirroredAt = data.mirroredAt.toDate().toISOString();
  }

  return {
    id: doc.id,
    ...data,
    mirroredAt,
  };
};

exports.getMeterHistory = async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const queryLimit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : DEFAULT_LIMIT;

    let readings = [];

    try {
      await syncRealtimeToFirestore();

      const snapshot = await firestore
        .collection(HISTORY_COLLECTION)
        .orderBy("mirroredAt", "asc")
        .limit(queryLimit)
        .get();

      readings = snapshot.docs.map(convertFirestoreDoc);
    } catch (error) {
      if (!isFirestoreUnavailableError(error)) {
        throw error;
      }

      console.error(
        "Firestore unavailable for meter history; serving realtime fallback. Enable Firestore API in Google Cloud Console.",
        error.message
      );

      const realtimeReadings = await collectRealtimeReadings();
      readings = realtimeReadings.slice(-queryLimit);
    }

    const filteredReadings = await filterReadingsByRole(req, readings);

    res.json({
      count: filteredReadings.length,
      readings: filteredReadings,
    });
  } catch (error) {
    console.error("Error fetching meter history:", error);
    res.status(500).json({ message: "Failed to fetch meter history" });
  }
};
