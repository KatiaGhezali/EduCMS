const { query } = require("../config/database");

// Create a new tag
const create = async ({ name, slug }) => {
  const sql = `
        INSERT INTO tags (name, slug)
        VALUES ($1, $2)
        RETURNING *
    `;

  const result = await query(sql, [name, slug]);

  return result.rows[0];
};

// Find a tag by ID
const findById = async (id) => {
  const sql = `
        SELECT *
        FROM tags
        WHERE id = $1
        LIMIT 1
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Find a tag by slug
const findBySlug = async (slug) => {
  const sql = `
        SELECT *
        FROM tags
        WHERE slug = $1
        LIMIT 1
    `;

  const result = await query(sql, [slug]);

  return result.rows[0] || null;
};

// Find all tags with their associated post counts
const findAll = async () => {
  const sql = `
        SELECT
            t.*,
            COUNT(pt.post_id)::INTEGER AS post_count
        FROM tags t
        LEFT JOIN post_tags pt ON pt.tag_id = t.id
        GROUP BY t.id
        ORDER BY t.name ASC
    `;

  const result = await query(sql);

  return result.rows;
};

// Update a tag
const update = async (id, { name, slug } = {}) => {
  const sql = `
        UPDATE tags
        SET
            name = COALESCE($1, name),
            slug = COALESCE($2, slug)
        WHERE id = $3
        RETURNING *
    `;

  const result = await query(sql, [name ?? null, slug ?? null, id]);

  return result.rows[0] || null;
};

// Delete a tag
const remove = async (id) => {
  const sql = `
        DELETE FROM tags
        WHERE id = $1
        RETURNING id
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Export model functions
module.exports = {
  create,
  findById,
  findBySlug,
  findAll,
  update,
  remove,
};
