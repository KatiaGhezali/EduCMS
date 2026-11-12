const jwt = require("jsonwebtoken");
const crypto = require("crypto");
// Generate a short-lived access token
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
      type: "access",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    },
  );
};

// Generate a refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: String(user.id),
      type: "refresh",
      jti: crypto.randomUUID(),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    },
  );
};
// Verify an access token
const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.type !== "access") {
    throw new Error("Invalid access token.");
  }

  return decoded;
};

// Verify a refresh token
const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  if (decoded.type !== "refresh") {
    throw new Error("Invalid refresh token.");
  }

  return decoded;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
