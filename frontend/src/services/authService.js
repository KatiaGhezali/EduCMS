import api from "./api";

// Register a new subscriber account
const register = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data.data;
};

// Log in an existing user
const login = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data.data;
};

// Refresh the access token using the refresh token
const refresh = async (refreshToken) => {
  const response = await api.post("/auth/refresh", {
    refreshToken,
  });

  return response.data.data;
};

// Log out and revoke the current refresh token
const logout = async (refreshToken) => {
  const response = await api.post("/auth/logout", {
    refreshToken,
  });

  return response.data;
};

// Log out from all devices
const logoutAll = async () => {
  const response = await api.post("/auth/logout-all");
  return response.data;
};

const authService = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
};

export default authService;
