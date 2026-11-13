const { query } = require("../config/database");

// Create a new revision inside an existing transaction
const create = async (
  client,
  {
    postId,
    title,
    slug,
    content,
    excerpt,
    categoryId,
    status,
    publishedAt,
    revisionNumber,
    createdBy,
  },
) => {
  const sql = `
    INSERT INTO post_revisions (
      post_id,
      title,
      slug,
      content,
      excerpt,
      category_id,
      status,
      published_at,
      revision_number,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    postId,
    title,
    slug,
    content,
    excerpt ?? null,
    categoryId ?? null,
    status,
    publishedAt ?? null,
    revisionNumber,
    createdBy ?? null,
  ];

  const result = await client.query(sql, values);

  return result.rows[0];
};

// Get the next revision number for a post
const getNextRevisionNumber = async (client, postId) => {
  const sql = `
    SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_revision_number
    FROM post_revisions
    WHERE post_id = $1
  `;

  const result = await client.query(sql, [postId]);

  return result.rows[0].next_revision_number;
};

// Retrieve all revisions belonging to a post
const findAllByPostId = async (postId) => {
  const sql = `
    SELECT *
    FROM post_revisions
    WHERE post_id = $1
    ORDER BY revision_number DESC
  `;

  const result = await query(sql, [postId]);

  return result.rows;
};

// Retrieve one revision belonging to a specific post
const findById = async (postId, revisionId) => {
  const sql = `
    SELECT *
    FROM post_revisions
    WHERE post_id = $1
      AND revision_id = $2
  `;

  const result = await query(sql, [postId, revisionId]);

  return result.rows[0] || null;
};

module.exports = {
  create,
  getNextRevisionNumber,
  findAllByPostId,
  findById,
};
