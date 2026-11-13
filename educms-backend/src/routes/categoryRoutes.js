const express = require("express");

const categoryController = require("../controllers/categoryController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const {
  categoryIdValidation,
  createCategoryValidation,
  updateCategoryValidation,
  getCategoriesValidation,
} = require("../middleware/categoryValidation");

const router = express.Router();

// All category routes require authentication.
router.use(authenticate);

// Create a category (admins and editors only).
router.post(
  "/",
  authorize("admin", "editor"),
  createCategoryValidation,
  validateRequest,
  categoryController.createCategory,
);

// Retrieve categories with pagination and filters.
router.get(
  "/",
  getCategoriesValidation,
  validateRequest,
  categoryController.getCategories,
);

// Retrieve a category by ID.
router.get(
  "/:id",
  categoryIdValidation,
  validateRequest,
  categoryController.getCategoryById,
);

// Update a category (admins and editors only).
router.patch(
  "/:id",
  authorize("admin", "editor"),
  updateCategoryValidation,
  validateRequest,
  categoryController.updateCategory,
);

// Delete a category (admins and editors only).
router.delete(
  "/:id",
  authorize("admin", "editor"),
  categoryIdValidation,
  validateRequest,
  categoryController.deleteCategory,
);

module.exports = router;
