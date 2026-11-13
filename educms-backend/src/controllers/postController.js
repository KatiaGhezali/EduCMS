const slugify = require("slugify");
const Post = require("../models/Post");

// Convert a title into a unique URL-friendly slug
const generateUniqueSlug = async (title, excludePostId = null) => {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  if (!baseSlug) {
    throw new Error("A valid slug could not be generated from the title.");
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingPost = await Post.findBySlug(slug);

    if (!existingPost || Number(existingPost.id) === Number(excludePostId)) {
      return slug;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }
};

// Convert pagination values into safe integers
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
      message: "A post with this slug already exists.",
    });
  }

  return next(error);
};

// Create a new post
const createPost = async (req, res, next) => {
  try {
    const postData = {
      ...req.body,
      authorId: req.user.id,
    };

    // Authors cannot control featured status or publication date
    if (req.user.role === "author") {
      delete postData.isFeatured;
      delete postData.publishedAt;
    }

    // Generate a slug if one was not provided
    postData.slug = postData.slug
      ? await generateUniqueSlug(postData.slug)
      : await generateUniqueSlug(postData.title);

    const post = await Post.create(postData);

    return res.status(201).json({
      success: true,
      message: "Post created successfully.",
      data: post,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
};

// Retrieve posts with pagination and filters
const getPosts = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query);

    const filters = {
      page,
      limit,
      search: req.query.search,
      categoryId: req.query.categoryId,
      status: req.query.status,
      tagId: req.query.tagId,
    };

    // Only admins and editors can filter by author ID
    if (["admin", "editor"].includes(req.user.role) && req.query.authorId) {
      filters.authorId = req.query.authorId;
    }

    // Subscribers can only access published posts
    if (req.user.role === "subscriber") {
      filters.status = "published";
    }

    // Authors can see their own posts and all published posts
    if (req.user.role === "author") {
      filters.authorIdOrPublished = req.user.id;
    }

    // Only admins and editors can filter by featured status
    if (["admin", "editor"].includes(req.user.role)) {
      if (req.query.isFeatured === "true") {
        filters.isFeatured = true;
      } else if (req.query.isFeatured === "false") {
        filters.isFeatured = false;
      }
    }

    const [posts, total] = await Promise.all([
      Post.findAll(filters),
      Post.count(filters),
    ]);

    return res.status(200).json({
      success: true,
      data: posts,
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

// Retrieve one post by its ID
const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const isOwner = Number(post.author_id) === Number(req.user.id);

    // Subscribers can only read published posts
    if (req.user.role === "subscriber" && post.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    // Authors can read published posts and their own unpublished posts
    if (req.user.role === "author" && post.status !== "published" && !isOwner) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    return next(error);
  }
};

// Update an existing post
const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const isAdminOrEditor = ["admin", "editor"].includes(req.user.role);
    const isOwner = Number(post.author_id) === Number(req.user.id);

    // Authors can only update their own posts
    if (!isAdminOrEditor && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this post.",
      });
    }

    const postData = { ...req.body };

    // Authors cannot change featured status or publication date
    if (req.user.role === "author") {
      if (
        Object.prototype.hasOwnProperty.call(postData, "isFeatured") ||
        Object.prototype.hasOwnProperty.call(postData, "publishedAt")
      ) {
        return res.status(403).json({
          success: false,
          message: "Authors cannot change featured status or publication date.",
        });
      }
    }

    // Generate a new slug when the title changes and no slug is provided
    if (postData.title && !postData.slug) {
      postData.slug = await generateUniqueSlug(postData.title, req.params.id);
    } else if (postData.slug) {
      postData.slug = await generateUniqueSlug(postData.slug, req.params.id);
    }

    const updatedPost = await Post.update(req.params.id, postData, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      data: updatedPost,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
};

// Delete a post
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const isAdminOrEditor = ["admin", "editor"].includes(req.user.role);
    const isOwner = Number(post.author_id) === Number(req.user.id);

    // Authors can only delete their own posts
    if (!isAdminOrEditor && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this post.",
      });
    }

    await Post.remove(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
};
