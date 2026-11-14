const express = require("express");

const userController = require("../controllers/userController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and account management
 */

// All user routes require authentication.
router.use(authenticate);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: User not found.
 */
router.get("/profile", userController.getProfile);

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update the current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: katia123
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               firstName:
 *                 type: string
 *                 example: Katia
 *               lastName:
 *                 type: string
 *                 example: Ghezali
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: User not found.
 *       409:
 *         description: Email or username is already in use.
 */
router.patch("/profile", userController.updateProfile);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Admin-only endpoint with pagination and optional role filtering.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Number of users per page.
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, editor, author, subscriber]
 *         description: Filter users by role.
 *     responses:
 *       200:
 *         description: Users retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin privileges required.
 */
router.get("/", authorize("admin"), userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Admin-only endpoint to retrieve a specific user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID.
 *     responses:
 *       200:
 *         description: User retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Admin privileges required.
 *       404:
 *         description: User not found.
 */
router.get("/:id", authorize("admin"), userController.getUserById);

module.exports = router;
