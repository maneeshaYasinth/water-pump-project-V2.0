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

// water Routes
const waterRoutes = require("./routes/waterRoutes");
app.use("/api/water", waterRoutes);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
