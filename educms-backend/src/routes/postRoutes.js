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

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Post creation, retrieval, and management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: Introduction to JavaScript
 *         slug:
 *           type: string
 *           example: introduction-to-javascript
 *         excerpt:
 *           type: string
 *           nullable: true
 *         content:
 *           type: string
 *         author_id:
 *           type: integer
 *         author:
 *           type: string
 *           example: katia
 *         category_id:
 *           type: integer
 *           nullable: true
 *         category:
 *           type: string
 *           nullable: true
 *         featured_media_id:
 *           type: integer
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *         meta_title:
 *           type: string
 *           nullable: true
 *         meta_description:
 *           type: string
 *           nullable: true
 *         is_featured:
 *           type: boolean
 *         comments_enabled:
 *           type: boolean
 *         reading_time:
 *           type: integer
 *         view_count:
 *           type: integer
 *         published_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         tags:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *
 *     PostInput:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 255
 *           example: Introduction to JavaScript
 *         slug:
 *           type: string
 *           minLength: 1
 *           maxLength: 280
 *           example: introduction-to-javascript
 *         content:
 *           type: string
 *           example: JavaScript is a programming language...
 *         excerpt:
 *           type: string
 *           nullable: true
 *         categoryId:
 *           type: integer
 *           nullable: true
 *         featuredMediaId:
 *           type: integer
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *           default: draft
 *         metaTitle:
 *           type: string
 *           maxLength: 255
 *           nullable: true
 *         metaDescription:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *         isFeatured:
 *           type: boolean
 *           default: false
 *         commentsEnabled:
 *           type: boolean
 *           default: true
 *         readingTime:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         publishedAt:
 *           type: string
 *           format: date-time
 *
 *     PostUpdate:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 255
 *         slug:
 *           type: string
 *           minLength: 1
 *           maxLength: 280
 *         content:
 *           type: string
 *         excerpt:
 *           type: string
 *           nullable: true
 *         categoryId:
 *           type: integer
 *           nullable: true
 *         featuredMediaId:
 *           type: integer
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *         metaTitle:
 *           type: string
 *           maxLength: 255
 *           nullable: true
 *         metaDescription:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *         isFeatured:
 *           type: boolean
 *         commentsEnabled:
 *           type: boolean
 *         readingTime:
 *           type: integer
 *           minimum: 1
 *         publishedAt:
 *           type: string
 *           format: date-time
 *
 *     PostResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/Post'
 *
 *   parameters:
 *     PostId:
 *       name: id
 *       in: path
 *       required: true
 *       description: Post ID
 *       schema:
 *         type: integer
 *         minimum: 1
 *         example: 1
 */

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a post
 *     description: |
 *       Create a new post. Only administrators, editors, and authors can
 *       create posts. Authors cannot control featured status or publication date.
 *       A unique slug is generated automatically if one is not provided.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostInput'
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostResponse'
 *       400:
 *         description: Invalid post data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: A post with this slug already exists
 *
 *   get:
 *     summary: Retrieve posts
 *     description: |
 *       Retrieve posts with pagination and optional filters.
 *       Subscribers can only see published posts. Authors can see their own
 *       posts and all published posts. Administrators and editors can access
 *       all posts and use the author and featured filters.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of posts per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in post titles, content, and excerpts
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: tagId
 *         schema:
 *           type: integer
 *         description: Filter by tag ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by post status
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: integer
 *         description: Filter by author ID (administrators and editors only)
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: boolean
 *         description: Filter by featured status (administrators and editors only)
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
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
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Retrieve a post by ID
 *     description: Subscribers can only access published posts. Authors can access their own unpublished posts and all published posts.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PostId'
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostResponse'
 *       400:
 *         description: Invalid post ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Post not found
 *
 *   patch:
 *     summary: Update a post
 *     description: |
 *       Update an existing post. Administrators and editors can update any post.
 *       Authors can update only their own posts and cannot change featured
 *       status or publication date. The previous post state is saved as a revision.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PostId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostUpdate'
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostResponse'
 *       400:
 *         description: Invalid post ID or update data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not allowed to update this post
 *       404:
 *         description: Post not found
 *       409:
 *         description: A post with this slug already exists
 *
 *   delete:
 *     summary: Delete a post
 *     description: Administrators and editors can delete any post. Authors can delete only their own posts.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PostId'
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       400:
 *         description: Invalid post ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Not allowed to delete this post
 *       404:
 *         description: Post not found
 */

// Create a post
router.post(
  "/",
  authorize("admin", "editor", "author"),
  createPostValidation,
  validateRequest,
  postController.createPost,
);

// Retrieve posts with pagination and filters
router.get("/", getPostsValidation, validateRequest, postController.getPosts);

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
