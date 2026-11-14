const express = require("express");

const {
  getPostRevisions,
  getPostRevisionById,
  restorePostRevision,
} = require("../controllers/postRevisionController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Post Revisions
 *   description: Post revision history and restoration
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PostRevision:
 *       type: object
 *       properties:
 *         revision_id:
 *           type: integer
 *           example: 1
 *         post_id:
 *           type: integer
 *           example: 5
 *         title:
 *           type: string
 *         slug:
 *           type: string
 *         content:
 *           type: string
 *         excerpt:
 *           type: string
 *           nullable: true
 *         category_id:
 *           type: integer
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *         published_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         revision_number:
 *           type: integer
 *         created_by:
 *           type: integer
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     PostRevisionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/PostRevision'
 *
 *   parameters:
 *     RevisionPostId:
 *       name: postId
 *       in: path
 *       required: true
 *       description: ID of the post
 *       schema:
 *         type: integer
 *         minimum: 1
 *         example: 5
 *
 *     RevisionId:
 *       name: revisionId
 *       in: path
 *       required: true
 *       description: ID of the revision
 *       schema:
 *         type: integer
 *         minimum: 1
 *         example: 2
 */

/**
 * @swagger
 * /posts/{postId}/revisions:
 *   get:
 *     summary: Retrieve post revision history
 *     description: Retrieve all saved revisions for a post, ordered from newest to oldest. Administrators and editors only.
 *     tags: [Post Revisions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/RevisionPostId'
 *     responses:
 *       200:
 *         description: Post revisions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PostRevision'
 *       400:
 *         description: Invalid post ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrators and editors only
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /posts/{postId}/revisions/{revisionId}:
 *   get:
 *     summary: Retrieve a specific post revision
 *     description: Retrieve a specific saved revision belonging to a post. Administrators and editors only.
 *     tags: [Post Revisions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/RevisionPostId'
 *       - $ref: '#/components/parameters/RevisionId'
 *     responses:
 *       200:
 *         description: Post revision retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostRevisionResponse'
 *       400:
 *         description: Invalid post ID or revision ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrators and editors only
 *       404:
 *         description: Post revision not found
 */

/**
 * @swagger
 * /posts/{postId}/revisions/{revisionId}/restore:
 *   post:
 *     summary: Restore a previous post revision
 *     description: |
 *       Restore a selected revision of a post.
 *       The current post state is saved as a new revision before restoration.
 *       A unique slug is generated for the restored post.
 *       Administrators and editors only.
 *     tags: [Post Revisions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/RevisionPostId'
 *       - $ref: '#/components/parameters/RevisionId'
 *     responses:
 *       200:
 *         description: Post revision restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostResponse'
 *       400:
 *         description: Invalid post ID or revision ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Administrators and editors only
 *       404:
 *         description: Post or revision not found
 */

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
