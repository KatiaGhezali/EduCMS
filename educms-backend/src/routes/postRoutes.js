const express = require("express");

const postController = require("../controllers/postController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const {
  postIdValidation,
  createPostValidation,
  updatePostValidation,
  getPostsValidation,
} = require("../middleware/postValidation");

const router = express.Router();

// All post routes require authentication
router.use(authenticate);

// Create a post
router.post(
  "/",
  authorize("admin", "editor", "author"),
  createPostValidation,
  validateRequest,
  postController.createPost,
);

// Retrieve posts with pagination and filters
router.get(
  "/",
  getPostsValidation,
  validateRequest,
  postController.getPosts,
);

// Retrieve a post by ID
router.get(
  "/:id",
  postIdValidation,
  validateRequest,
  postController.getPostById,
);

// Update a post
router.patch(
  "/:id",
  authorize("admin", "editor", "author"),
  updatePostValidation,
  validateRequest,
  postController.updatePost,
);

// Delete a post
router.delete(
  "/:id",
  authorize("admin", "editor", "author"),
  postIdValidation,
  validateRequest,
  postController.deletePost,
);

module.exports = router;
