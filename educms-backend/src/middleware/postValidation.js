const { body, param, query } = require("express-validator");

// Validate the ID in post routes
const postIdValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Post ID must be a positive integer.")
    .toInt(),
];

// Validate data when creating a post
const createPostValidation = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Post title is required.")
    .isLength({ max: 255 })
    .withMessage("Post title cannot exceed 255 characters."),

  body("slug")
    .optional()
    .trim()
    .isLength({ min: 1, max: 280 })
    .withMessage("Slug must be between 1 and 280 characters.")
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("Slug can only contain letters, numbers, and hyphens."),

  body("content")
    .notEmpty()
    .withMessage("Post content is required.")
    .isString()
    .withMessage("Post content must be a string."),

  body("excerpt")
    .optional({ nullable: true })
    .isString()
    .withMessage("Excerpt must be a string."),

  body("categoryId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Category ID must be a positive integer.")
    .toInt(),

  body("featuredMediaId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Featured media ID must be a positive integer.")
    .toInt(),

  body("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Status must be draft, published, or archived."),

  body("metaTitle")
    .optional({ nullable: true })
    .isLength({ max: 255 })
    .withMessage("Meta title cannot exceed 255 characters."),

  body("metaDescription")
    .optional({ nullable: true })
    .isLength({ max: 500 })
    .withMessage("Meta description cannot exceed 500 characters."),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean.")
    .toBoolean(),

  body("commentsEnabled")
    .optional()
    .isBoolean()
    .withMessage("commentsEnabled must be a boolean.")
    .toBoolean(),

  body("readingTime")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Reading time must be a positive integer.")
    .toInt(),

  body("publishedAt")
    .optional()
    .isISO8601()
    .withMessage("Published date must be a valid ISO 8601 date."),
];

// Validate data when updating a post
const updatePostValidation = [
  ...postIdValidation,

  body().custom((value) => {
    const allowedFields = [
      "title",
      "slug",
      "excerpt",
      "content",
      "categoryId",
      "featuredMediaId",
      "status",
      "metaTitle",
      "metaDescription",
      "isFeatured",
      "commentsEnabled",
      "readingTime",
      "publishedAt",
    ];

    const hasAllowedField = allowedFields.some((field) =>
      Object.prototype.hasOwnProperty.call(value, field),
    );

    if (!hasAllowedField) {
      throw new Error("At least one valid post field must be provided.");
    }

    return true;
  }),

  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Post title cannot be empty.")
    .isLength({ max: 255 })
    .withMessage("Post title cannot exceed 255 characters."),

  body("slug")
    .optional()
    .trim()
    .isLength({ min: 1, max: 280 })
    .withMessage("Slug must be between 1 and 280 characters.")
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("Slug can only contain letters, numbers, and hyphens."),

  body("content")
    .optional()
    .notEmpty()
    .withMessage("Post content cannot be empty.")
    .isString()
    .withMessage("Post content must be a string."),

  body("excerpt")
    .optional({ nullable: true })
    .isString()
    .withMessage("Excerpt must be a string."),

  body("categoryId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Category ID must be a positive integer.")
    .toInt(),

  body("featuredMediaId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Featured media ID must be a positive integer.")
    .toInt(),

  body("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Status must be draft, published, or archived."),

  body("metaTitle")
    .optional({ nullable: true })
    .isLength({ max: 255 })
    .withMessage("Meta title cannot exceed 255 characters."),

  body("metaDescription")
    .optional({ nullable: true })
    .isLength({ max: 500 })
    .withMessage("Meta description cannot exceed 500 characters."),

  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean.")
    .toBoolean(),

  body("commentsEnabled")
    .optional()
    .isBoolean()
    .withMessage("commentsEnabled must be a boolean.")
    .toBoolean(),

  body("readingTime")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Reading time must be a positive integer.")
    .toInt(),

  body("publishedAt")
    .optional()
    .isISO8601()
    .withMessage("Published date must be a valid ISO 8601 date."),
];

// Validate pagination and filters when retrieving posts
const getPostsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100."),

  query("categoryId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Category ID must be a positive integer."),

  query("authorId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Author ID must be a positive integer."),

  query("tagId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Tag ID must be a positive integer."),

  query("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Invalid post status."),

  query("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured must be a boolean."),
];

module.exports = {
  postIdValidation,
  createPostValidation,
  updatePostValidation,
  getPostsValidation,
};
