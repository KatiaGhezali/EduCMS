const express = require("express");

const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

const { validateRequest } = require("../middleware/validationMiddleware");

const {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
} = require("../middleware/authValidation");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, and session management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new subscriber account and returns authentication tokens.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               username:
 *                 type: string
 *                 example: katia123
 *                 minLength: 3
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 12
 *                 example: StrongPassword123
 *               firstName:
 *                 type: string
 *                 example: Katia
 *               lastName:
 *                 type: string
 *                 example: Ghezali
 *     responses:
 *       201:
 *         description: Account created successfully.
 *       400:
 *         description: Validation error.
 *       409:
 *         description: Email or username is already registered.
 */
router.post(
  "/register",
  registerValidation,
  validateRequest,
  authController.register,
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in an existing user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPassword123
 *     responses:
 *       200:
 *         description: Logged in successfully.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Invalid email or password.
 *       403:
 *         description: Account is inactive.
 */
router.post("/login", loginValidation, validateRequest, authController.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh authentication tokens
 *     description: Rotates the refresh token and returns a new access and refresh token.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Current valid refresh token.
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully.
 *       400:
 *         description: Missing or invalid request data.
 *       401:
 *         description: Invalid, expired, revoked, or previously used refresh token.
 */
router.post(
  "/refresh",
  refreshTokenValidation,
  validateRequest,
  authController.refresh,
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out from the current session
 *     description: Revokes the supplied refresh token.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token belonging to the current session.
 *     responses:
 *       200:
 *         description: Logged out successfully.
 *       400:
 *         description: Missing or invalid request data.
 *       401:
 *         description: Invalid or already revoked refresh token.
 */
router.post(
  "/logout",
  refreshTokenValidation,
  validateRequest,
  authController.logout,
);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     summary: Log out from all devices
 *     description: Revokes all active refresh tokens belonging to the authenticated user.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully.
 *       401:
 *         description: Authentication required or access token invalid.
 */
router.post("/logout-all", authenticate, authController.logoutAll);

module.exports = router;
