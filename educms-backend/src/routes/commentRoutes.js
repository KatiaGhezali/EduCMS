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

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comment creation, retrieval, and moderation
 *
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         post_id:
 *           type: integer
 *           example: 5
 *         user_id:
 *           type: integer
 *           example: 2
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         content:
 *           type: string
 *           example: Great article!
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, spam]
 *           example: pending
 *         username:
 *           type: string
 *           example: katia
 *         first_name:
 *           type: string
 *           example: Katia
 *         last_name:
 *           type: string
 *           example: Ghezali
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     CommentInput:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           maxLength: 5000
 *           example: This is a very useful article!
 *         parentId:
 *           type: integer
 *           nullable: true
 *           description: ID of the parent comment when creating a reply.
 *           example: 3
 *
 *     CommentUpdate:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         content:
 *           type: string
 *           maxLength: 5000
 *           example: Updated comment content.
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, spam]
 *           description: Only admins and editors can change the moderation status.
 *           example: approved
 *
 *     CommentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/Comment'
 *
 *   parameters:
 *     CommentPostId:
 *       in: path
 *       name: postId
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: ID of the post.
 *
 *     CommentId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: ID of the comment.
 */

// All comment routes require authentication.
router.use(authenticate);

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: Retrieve comments belonging to a post
 *     description: Returns paginated comments for a post. By default, only approved comments are returned. Admins and editors can retrieve comments with other moderation statuses. Regular users can only access comments on published posts.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CommentPostId'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of comments per page.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, spam]
 *           default: approved
 *         description: Filter comments by moderation status. Non-moderators can only retrieve approved comments.
 *     responses:
 *       200:
 *         description: Comments retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid post ID or query parameters.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Insufficient permissions to view comments with this status.
 *       404:
 *         description: Post not found.
 */
router.get(
  "/posts/:postId/comments",
  getCommentsValidation,
  validateRequest,
  commentController.getCommentsByPost,
);

/**
 * @swagger
 * /posts/{postId}/comments:
 *   post:
 *     summary: Create a comment or reply
 *     description: Submits a comment on a post. Comments are always created with pending status and must be approved by a moderator before becoming publicly visible. A parentId can be provided to create a reply.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CommentPostId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommentInput'
 *     responses:
 *       201:
 *         description: Comment submitted successfully and is awaiting moderation.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       400:
 *         description: Invalid comment data or parent comment.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Post not found or unavailable.
 */
router.post(
  "/posts/:postId/comments",
  createCommentValidation,
  validateRequest,
  commentController.createComment,
);

/**
 * @swagger
 * /comments/{id}:
 *   get:
 *     summary: Retrieve a comment by ID
 *     description: Returns a comment by its ID. Admins and editors can view all comments. Regular users can view approved comments and their own pending or rejected comments.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CommentId'
 *     responses:
 *       200:
 *         description: Comment retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       400:
 *         description: Invalid comment ID.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Comment not found or unavailable.
 */
router.get(
  "/comments/:id",
  commentIdValidation,
  validateRequest,
  commentController.getCommentById,
);

/**
 * @swagger
 * /comments/{id}:
 *   patch:
 *     summary: Update or moderate a comment
 *     description: Comment owners can update their own comment content. Admins and editors can update any comment and change its moderation status.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CommentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommentUpdate'
 *     responses:
 *       200:
 *         description: Comment updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentResponse'
 *       400:
 *         description: Invalid comment data.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: User cannot update this comment or change its moderation status.
 *       404:
 *         description: Comment not found.
 */
router.patch(
  "/comments/:id",
  updateCommentValidation,
  validateRequest,
  commentController.updateComment,
);

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     description: Comment owners can delete their own comments. Admins and editors can delete any comment.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CommentId'
 *     responses:
 *       200:
 *         description: Comment deleted successfully.
 *       400:
 *         description: Invalid comment ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: User cannot delete this comment.
 *       404:
 *         description: Comment not found.
 */
router.delete(
  "/comments/:id",
  commentIdValidation,
  validateRequest,
  commentController.deleteComment,
);

module.exports = router;
