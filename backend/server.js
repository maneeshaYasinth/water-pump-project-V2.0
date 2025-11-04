const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

dotenv.config();

// Connect Database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// auth Routes
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const meterRoutes = require("./routes/waterRoutes");
app.use("/api/meters", meterRoutes);

const readingRoutes = require("./routes/meterReadingRoutes");
app.use("/api/readings", readingRoutes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
