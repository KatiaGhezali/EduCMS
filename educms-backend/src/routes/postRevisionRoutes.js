const express = require("express");

const {
  getPostRevisions,
  getPostRevisionById,
  restorePostRevision,
} = require("../controllers/postRevisionController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// Retrieve post revision history
router.get(
  "/:postId/revisions",
  authenticate,
  authorize("admin", "editor"),
  getPostRevisions,
);

// Retrieve a specific revision
router.get(
  "/:postId/revisions/:revisionId",
  authenticate,
  authorize("admin", "editor"),
  getPostRevisionById,
);

// Restore a specific revision
router.post(
  "/:postId/revisions/:revisionId/restore",
  authenticate,
  authorize("admin", "editor"),
  restorePostRevision,
);

module.exports = router;
