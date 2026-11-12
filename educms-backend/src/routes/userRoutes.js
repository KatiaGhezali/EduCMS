const express = require("express");

const userController = require("../controllers/userController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Current user's profile
router.get("/profile", userController.getProfile);

router.patch("/profile", userController.updateProfile);

// Administrative routes (Admin only)
router.get("/", authorize("admin"), userController.getAllUsers);

router.get("/:id", authorize("admin"), userController.getUserById);

module.exports = router;
