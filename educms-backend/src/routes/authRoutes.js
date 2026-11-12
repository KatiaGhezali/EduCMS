const express = require("express");

const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

const { validateRequest } = require("../middleware/validationMiddleware");

const {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
} = require("../middleware/authValidation");

const router = express.Router();

// Public authentication routes
router.post(
  "/register",
  registerValidation,
  validateRequest,
  authController.register,
);

router.post("/login", loginValidation, validateRequest, authController.login);

router.post(
  "/refresh",
  refreshTokenValidation,
  validateRequest,
  authController.refresh,
);

router.post(
  "/logout",
  refreshTokenValidation,
  validateRequest,
  authController.logout,
);

// Protected authentication route
router.post("/logout-all", authenticate, authController.logoutAll);

module.exports = router;
