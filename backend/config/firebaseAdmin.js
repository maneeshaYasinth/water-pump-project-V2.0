const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  });
}

const firestore = admin.firestore();
const adminDb = admin.database();

module.exports = {
  admin,
  firestore,
  adminDb,
};
