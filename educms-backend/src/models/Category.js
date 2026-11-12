const { query } = require("../config/database");

// Create a new category
const create = async ({ name, slug, description, parentId }) => {
  const sql = `
        INSERT INTO categories (
            name,
            slug,
            description,
            parent_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;

  const values = [name, slug, description ?? null, parentId ?? null];

  const result = await query(sql, values);

  return result.rows[0];
};

// Find a category by ID
const findById = async (id) => {
  const sql = `
        SELECT
            c.*,
            parent.name AS parent_name,
            (
                SELECT COUNT(*)::INTEGER
                FROM posts p
                WHERE p.category_id = c.id
            ) AS post_count
        FROM categories c
        LEFT JOIN categories parent
            ON c.parent_id = parent.id
        WHERE c.id = $1
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Find a category by slug
const findBySlug = async (slug) => {
  const sql = `
        SELECT
            c.*,
            parent.name AS parent_name,
            (
                SELECT COUNT(*)::INTEGER
                FROM posts p
                WHERE p.category_id = c.id
            ) AS post_count
        FROM categories c
        LEFT JOIN categories parent
            ON c.parent_id = parent.id
        WHERE c.slug = $1
    `;

  const result = await query(sql, [slug]);

  return result.rows[0] || null;
};

// Update a category
const update = async (id, categoryData = {}) => {
  const { name, slug, description, parentId } = categoryData;

  const hasParentId = Object.prototype.hasOwnProperty.call(
    categoryData,
    "parentId",
  );

  const sql = `
        UPDATE categories
        SET
            name = COALESCE($1, name),
            slug = COALESCE($2, slug),
            description = COALESCE($3, description),
            parent_id = CASE
                WHEN $4::BOOLEAN THEN $5::BIGINT
                ELSE parent_id
            END
        WHERE id = $6
        RETURNING *
    `;

  const values = [
    name ?? null,
    slug ?? null,
    description ?? null,
    hasParentId,
    parentId ?? null,
    id,
  ];

  const result = await query(sql, values);

  return result.rows[0] || null;
};

// Delete a category
const remove = async (id) => {
  const result = await query(
    `DELETE FROM categories
        WHERE id = $1
        RETURNING id`,
    [id],
  );

  return result.rows[0] || null;
};

// Retrieve all categories with pagination
const findAll = async ({ page = 1, limit = 10, search, parentId } = {}) => {
  const offset = (page - 1) * limit;

  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`c.name ILIKE $${values.length}`);
  }

  if (parentId !== undefined) {
    values.push(parentId);
    conditions.push(`c.parent_id IS NOT DISTINCT FROM $${values.length}`);
  }

  const whereClause = conditions.length ? conditions.join(" AND ") : "TRUE";

  const sql = `
        SELECT
            c.*,
            parent.name AS parent_name,
            (
                SELECT COUNT(*)::INTEGER
                FROM posts p
                WHERE p.category_id = c.id
            ) AS post_count
        FROM categories c
        LEFT JOIN categories parent
            ON c.parent_id = parent.id
        WHERE ${whereClause}
        ORDER BY c.name ASC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
    `;

  const result = await query(sql, [...values, limit, offset]);

  return result.rows;
};

// Count categories with optional search and parent filters
const count = async ({ search, parentId } = {}) => {
  const values = [];
  const conditions = [];

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`name ILIKE $${values.length}`);
  }

  if (parentId !== undefined) {
    values.push(parentId);
    conditions.push(`parent_id IS NOT DISTINCT FROM $${values.length}`);
  }

  const whereClause = conditions.length ? conditions.join(" AND ") : "TRUE";

  const sql = `
        SELECT COUNT(*)::INTEGER AS total
        FROM categories
        WHERE ${whereClause}
    `;

  const result = await query(sql, values);

  return result.rows[0].total;
};

// Get the number of posts in a category
const getPostCount = async (categoryId) => {
  const result = await query(`SELECT get_category_post_count($1) AS total`, [
    categoryId,
  ]);

  return result.rows[0].total;
};

// Export model functions
module.exports = {
  create,
  findById,
  findBySlug,
  update,
  remove,
  findAll,
  count,
  getPostCount,
};
