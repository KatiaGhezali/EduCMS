const slugify = require("slugify");
const Tag = require("../models/Tag");

// Generate a unique slug
const generateUniqueSlug = async (value, excludeTagId = null) => {
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
    const existingTag = await Tag.findBySlug(slug);

    if (!existingTag || Number(existingTag.id) === Number(excludeTagId)) {
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

// Handle PostgreSQL unique constraint errors
const handleDatabaseError = (error, res, next) => {
  if (error.code === "23505") {
    return res.status(409).json({
      success: false,
      message: "A tag with this name or slug already exists.",
    });
  }

  return next(error);
};

// Create a new tag.
const createTag = async (req, res, next) => {
  try {
    const tagData = { ...req.body };

    // Generate a slug when one was not provided.
    tagData.slug = tagData.slug
      ? await generateUniqueSlug(tagData.slug)
      : await generateUniqueSlug(tagData.name);

    const tag = await Tag.create(tagData);

    return res.status(201).json({
      success: true,
      message: "Tag created successfully.",
      data: tag,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
};

// Retrieve tags with pagination and search
const getTags = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);

    const filters = {
      page,
      limit,
      search: req.query.search,
    };

    const [tags, total] = await Promise.all([
      Tag.findAll(filters),
      Tag.count(filters),
    ]);

    return res.status(200).json({
      success: true,
      data: tags,
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

// Retrieve one tag by ID
const getTagById = async (req, res, next) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: tag,
    });
  } catch (error) {
    return next(error);
  }
};

// Update an existing tag.
const updateTag = async (req, res, next) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found.",
      });
    }

    const tagData = { ...req.body };

    // Generate a new slug if the name changes and no slug is provided.
    if (tagData.name && !tagData.slug) {
      tagData.slug = await generateUniqueSlug(tagData.name, req.params.id);
    } else if (tagData.slug) {
      tagData.slug = await generateUniqueSlug(tagData.slug, req.params.id);
    }

    const updatedTag = await Tag.update(req.params.id, tagData);

    return res.status(200).json({
      success: true,
      message: "Tag updated successfully.",
      data: updatedTag,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
};

// Delete a tag.
const deleteTag = async (req, res, next) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found.",
      });
    }

    await Tag.remove(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Tag deleted successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createTag,
  getTags,
  getTagById,
  updateTag,
  deleteTag,
};
