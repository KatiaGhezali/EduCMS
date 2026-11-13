const express = require("express");
const tagController = require("../controllers/tagController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const {
  tagIdValidation,
  createTagValidation,
  updateTagValidation,
  getTagsValidation,
} = require("../middleware/tagValidation");

const router = express.Router();

// All tag routes require authentication.
router.use(authenticate);

// Create a tag (admin and editor only)
router.post(
  "/",
  authorize("admin", "editor"),
  createTagValidation,
  validateRequest,
  tagController.createTag,
);

// Retrieve all tags (all authenticated roles)
router.get("/", getTagsValidation, validateRequest, tagController.getTags);

// Retrieve one tag by ID
router.get("/:id", tagIdValidation, validateRequest, tagController.getTagById);

// Update a tag (admin and editor only)
router.patch(
  "/:id",
  authorize("admin", "editor"),
  updateTagValidation,
  validateRequest,
  tagController.updateTag,
);

// Delete a tag (admin and editor only)
router.delete(
  "/:id",
  authorize("admin", "editor"),
  tagIdValidation,
  validateRequest,
  tagController.deleteTag,
);

module.exports = router;
