const { query } = require("../config/database");

// Create a comment
const create = async ({
  postId,
  userId,
  parentId,
  content,
  status = "pending",
}) => {
  const sql = `
        INSERT INTO comments (
            post_id,
            user_id,
            parent_id,
            content,
            status
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;

  const values = [postId, userId, parentId ?? null, content, status];

  const result = await query(sql, values);

  return result.rows[0];
};

// Find a comment by ID
const findById = async (id) => {
  const sql = `
        SELECT
            c.*,
            u.username,
            u.first_name,
            u.last_name
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.id = $1
        LIMIT 1
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Find comments belonging to a post
const findByPostId = async ({
  postId,
  status = "approved",
  page = 1,
  limit = 10,
}) => {
  const offset = (page - 1) * limit;

  const sql = `
        SELECT
            c.*,
            u.username,
            u.first_name,
            u.last_name
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.post_id = $1
          AND c.status = $2
        ORDER BY c.created_at ASC
        LIMIT $3
        OFFSET $4
    `;

  const result = await query(sql, [postId, status, limit, offset]);

  return result.rows;
};

// Update a comment
const update = async (id, { content, status } = {}) => {
  const sql = `
        UPDATE comments
        SET
            content = COALESCE($1, content),
            status = COALESCE($2, status)
        WHERE id = $3
        RETURNING *
    `;

  const result = await query(sql, [content ?? null, status ?? null, id]);

  return result.rows[0] || null;
};

// Delete a comment
const remove = async (id) => {
  const sql = `
        DELETE FROM comments
        WHERE id = $1
        RETURNING id
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Count comments for a post
const countByPostId = async (postId, status) => {
  const sql = `
        SELECT COUNT(*)::INTEGER AS total
        FROM comments
        WHERE post_id = $1
          AND ($2::VARCHAR IS NULL OR status = $2)
    `;

  const result = await query(sql, [postId, status || null]);

  return result.rows[0].total;
};

// Export model functions
module.exports = {
  create,
  findById,
  findByPostId,
  update,
  remove,
  countByPostId,
};
