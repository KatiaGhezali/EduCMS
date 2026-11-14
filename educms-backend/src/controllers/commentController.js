const Comment = require("../models/Comment");
const Post = require("../models/Post");

const isModerator = (user) => ["admin", "editor"].includes(user.role);

// Convert pagination values into safe integers.
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));

  return { page, limit };
};

// Handle database constraint errors.
const handleDatabaseError = (error, res, next) => {
  if (error.code === "23503") {
    return res.status(404).json({
      success: false,
      message: "The referenced post, user, or parent comment was not found.",
    });
  }

  return next(error);
};

// Retrieve comments belonging to a post.
const getCommentsByPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const moderator = isModerator(req.user);

    // Regular users can only access comments on published posts.
    if (!moderator && post.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const requestedStatus = req.query.status || "approved";

    // Only admins and editors can retrieve comments awaiting moderation.
    if (!moderator && requestedStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view these comments.",
      });
    }

    const { page, limit } = getPagination(req.query);

    const [comments, total] = await Promise.all([
      Comment.findByPostId({
        postId: req.params.postId,
        status: requestedStatus,
        page,
        limit,
      }),
      Comment.countByPostId(req.params.postId, requestedStatus),
    ]);

    return res.status(200).json({
      success: true,
      data: comments,
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

// Retrieve one comment by ID.
const getCommentById = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const moderator = isModerator(req.user);
    const isOwner = Number(comment.user_id) === Number(req.user.id);

    if (!moderator && comment.status !== "approved" && !isOwner) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    if (!moderator && !isOwner && comment.status !== "approved") {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    return next(error);
  }
};

// Create a comment or reply.
const createComment = async (req, res, next) => {
  try {
    const postId = req.params.postId;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const moderator = isModerator(req.user);

    // Regular users can only comment on published posts.
    if (!moderator && post.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const { parentId, content } = req.body;

    // Verify that a parent comment belongs to the same post.
    if (parentId !== undefined && parentId !== null) {
      const parentComment = await Comment.findById(parentId);

      if (!parentComment || Number(parentComment.post_id) !== Number(postId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent comment.",
        });
      }

      // Regular users can only reply to approved comments.
      if (!moderator && parentComment.status !== "approved") {
        return res.status(400).json({
          success: false,
          message: "You can only reply to approved comments.",
        });
      }
    }

    // Comments always start as pending, regardless of the submitted body.
    const comment = await Comment.create({
      postId,
      userId: req.user.id,
      parentId,
      content,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Comment submitted successfully and is awaiting moderation.",
      data: comment,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
};

// Update a comment or moderate it.
const updateComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const moderator = isModerator(req.user);
    const isOwner = Number(comment.user_id) === Number(req.user.id);

    // Only the owner or a moderator can update a comment.
    if (!moderator && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own comments.",
      });
    }

    // Regular users cannot change moderation status.
    if (!moderator && req.body.status !== undefined) {
      return res.status(403).json({
        success: false,
        message: "You cannot change the moderation status of a comment.",
      });
    }

    const updatedComment = await Comment.update(req.params.id, {
      content: req.body.content,
      status: moderator ? req.body.status : undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully.",
      data: updatedComment,
    });
  } catch (error) {
    return next(error);
  }
};

// Delete a comment.
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const moderator = isModerator(req.user);
    const isOwner = Number(comment.user_id) === Number(req.user.id);

    if (!moderator && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments.",
      });
    }

    await Comment.remove(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCommentsByPost,
  getCommentById,
  createComment,
  updateComment,
  deleteComment,
};
