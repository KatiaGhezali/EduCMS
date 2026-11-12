const { query } = require("../config/database");

// Create a media record
const create = async ({
  originalFilename,
  storedFilename,
  filePath,
  mimeType,
  fileSize,
  altText,
  uploadedBy,
}) => {
  const sql = `
        INSERT INTO media (
            original_filename,
            stored_filename,
            file_path,
            mime_type,
            file_size,
            alt_text,
            uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;

  const values = [
    originalFilename,
    storedFilename,
    filePath,
    mimeType,
    fileSize,
    altText ?? null,
    uploadedBy,
  ];

  const result = await query(sql, values);

  return result.rows[0];
};

// Find media by ID
const findById = async (id) => {
  const sql = `
        SELECT
            m.*,
            u.username AS uploader_username
        FROM media m
        LEFT JOIN users u ON u.id = m.uploaded_by
        WHERE m.id = $1
        LIMIT 1
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Find all media with pagination
const findAll = async ({ page = 1, limit = 20, uploadedBy } = {}) => {
  const offset = (page - 1) * limit;

  const sql = `
        SELECT
            m.*,
            u.username AS uploader_username
        FROM media m
        LEFT JOIN users u ON u.id = m.uploaded_by
        WHERE ($1::BIGINT IS NULL OR m.uploaded_by = $1)
        ORDER BY m.created_at DESC
        LIMIT $2
        OFFSET $3
    `;

  const result = await query(sql, [uploadedBy ?? null, limit, offset]);

  return result.rows;
};

// Update media information
const update = async (id, { altText } = {}) => {
  const sql = `
        UPDATE media
        SET alt_text = COALESCE($1, alt_text)
        WHERE id = $2
        RETURNING *
    `;

  const result = await query(sql, [altText ?? null, id]);

  return result.rows[0] || null;
};

// Delete a media record
const remove = async (id) => {
  const sql = `
        DELETE FROM media
        WHERE id = $1
        RETURNING id
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Count media records
const count = async ({ uploadedBy } = {}) => {
  const sql = `
        SELECT COUNT(*)::INTEGER AS total
        FROM media
        WHERE ($1::BIGINT IS NULL OR uploaded_by = $1)
    `;

  const result = await query(sql, [uploadedBy ?? null]);

  return result.rows[0].total;
};

// Export model functions
module.exports = {
  create,
  findById,
  findAll,
  update,
  remove,
  count,
};
