const jwtUtils = require("../utils/jwt");
const User = require("../models/User");

// Authenticate requests using an access token
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check whether the Authorization header exists
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please provide an access token.",
    });
  }

  // Extract the token
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token is missing.",
    });
  }

  let decoded;

  // Verify the access token
  try {
    decoded = jwtUtils.verifyAccessToken(token);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token.",
    });
  }

  try {
    // Retrieve the user from the database
    const user = await User.findById(decoded.sub);

    // Check whether the user exists and is active
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "User account is unavailable.",
      });
    }

    // Attach safe user information to the request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };

    // Continue to the next middleware or route
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate };
