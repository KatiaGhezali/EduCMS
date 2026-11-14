const express = require("express");

const mediaController = require("../controllers/mediaController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { uploadSingleMedia } = require("../middleware/uploadMiddleware");

const router = express.Router();

// All media routes require authentication
router.use(authenticate);

// Only Admins, Editors and Authors can manage media
router.use(authorize("admin", "editor", "author"));

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Media upload and management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Media:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         original_filename:
 *           type: string
 *           example: lecture-notes.pdf
 *         stored_filename:
 *           type: string
 *           example: 550e8400-e29b-41d4-a716-446655440000.pdf
 *         file_path:
 *           type: string
 *           example: /uploads/550e8400-e29b-41d4-a716-446655440000.pdf
 *         mime_type:
 *           type: string
 *           example: application/pdf
 *         file_size:
 *           type: integer
 *           example: 204800
 *         alt_text:
 *           type: string
 *           nullable: true
 *           example: Course lecture notes
 *         uploaded_by:
 *           type: integer
 *           example: 2
 *         uploader_username:
 *           type: string
 *           example: katia
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     MediaResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/Media'
 *
 *   parameters:
 *     MediaId:
 *       name: id
 *       in: path
 *       required: true
 *       description: Media record ID
 *       schema:
 *         type: integer
 *         example: 1
 */

/**
 * @swagger
 * /media:
 *   post:
 *     summary: Upload a media file
 *     description: |
 *       Upload a file and create a media record.
 *       Only administrators, editors, and authors can upload media.
 *       Authors can manage only their own uploads.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JPEG, PNG, GIF, WebP, or PDF file (maximum 5 MB by default).
 *               altText:
 *                 type: string
 *                 maxLength: 255
 *                 description: Optional alternative text for the media.
 *     responses:
 *       201:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaResponse'
 *       400:
 *         description: Missing file, invalid file type, invalid file signature, or file too large
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *
 *   get:
 *     summary: Retrieve all media
 *     description: |
 *       Retrieve media records with pagination.
 *       Authors receive only their own uploads. Administrators and editors can
 *       retrieve all media.
 *     tags: [Media]
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
 *         description: Number of media records per page
 *     responses:
 *       200:
 *         description: Media records retrieved successfully
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
 *                     $ref: '#/components/schemas/Media'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */

/**
 * @swagger
 * /media/{id}:
 *   get:
 *     summary: Retrieve one media record
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MediaId'
 *     responses:
 *       200:
 *         description: Media record retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaResponse'
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Authors cannot access another user's media
 *       404:
 *         description: Media not found
 *
 *   patch:
 *     summary: Update media information
 *     description: Update the alternative text of a media record.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MediaId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               altText:
 *                 type: string
 *                 maxLength: 255
 *                 example: Updated course image description
 *     responses:
 *       200:
 *         description: Media information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MediaResponse'
 *       400:
 *         description: Invalid alternative text
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Authors cannot update another user's media
 *       404:
 *         description: Media not found
 *
 *   delete:
 *     summary: Delete media
 *     description: Delete a media record and its associated uploaded file.
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/MediaId'
 *     responses:
 *       200:
 *         description: Media deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Authors cannot delete another user's media
 *       404:
 *         description: Media not found
 */

// Upload a media file
router.post("/", uploadSingleMedia, mediaController.uploadMedia);

// Retrieve all media
router.get("/", mediaController.getAllMedia);

// Retrieve one media record
router.get("/:id", mediaController.getMediaById);

// Update media information
router.patch("/:id", mediaController.updateMedia);

// Delete media
router.delete("/:id", mediaController.deleteMedia);

module.exports = router;
