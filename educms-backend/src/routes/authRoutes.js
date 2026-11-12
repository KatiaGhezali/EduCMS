const express = require("express");

const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

// Public authentication routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Protected authentication route
router.post("/logout-all", authenticate, authController.logoutAll);

module.exports = router;
