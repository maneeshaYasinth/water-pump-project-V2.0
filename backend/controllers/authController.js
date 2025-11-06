const User = require("../models/User");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

// Register user
const register = async (req, res) => {
  try {
    const { name, email, password, role, councilArea } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Validate role if provided
    if (role && !['admin', 'authority'].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    // Check if councilArea is provided for admin and authority roles
    if ((role === 'admin' || role === 'authority') && !councilArea) {
      return res.status(400).json({ message: "Council area is required for admin and authority roles" });
    }

    // Create new user
    const user = await User.create({ 
      name, 
      email, 
      password,
      role: role || 'user',
      councilArea: role === 'user' ? undefined : councilArea
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        councilArea: user.councilArea
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role,
        councilArea: user.councilArea
      }, 
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        councilArea: user.councilArea,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { register, login };
