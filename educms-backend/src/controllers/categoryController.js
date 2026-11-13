const slugify = require("slugify");
const Category = require("../models/Category");

// Convert a name into a unique URL-friendly slug.
const generateUniqueSlug = async (value, excludeCategoryId = null) => {
  const baseSlug = slugify(value, {
    lower: true,
    strict: true,
    trim: true,
  });

  if (!baseSlug) {
    throw new Error("A valid slug could not be generated from the name.");
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingCategory = await Category.findBySlug(slug);

    if (
      !existingCategory ||
      Number(existingCategory.id) === Number(excludeCategoryId)
    ) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
};

// Convert pagination values into safe integers.
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));

  return { page, limit };
};

// Handle PostgreSQL unique constraint errors.
const handleDatabaseError = (error, res, next) => {
  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A category with this slug already exists.",
    });
  }

  return next(error);
};

// Check that a parent exists and does not create a circular hierarchy.
const validateParentCategory = async (categoryId, parentId) => {
  if (parentId === null || parentId === undefined) {
    return { valid: true };
  }

  if (categoryId !== null && Number(categoryId) === Number(parentId)) {
    return {
      valid: false,
      message: "A category cannot be its own parent.",
    };
  }

  let currentParentId = parentId;
  const visited = new Set();

  while (currentParentId !== null && currentParentId !== undefined) {
    const currentId = Number(currentParentId);

    if (visited.has(currentId)) {
      return {
        valid: false,
        message: "The parent category hierarchy contains a cycle.",
      };
    }

    visited.add(currentId);

    if (categoryId !== null && currentId === Number(categoryId)) {
      return {
        valid: false,
        message: "This parent assignment would create a circular hierarchy.",
      };
    }

    const parent = await Category.findById(currentId);

    if (!parent) {
      return {
        valid: false,
        message: "Parent category not found.",
      };
    }

    currentParentId = parent.parent_id;
  }

  return { valid: true };
};

// Create a new category.
const createCategory = async (req, res, next) => {
  try {
    const categoryData = { ...req.body };

    // Generate a slug if one was not provided.
    categoryData.slug = categoryData.slug
      ? await generateUniqueSlug(categoryData.slug)
      : await generateUniqueSlug(categoryData.name);

    // Validate the parent category.
    const parentValidation = await validateParentCategory(
      null,
      categoryData.parentId,
    );

    if (!parentValidation.valid) {
      return res.status(400).json({
        success: false,
        message: parentValidation.message,
      });
    }

    const category = await Category.create(categoryData);

    return res.status(201).json({
      success: true,
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
};

// Retrieve categories with pagination and filters.
const getCategories = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);

    const filters = {
      page,
      limit,
      search: req.query.search,
    };

    if (Object.prototype.hasOwnProperty.call(req.query, "parentId")) {
      filters.parentId = req.query.parentId;
    }

    const [categories, total] = await Promise.all([
      Category.findAll(filters),
      Category.count(filters),
    ]);

    return res.status(200).json({
      success: true,
      data: categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// Retrieve one category by its ID.
const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    return next(error);
  }
};

// Update an existing category.
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const categoryData = { ...req.body };

    // Generate a new slug when the name changes and no slug is provided.
    if (categoryData.name && !categoryData.slug) {
      categoryData.slug = await generateUniqueSlug(
        categoryData.name,
        req.params.id,
      );
    } else if (categoryData.slug) {
      categoryData.slug = await generateUniqueSlug(
        categoryData.slug,
        req.params.id,
      );
    }

    // Validate the parent only when the parent field is being updated.
    if (Object.prototype.hasOwnProperty.call(categoryData, "parentId")) {
      const parentValidation = await validateParentCategory(
        req.params.id,
        categoryData.parentId,
      );

      if (!parentValidation.valid) {
        return res.status(400).json({
          success: false,
          message: parentValidation.message,
        });
      }
    }

    const updatedCategory = await Category.update(req.params.id, categoryData);

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: updatedCategory,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
};

// Delete a category.
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    await Category.remove(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
