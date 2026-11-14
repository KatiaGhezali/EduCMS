const { body, param, query } = require("express-validator");

// Validate the post ID in nested comment routes.
const postIdValidation = [
  param("postId")
    .isInt({ min: 1 })
    .withMessage("Post ID must be a positive integer.")
    .toInt(),
];

// Validate the comment ID.
const commentIdValidation = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("Comment ID must be a positive integer.")
    .toInt(),
];

// Validate data when creating a comment or reply.
const createCommentValidation = [
  ...postIdValidation,

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Comment content is required.")
    .isLength({ max: 5000 })
    .withMessage("Comment content cannot exceed 5000 characters."),

  body("parentId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Parent comment ID must be a positive integer.")
    .toInt(),
];

// Validate data when updating a comment or its moderation status.
const updateCommentValidation = [
  ...commentIdValidation,

  body().custom((value) => {
    const allowedFields = ["content", "status"];

    const hasAllowedField = allowedFields.some((field) =>
      Object.prototype.hasOwnProperty.call(value, field),
    );

    if (!hasAllowedField) {
      throw new Error("At least one valid comment field must be provided.");
    }

    return true;
  }),

  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Comment content cannot be empty.")
    .isLength({ max: 5000 })
    .withMessage("Comment content cannot exceed 5000 characters."),

  body("status")
    .optional()
    .isIn(["pending", "approved", "rejected", "spam"])
    .withMessage("Invalid comment status."),
];

// Validate pagination and filters when retrieving comments.
const getCommentsValidation = [
  ...postIdValidation,

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

  query("status")
    .optional()
    .isIn(["pending", "approved", "rejected", "spam"])
    .withMessage("Invalid comment status."),
];

module.exports = {
  commentIdValidation,
  createCommentValidation,
  updateCommentValidation,
  getCommentsValidation,
};
