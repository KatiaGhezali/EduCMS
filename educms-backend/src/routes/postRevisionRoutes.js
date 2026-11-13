const express = require("express");

const {
  getPostRevisions,
  getPostRevisionById,
  restorePostRevision,
} = require("../controllers/postRevisionController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// All revision endpoints require an authenticated admin or editor
router.use(authenticate, authorize("admin", "editor"));

// Retrieve all revisions of a post
router.get("/:postId/revisions", getPostRevisions);

// Retrieve one specific revision
router.get("/:postId/revisions/:revisionId", getPostRevisionById);

// Restore a specific revision
router.post("/:postId/revisions/:revisionId/restore", restorePostRevision);

module.exports = router;
