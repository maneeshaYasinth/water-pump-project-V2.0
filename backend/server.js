const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { startRealtimeToMongoSync } = require("./services/realtimeToMongoSync");

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// auth Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const waterRoutes = require("./routes/waterRoutes");
app.use("/api/water", waterRoutes);

const readingRoutes = require("./routes/meterReadingRoutes");
app.use("/api/readings", readingRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
	await connectDB();
	startRealtimeToMongoSync();

	app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();
