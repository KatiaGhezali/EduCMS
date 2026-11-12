const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

const jwtUtils = require("../utils/jwt");
const { transaction } = require("../config/database");

// Create an error with an HTTP status code
const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Hash a refresh token before storing it
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Generate tokens and store the refresh token hash
const issueTokens = async (user) => {
  const accessToken = jwtUtils.generateAccessToken(user);
  const refreshToken = jwtUtils.generateRefreshToken(user);

  const decoded = jwtUtils.verifyRefreshToken(refreshToken);

  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(decoded.exp * 1000),
  });

  return {
    accessToken,
    refreshToken,
  };
};

// Register a new user
const register = async ({ username, email, password, firstName, lastName }) => {
  const existingEmail = await User.findByEmail(email);

  if (existingEmail) {
    throw createError("Email is already registered.", 409);
  }

  const existingUsername = await User.findByUsername(username);

  if (existingUsername) {
    throw createError("Username is already taken.", 409);
  }

  // Hash the password before saving it
  const passwordHash = await bcrypt.hash(password, 12);

  // Public registration always creates a subscriber
  let user;

  try {
    user = await User.create({
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      role: "subscriber",
    });
  } catch (error) {
    // Handle duplicate email or username conflicts
    if (error.code === "23505") {
      throw createError("Email or username is already registered.", 409);
    }

    throw error;
  }

  const tokens = await issueTokens(user);

  return {
    user,
    ...tokens,
  };
};

// Log in an existing user
const login = async ({ email, password }) => {
  const user = await User.findByEmail(email);

  if (!user) {
    throw createError("Invalid email or password.", 401);
  }

  if (!user.is_active) {
    throw createError("Your account is inactive.", 403);
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw createError("Invalid email or password.", 401);
  }

  const tokens = await issueTokens(user);

  // Never return the password hash
  const { password_hash, ...safeUser } = user;

  return {
    user: safeUser,
    ...tokens,
  };
};

// Refresh access and refresh tokens
const refresh = async (refreshToken) => {
  let decoded;

  try {
    decoded = jwtUtils.verifyRefreshToken(refreshToken);
  } catch (error) {
    throw createError("Invalid or expired refresh token.", 401);
  }

  const tokenHash = hashToken(refreshToken);

  // Generate the replacement tokens
  const user = await User.findById(decoded.sub);

  if (!user || !user.is_active) {
    throw createError("User account is unavailable.", 401);
  }

  const newAccessToken = jwtUtils.generateAccessToken(user);
  const newRefreshToken = jwtUtils.generateRefreshToken(user);

  const newDecoded = jwtUtils.verifyRefreshToken(newRefreshToken);
  const newTokenHash = hashToken(newRefreshToken);

  // Rotate the refresh token atomically
  const result = await transaction(async (client) => {
    const existingToken = await client.query(
      `
        SELECT id
        FROM refresh_tokens
        WHERE token_hash = $1
          AND user_id = $2
          AND revoked_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        FOR UPDATE
      `,
      [tokenHash, decoded.sub],
    );

    if (existingToken.rowCount === 0) {
      throw createError("Refresh token has already been used or revoked.", 401);
    }

    await client.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [existingToken.rows[0].id],
    );

    await client.query(
      `
        INSERT INTO refresh_tokens (
          user_id,
          token_hash,
          expires_at
        )
        VALUES ($1, $2, $3)
      `,
      [decoded.sub, newTokenHash, new Date(newDecoded.exp * 1000)],
    );

    return true;
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

// Log out by revoking the current refresh token
const logout = async (refreshToken) => {
  let decoded;

  try {
    decoded = jwtUtils.verifyRefreshToken(refreshToken);
  } catch (error) {
    throw createError("Invalid or expired refresh token.", 401);
  }

  const tokenHash = hashToken(refreshToken);

  const result = await RefreshToken.findActiveByHash(tokenHash);

  if (!result || String(result.user_id) !== String(decoded.sub)) {
    throw createError("Refresh token is invalid or already revoked.", 401);
  }

  await RefreshToken.revoke(result.id);

  return {
    message: "Logged out successfully.",
  };
};

// Log out from all devices
const logoutAll = async (userId) => {
  const revokedCount = await RefreshToken.revokeAllForUser(userId);

  return {
    message: "Logged out from all devices successfully.",
    revokedTokens: revokedCount,
  };
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
};
