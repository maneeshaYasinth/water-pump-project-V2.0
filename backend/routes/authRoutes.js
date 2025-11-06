const express = require("express");
const { register, login } = require("../controllers/authController");
const { ADMIN_SECRET_KEY } = require("../config/adminConfig");
const { isAuthority } = require("../middleware/authMiddleware");

const router = express.Router();

// Regular user registration
router.post("/register", register);

// Admin/Authority registration (requires admin secret key)
router.post("/register-admin", async (req, res) => {
    const { adminSecretKey, ...userData } = req.body;
    
    // Verify admin secret key
    if (adminSecretKey !== ADMIN_SECRET_KEY) {
        return res.status(403).json({ message: "Invalid admin secret key" });
    }

    // Ensure role is either admin or authority
    if (!['admin', 'authority'].includes(userData.role)) {
        return res.status(400).json({ message: "Invalid role specified" });
    }

    try {
        // Call the regular register function with admin/authority role
        await register({ body: userData }, res);
    } catch (error) {
        console.error("Admin registration error:", error);
        res.status(500).json({ message: "Error creating admin user" });
    }
});

router.post("/login", login);

module.exports = router;
