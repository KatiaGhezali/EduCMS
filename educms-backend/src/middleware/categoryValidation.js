const { body, param, query } = require("express-validator");

// Validate the category ID in route parameters.
const categoryIdValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Category ID must be a positive integer.")
    .toInt(),
];

// Validate data when creating a category.
const createCategoryValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required.")
    .isLength({ max: 100 })
    .withMessage("Category name cannot exceed 100 characters."),

  body("slug")
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("Slug must be between 1 and 120 characters.")
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("Slug can only contain letters, numbers, and hyphens."),

  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage("Description must be a string."),

  body("parentId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Parent category ID must be a positive integer.")
    .toInt(),
];

// Validate data when updating a category.
const updateCategoryValidation = [
  ...categoryIdValidation,

  body().custom((value) => {
    const allowedFields = ["name", "slug", "description", "parentId"];

    const hasAllowedField = allowedFields.some((field) =>
      Object.prototype.hasOwnProperty.call(value, field),
    );

    if (!hasAllowedField) {
      throw new Error("At least one valid category field must be provided.");
    }

    return true;
  }),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty.")
    .isLength({ max: 100 })
    .withMessage("Category name cannot exceed 100 characters."),

  body("slug")
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage("Slug must be between 1 and 120 characters.")
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("Slug can only contain letters, numbers, and hyphens."),

  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage("Description must be a string."),

  body("parentId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Parent category ID must be a positive integer.")
    .toInt(),
];

// Validate pagination and filters when retrieving categories.
const getCategoriesValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer.")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100.")
    .toInt(),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search cannot exceed 100 characters."),

  query("parentId")
    .optional()
    .customSanitizer((value) => (value === "null" ? null : value))
    .custom((value) => {
      if (value === null) {
        return true;
      }

      if (!/^[1-9]\d*$/.test(value)) {
        throw new Error(
          "Parent category ID must be a positive integer or null.",
        );
      }

      return true;
    })
    .customSanitizer((value) => (value === null ? null : Number(value))),
];

module.exports = {
  categoryIdValidation,
  createCategoryValidation,
  updateCategoryValidation,
  getCategoriesValidation,
};
