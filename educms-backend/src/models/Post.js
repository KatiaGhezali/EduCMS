const { query } = require("../config/database");

// Shared SQL for retrieving a post with its related information
const postSelect = `
    SELECT
        p.*,
        u.username AS author,
        c.name AS category,
        COALESCE(
            (
                SELECT JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                        'id', t.id,
                        'name', t.name,
                        'slug', t.slug
                    )
                )
                FROM post_tags pt
                JOIN tags t ON pt.tag_id = t.id
                WHERE pt.post_id = p.id
            ),
            '[]'::JSONB
        ) AS tags
    FROM posts p
    JOIN users u ON p.author_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
`;

// Build filters for post retrieval and counting
const buildFilters = ({
  status,
  categoryId,
  authorId,
  search,
  isFeatured,
  tagId,
} = {}) => {
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`p.status = $${values.length}`);
  }

  if (categoryId) {
    values.push(categoryId);
    conditions.push(`p.category_id = $${values.length}`);
  }

  if (authorId) {
    values.push(authorId);
    conditions.push(`p.author_id = $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`
            (
                p.title ILIKE $${values.length}
                OR p.content ILIKE $${values.length}
                OR p.excerpt ILIKE $${values.length}
            )
        `);
  }

  if (typeof isFeatured === "boolean") {
    values.push(isFeatured);
    conditions.push(`p.is_featured = $${values.length}`);
  }

  if (tagId) {
    values.push(tagId);
    conditions.push(`
            EXISTS (
                SELECT 1
                FROM post_tags pt
                WHERE pt.post_id = p.id
                AND pt.tag_id = $${values.length}
            )
        `);
  }

  return {
    whereClause: conditions.length ? conditions.join(" AND ") : "TRUE",
    values,
  };
};

// Create a new post
const create = async ({
  title,
  slug,
  excerpt,
  content,
  authorId,
  categoryId,
  featuredMediaId,
  status = "draft",
  metaTitle,
  metaDescription,
  isFeatured = false,
  commentsEnabled = true,
  readingTime = 1,
  publishedAt,
}) => {
  const sql = `
        INSERT INTO posts (
            title,
            slug,
            excerpt,
            content,
            author_id,
            category_id,
            featured_media_id,
            status,
            meta_title,
            meta_description,
            is_featured,
            comments_enabled,
            reading_time,
            published_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            CASE
               WHEN $8::VARCHAR(20) = 'published'
                THEN COALESCE($14::TIMESTAMPTZ, CURRENT_TIMESTAMP)
                ELSE $14
            END
        )
        RETURNING *
    `;

  const values = [
    title,
    slug,
    excerpt ?? null,
    content,
    authorId,
    categoryId ?? null,
    featuredMediaId ?? null,
    status,
    metaTitle ?? null,
    metaDescription ?? null,
    isFeatured,
    commentsEnabled,
    readingTime,
    publishedAt ?? null,
  ];

  const result = await query(sql, values);

  return result.rows[0];
};

// Find a post by ID
const findById = async (id) => {
  const sql = `
        ${postSelect}
        WHERE p.id = $1
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Find a post by slug
const findBySlug = async (slug) => {
  const sql = `
        ${postSelect}
        WHERE p.slug = $1
    `;

  const result = await query(sql, [slug]);

  return result.rows[0] || null;
};

// Update an existing post
const update = async (id, postData = {}) => {
  const allowedFields = {
    title: "title",
    slug: "slug",
    excerpt: "excerpt",
    content: "content",
    categoryId: "category_id",
    featuredMediaId: "featured_media_id",
    status: "status",
    metaTitle: "meta_title",
    metaDescription: "meta_description",
    isFeatured: "is_featured",
    commentsEnabled: "comments_enabled",
    readingTime: "reading_time",
    publishedAt: "published_at",
  };

  const values = [];
  const updates = [];

  for (const [key, column] of Object.entries(allowedFields)) {
    if (Object.prototype.hasOwnProperty.call(postData, key)) {
      values.push(postData[key]);
      updates.push(`${column} = $${values.length}`);
    }
  }

  if (updates.length === 0) {
    return findById(id);
  }

  // Automatically set the publication date when publishing a post
  if (
    postData.status === "published" &&
    !Object.prototype.hasOwnProperty.call(postData, "publishedAt")
  ) {
    updates.push("published_at = COALESCE(published_at, CURRENT_TIMESTAMP)");
  }

  values.push(id);

  const sql = `
        UPDATE posts
        SET ${updates.join(", ")}
        WHERE id = $${values.length}
        RETURNING id
    `;

  const result = await query(sql, values);

  if (result.rows.length === 0) {
    return null;
  }

  return findById(id);
};

// Delete a post
const remove = async (id) => {
  const result = await query(
    `DELETE FROM posts
        WHERE id = $1
        RETURNING id`,
    [id],
  );

  return result.rows[0] || null;
};

// Retrieve posts with pagination and filters
const findAll = async ({
  page = 1,
  limit = 10,
  status,
  categoryId,
  authorId,
  search,
  isFeatured,
  tagId,
} = {}) => {
  const offset = (page - 1) * limit;

  const { whereClause, values } = buildFilters({
    status,
    categoryId,
    authorId,
    search,
    isFeatured,
    tagId,
  });

  const sql = `
        ${postSelect}
        WHERE ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
    `;

  const result = await query(sql, [...values, limit, offset]);

  return result.rows;
};

// Count posts matching filters
const count = async (filters = {}) => {
  const { whereClause, values } = buildFilters(filters);

  const sql = `
        SELECT COUNT(*)::INTEGER AS total
        FROM posts p
        WHERE ${whereClause}
    `;

  const result = await query(sql, values);

  return result.rows[0].total;
};

// Increment a post's view count
const incrementViewCount = async (id) => {
  const result = await query(
    `UPDATE posts
        SET view_count = view_count + 1
        WHERE id = $1
        RETURNING view_count`,
    [id],
  );

  return result.rows[0] || null;
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
  incrementViewCount,
};
