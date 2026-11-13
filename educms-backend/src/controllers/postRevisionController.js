const Post = require("../models/Post");
const PostRevision = require("../models/PostRevision");
const { transaction } = require("../config/database");

// Validate positive integer IDs
const isValidId = (id) => {
  return /^\d+$/.test(String(id)) && Number(id) > 0;
};

// GET /posts/:postId/revisions
// Retrieve all revisions belonging to a post
const getPostRevisions = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!isValidId(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const revisions = await PostRevision.findAllByPostId(postId);

    return res.status(200).json({
      success: true,
      message: "Post revisions retrieved successfully.",
      data: revisions,
    });
  } catch (error) {
    next(error);
  }
};

// GET /posts/:postId/revisions/:revisionId
// Retrieve one specific revision
const getPostRevisionById = async (req, res, next) => {
  try {
    const { postId, revisionId } = req.params;

    if (!isValidId(postId) || !isValidId(revisionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID or revision ID.",
      });
    }

    const revision = await PostRevision.findById(postId, revisionId);

    if (!revision) {
      return res.status(404).json({
        success: false,
        message: "Post revision not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Post revision retrieved successfully.",
      data: revision,
    });
  } catch (error) {
    next(error);
  }
};

// POST /posts/:postId/revisions/:revisionId/restore
// Restore a previous revision
const restorePostRevision = async (req, res, next) => {
  try {
    const { postId, revisionId } = req.params;

    if (!isValidId(postId) || !isValidId(revisionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID or revision ID.",
      });
    }

    // Restore the selected revision inside a transaction
    await transaction(async (client) => {
      // Lock the post to prevent simultaneous updates
      const postResult = await client.query(
        `SELECT * FROM posts WHERE id = $1 FOR UPDATE`,
        [postId],
      );

      if (postResult.rows.length === 0) {
        const error = new Error("Post not found.");
        error.statusCode = 404;
        throw error;
      }

      const currentPost = postResult.rows[0];

      // Find the selected revision
      const revisionResult = await client.query(
        `
          SELECT *
          FROM post_revisions
          WHERE post_id = $1
            AND revision_id = $2
        `,
        [postId, revisionId],
      );

      if (revisionResult.rows.length === 0) {
        const error = new Error("Post revision not found.");
        error.statusCode = 404;
        throw error;
      }

      const revision = revisionResult.rows[0];

      // Save the current post state before restoring the old version
      const revisionNumber = await PostRevision.getNextRevisionNumber(
        client,
        postId,
      );

      await PostRevision.create(client, {
        postId: currentPost.id,
        title: currentPost.title,
        slug: currentPost.slug,
        content: currentPost.content,
        excerpt: currentPost.excerpt,
        categoryId: currentPost.category_id,
        status: currentPost.status,
        publishedAt: currentPost.published_at,
        revisionNumber,
        createdBy: req.user.id,
      });

      // Generate a unique slug for the restored post
      const slugSuffix = `-restored-${Date.now()}`;
      const restoredSlug =
        revision.slug.slice(0, 280 - slugSuffix.length) + slugSuffix;

      // Restore the selected revision
      await client.query(
        `
          UPDATE posts
          SET
            title = $1,
            slug = $2,
            content = $3,
            excerpt = $4,
            category_id = $5,
            status = $6,
            published_at = $7
          WHERE id = $8
        `,
        [
          revision.title,
          restoredSlug,
          revision.content,
          revision.excerpt,
          revision.category_id,
          revision.status,
          revision.published_at,
          postId,
        ],
      );
    });

    // Retrieve the restored post after the transaction commits
    const restoredPost = await Post.findById(postId);

    return res.status(200).json({
      success: true,
      message: "Post revision restored successfully.",
      data: restoredPost,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPostRevisions,
  getPostRevisionById,
  restorePostRevision,
};
