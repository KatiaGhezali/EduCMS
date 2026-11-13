const express = require("express");

const mediaController = require("../controllers/mediaController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { uploadSingleMedia } = require("../middleware/uploadMiddleware");

const router = express.Router();

// All media routes require authentication
router.use(authenticate);

// Only Admins, Editors and Authors can manage media
router.use(authorize("admin", "editor", "author"));

// Upload a media file
router.post("/", uploadSingleMedia, mediaController.uploadMedia);

// Retrieve all media
router.get("/", mediaController.getAllMedia);

// Retrieve one media record
router.get("/:id", mediaController.getMediaById);

// Update media information
router.patch("/:id", mediaController.updateMedia);

// Delete media
router.delete("/:id", mediaController.deleteMedia);

module.exports = router;
