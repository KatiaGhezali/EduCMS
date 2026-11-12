const authService = require("../services/authService");

// Register a new user
const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Log in an existing user
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Refresh access and refresh tokens
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const result = await authService.refresh(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Log out from the current session
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const result = await authService.logout(refreshToken);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// Log out from all devices
const logoutAll = async (req, res, next) => {
  try {
    const result = await authService.logoutAll(req.user.id);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
};
