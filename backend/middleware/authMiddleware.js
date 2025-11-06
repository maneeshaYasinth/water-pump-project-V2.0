// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

// Base authentication middleware
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user data to the request
    req.user = decoded;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Check if user is an admin or authority
const isAdminOrAuthority = (req, res, next) => {
  authenticate(req, res, () => {
    if (req.user.role === 'admin' || req.user.role === 'authority') {
      next();
    } else {
      res.status(403).json({ message: "Access denied. Admin/Authority rights required." });
    }
  });
};

// Check if user is an authority
const isAuthority = (req, res, next) => {
  authenticate(req, res, () => {
    if (req.user.role === 'authority') {
      next();
    } else {
      res.status(403).json({ message: "Access denied. Authority rights required." });
    }
  });
};

module.exports = {
  authenticate,
  isAdminOrAuthority,
  isAuthority
};
