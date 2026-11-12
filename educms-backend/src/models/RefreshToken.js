const { query } = require("../config/database");

// Store a refresh token hash
const create = async ({ userId, tokenHash, expiresAt }) => {
  const sql = `
        INSERT INTO refresh_tokens (
            user_id,
            token_hash,
            expires_at
        )
        VALUES ($1, $2, $3)
        RETURNING id, user_id, expires_at, created_at
    `;

  const result = await query(sql, [userId, tokenHash, expiresAt]);

  return result.rows[0];
};

// Find an active refresh token by its hash
const findActiveByHash = async (tokenHash) => {
  const sql = `
        SELECT id, user_id, token_hash, expires_at, created_at
        FROM refresh_tokens
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1
    `;

  const result = await query(sql, [tokenHash]);

  return result.rows[0] || null;
};

// Revoke a refresh token
const revoke = async (id) => {
  const sql = `
        UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND revoked_at IS NULL
        RETURNING id, user_id, revoked_at
    `;

  const result = await query(sql, [id]);

  return result.rows[0] || null;
};

// Revoke all refresh tokens belonging to a user
const revokeAllForUser = async (userId) => {
  const sql = `
        UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND revoked_at IS NULL
        RETURNING id
    `;

  const result = await query(sql, [userId]);

  return result.rowCount;
};

// Delete expired refresh tokens
const deleteExpired = async () => {
  const sql = `
        DELETE FROM refresh_tokens
        WHERE expires_at <= CURRENT_TIMESTAMP
        RETURNING id
    `;

  const result = await query(sql);

  return result.rowCount;
};

module.exports = {
  create,
  findActiveByHash,
  revoke,
  revokeAllForUser,
  deleteExpired,
};
