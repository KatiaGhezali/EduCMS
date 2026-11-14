const express = require("express");
const tagController = require("../controllers/tagController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const {
  tagIdValidation,
  createTagValidation,
  updateTagValidation,
  getTagsValidation,
} = require("../middleware/tagValidation");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tags
 *   description: Tag management and organization
 *
 * components:
 *   schemas:
 *     Tag:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: JavaScript
 *         slug:
 *           type: string
 *           example: javascript
 *         post_count:
 *           type: integer
 *           example: 8
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     TagInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: JavaScript
 *         slug:
 *           type: string
 *           maxLength: 120
 *           example: javascript
 *
 *     TagUpdate:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: TypeScript
 *         slug:
 *           type: string
 *           maxLength: 120
 *           example: typescript
 *
 *     TagResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/Tag'
 *
 *   parameters:
 *     TagId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: The ID of the tag.
 */

// All tag routes require authentication.
router.use(authenticate);

/**
 * @swagger
 * /tags:
 *   post:
 *     summary: Create a tag
 *     description: Creates a new tag. If no slug is provided, one is generated automatically from the tag name.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagInput'
 *     responses:
 *       201:
 *         description: Tag created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagResponse'
 *       400:
 *         description: Invalid tag data.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Only admins and editors can create tags.
 *       409:
 *         description: A tag with this name or slug already exists.
 */
router.post(
  "/",
  authorize("admin", "editor"),
  createTagValidation,
  validateRequest,
  tagController.createTag,
);

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: Retrieve all tags
 *     description: Returns a paginated list of tags, including the number of posts associated with each tag. Supports searching by tag name.
 *     tags: [Tags]
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
 *         description: Number of tags per page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search tags by name.
 *     responses:
 *       200:
 *         description: Tags retrieved successfully.
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
 *                     $ref: '#/components/schemas/Tag'
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
 *         description: Invalid pagination or search parameters.
 *       401:
 *         description: Authentication required.
 */
router.get("/", getTagsValidation, validateRequest, tagController.getTags);

/**
 * @swagger
 * /tags/{id}:
 *   get:
 *     summary: Retrieve a tag by ID
 *     description: Returns a single tag by its ID.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TagId'
 *     responses:
 *       200:
 *         description: Tag retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagResponse'
 *       400:
 *         description: Invalid tag ID.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Tag not found.
 */
router.get("/:id", tagIdValidation, validateRequest, tagController.getTagById);

/**
 * @swagger
 * /tags/{id}:
 *   patch:
 *     summary: Update a tag
 *     description: Updates an existing tag's name or slug. If the name changes without a supplied slug, a new slug is generated automatically.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TagId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagUpdate'
 *     responses:
 *       200:
 *         description: Tag updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagResponse'
 *       400:
 *         description: Invalid tag data.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Only admins and editors can update tags.
 *       404:
 *         description: Tag not found.
 *       409:
 *         description: A tag with this name or slug already exists.
 */
router.patch(
  "/:id",
  authorize("admin", "editor"),
  updateTagValidation,
  validateRequest,
  tagController.updateTag,
);

/**
 * @swagger
 * /tags/{id}:
 *   delete:
 *     summary: Delete a tag
 *     description: Deletes an existing tag. Only admins and editors can perform this operation.
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/TagId'
 *     responses:
 *       200:
 *         description: Tag deleted successfully.
 *       400:
 *         description: Invalid tag ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Only admins and editors can delete tags.
 *       404:
 *         description: Tag not found.
 */
router.delete(
  "/:id",
  authorize("admin", "editor"),
  tagIdValidation,
  validateRequest,
  tagController.deleteTag,
);

module.exports = router;
