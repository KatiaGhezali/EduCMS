const express = require("express");

const commentController = require("../controllers/commentController");

const { authenticate } = require("../middleware/authMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const {
  commentIdValidation,
  createCommentValidation,
  updateCommentValidation,
  getCommentsValidation,
} = require("../middleware/commentValidation");

const router = express.Router();

// All comment routes require authentication.
router.use(authenticate);

// Retrieve comments belonging to a post.
router.get(
  "/posts/:postId/comments",
  getCommentsValidation,
  validateRequest,
  commentController.getCommentsByPost,
);

// Create a comment or reply.
router.post(
  "/posts/:postId/comments",
  createCommentValidation,
  validateRequest,
  commentController.createComment,
);

// Retrieve a comment by ID.
router.get(
  "/comments/:id",
  commentIdValidation,
  validateRequest,
  commentController.getCommentById,
);

// Update a comment or its moderation status.
router.patch(
  "/comments/:id",
  updateCommentValidation,
  validateRequest,
  commentController.updateComment,
);

// Delete a comment.
router.delete(
  "/comments/:id",
  commentIdValidation,
  validateRequest,
  commentController.deleteComment,
);

module.exports = router;
