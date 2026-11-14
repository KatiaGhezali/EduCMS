const express = require("express");

const categoryController = require("../controllers/categoryController");

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { validateRequest } = require("../middleware/validationMiddleware");

const {
  categoryIdValidation,
  createCategoryValidation,
  updateCategoryValidation,
  getCategoriesValidation,
} = require("../middleware/categoryValidation");

const router = express.Router();
// All category routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management and organization
 *
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Technology
 *         slug:
 *           type: string
 *           example: technology
 *         description:
 *           type: string
 *           nullable: true
 *           example: Articles about technology and innovation.
 *         parent_id:
 *           type: integer
 *           nullable: true
 *           example: null
 *         parent_name:
 *           type: string
 *           nullable: true
 *           example: null
 *         post_count:
 *           type: integer
 *           example: 5
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     CategoryInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: Technology
 *         slug:
 *           type: string
 *           maxLength: 120
 *           example: technology
 *         description:
 *           type: string
 *           nullable: true
 *           example: Articles about technology and innovation.
 *         parentId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *
 *     CategoryUpdate:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: Science and Technology
 *         slug:
 *           type: string
 *           maxLength: 120
 *           example: science-and-technology
 *         description:
 *           type: string
 *           nullable: true
 *         parentId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *
 *     CategoryResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/Category'
 *
 *   parameters:
 *     CategoryId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: integer
 *         minimum: 1
 *       description: The ID of the category.
 */

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a category
 *     description: Creates a new category. If no slug is provided, one is generated automatically from the category name. A parent category can optionally be specified.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Category created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *       400:
 *         description: Invalid category data or invalid parent category.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Only admins and editors can create categories.
 *       409:
 *         description: A category with this slug already exists.
 */
router.post(
  "/",
  authorize("admin", "editor"),
  createCategoryValidation,
  validateRequest,
  categoryController.createCategory,
);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Retrieve all categories
 *     description: Returns a paginated list of categories. Results can be filtered by name or parent category.
 *     tags: [Categories]
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
 *         description: Number of categories per page.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search categories by name.
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: Filter by parent category ID. Use "null" to retrieve top-level categories.
 *         example: "1"
 *     responses:
 *       200:
 *         description: Categories retrieved successfully.
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
 *                     $ref: '#/components/schemas/Category'
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
 *         description: Invalid pagination or filter parameters.
 *       401:
 *         description: Authentication required.
 */
router.get(
  "/",
  getCategoriesValidation,
  validateRequest,
  categoryController.getCategories,
);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Retrieve a category by ID
 *     description: Returns a category, including its parent category name and post count.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CategoryId'
 *     responses:
 *       200:
 *         description: Category retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *       400:
 *         description: Invalid category ID.
 *       401:
 *         description: Authentication required.
 *       404:
 *         description: Category not found.
 */
router.get(
  "/:id",
  categoryIdValidation,
  validateRequest,
  categoryController.getCategoryById,
);

/**
 * @swagger
 * /categories/{id}:
 *   patch:
 *     summary: Update a category
 *     description: Updates an existing category. Admins and editors can modify its name, slug, description, or parent category. Parent assignments are validated to prevent circular hierarchies.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CategoryId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryUpdate'
 *     responses:
 *       200:
 *         description: Category updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *       400:
 *         description: Invalid category data or parent assignment.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Only admins and editors can update categories.
 *       404:
 *         description: Category not found.
 *       409:
 *         description: A category with this slug already exists.
 */
router.patch(
  "/:id",
  authorize("admin", "editor"),
  updateCategoryValidation,
  validateRequest,
  categoryController.updateCategory,
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     description: Deletes an existing category. Only admins and editors can perform this operation.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CategoryId'
 *     responses:
 *       200:
 *         description: Category deleted successfully.
 *       400:
 *         description: Invalid category ID.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Only admins and editors can delete categories.
 *       404:
 *         description: Category not found.
 */
router.delete(
  "/:id",
  authorize("admin", "editor"),
  categoryIdValidation,
  validateRequest,
  categoryController.deleteCategory,
);

module.exports = router;
