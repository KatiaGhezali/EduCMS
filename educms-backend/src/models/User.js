const { query } = require("../config/database");

// Create a new user
const create = async ({
  username,
  email,
  passwordHash,
  firstName,
  lastName,
  role = "subscriber",
}) => {
  const sql = `
        INSERT INTO users (
            username,
            email,
            password_hash,
            first_name,
            last_name,
            role
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            username,
            email,
            first_name,
            last_name,
            role,
            is_active,
            email_verified,
            created_at
    `;

  const values = [
    username,
    email,
    passwordHash,
    firstName || null,
    lastName || null,
    role,
  ];

  const result = await query(sql, values);

  return result.rows[0];
};

// Find a user by email
// The password hash is included for authentication.
const findByEmail = async (email) => {
  const sql = `
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
    `;

  const result = await query(sql, [email]);

  return result.rows[0] || null;
};

// Find a user by username
const findByUsername = async (username) => {
  const sql = `
        SELECT
            id,
            username,
            email,
            first_name,
            last_name,
            role,
            is_active,
            email_verified,
            created_at,
            updated_at
        FROM users
        WHERE LOWER(username) = LOWER($1)
        LIMIT 1
    `;

  const result = await query(sql, [username]);

  return result.rows[0] || null;
};

// Find a user by ID
const findById = async (id) => {
  const sql = `
        SELECT
            id,
            username,
            email,
            first_name,
            last_name,
            role,
            is_active,
            email_verified,
            created_at,
            updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Update user information
const update = async (id, { username, email, firstName, lastName }) => {
  const sql = `
        UPDATE users
        SET
            username = COALESCE($2, username),
            email = COALESCE($3, email),
            first_name = COALESCE($4, first_name),
            last_name = COALESCE($5, last_name)
        WHERE id = $1
        RETURNING
            id,
            username,
            email,
            first_name,
            last_name,
            role,
            is_active,
            email_verified,
            created_at,
            updated_at
    `;

  const values = [
    id,
    username ?? null,
    email ?? null,
    firstName ?? null,
    lastName ?? null,
  ];

  const result = await query(sql, values);

  return result.rows[0] || null;
};

// Update a user's password
const updatePassword = async (id, passwordHash) => {
  const sql = `
        UPDATE users
        SET password_hash = $2
        WHERE id = $1
        RETURNING id
    `;

  const result = await query(sql, [id, passwordHash]);

  return result.rows[0] || null;
};

// Get all users with pagination
const findAll = async ({ page = 1, limit = 10, role } = {}) => {
  const offset = (page - 1) * limit;

  const sql = `
        SELECT
            id,
            username,
            email,
            first_name,
            last_name,
            role,
            is_active,
            email_verified,
            created_at,
            updated_at
        FROM users
        WHERE ($1::VARCHAR IS NULL OR role = $1)
        ORDER BY created_at DESC
        LIMIT $2
        OFFSET $3
    `;

  const result = await query(sql, [role || null, limit, offset]);

  return result.rows;
};

// Count users
const count = async ({ role } = {}) => {
  const sql = `
        SELECT COUNT(*)::INTEGER AS total
        FROM users
        WHERE ($1::VARCHAR IS NULL OR role = $1)
    `;

  const result = await query(sql, [role || null]);

  return result.rows[0].total;
};

// Export model functions
module.exports = {
  create,
  findByEmail,
  findByUsername,
  findById,
  update,
  updatePassword,
  findAll,
  count,
};
