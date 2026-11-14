import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import authService from "../services/authService";

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  user: "educms_user",
  accessToken: "educms_access_token",
  refreshToken: "educms_refresh_token",
};

// Share one refresh request between simultaneous callers.
let refreshPromise = null;

const refreshTokens = (refreshToken) => {
  if (!refreshPromise) {
    refreshPromise = authService.refresh(refreshToken).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.user);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem(STORAGE_KEYS.accessToken),
  );

  const [loading, setLoading] = useState(true);

  // Save the authenticated user and tokens.
  const saveSession = (session) => {
    const {
      user: authenticatedUser,
      accessToken: newAccessToken,
      refreshToken,
    } = session;

    setUser(authenticatedUser);
    setAccessToken(newAccessToken);

    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(authenticatedUser));
    localStorage.setItem(STORAGE_KEYS.accessToken, newAccessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);

    api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
  };

  // Clear the local session.
  const clearSession = () => {
    setUser(null);
    setAccessToken(null);

    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    delete api.defaults.headers.common.Authorization;
  };

  // Restore the session when the application starts.
  useEffect(() => {
    const restoreSession = async () => {
      const storedAccessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
      const storedRefreshToken = localStorage.getItem(
        STORAGE_KEYS.refreshToken,
      );
      const storedUser = localStorage.getItem(STORAGE_KEYS.user);

      if (!storedAccessToken || !storedRefreshToken || !storedUser) {
        clearSession();
        setLoading(false);
        return;
      }

      try {
        const restoredUser = JSON.parse(storedUser);
        const tokens = await refreshTokens(storedRefreshToken);

        saveSession({
          user: restoredUser,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Automatically refresh expired access tokens.
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      const token = localStorage.getItem(STORAGE_KEYS.accessToken);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (
          error.response?.status !== 401 ||
          !originalRequest ||
          originalRequest._retry ||
          originalRequest.url?.includes("/auth/refresh") ||
          originalRequest.url?.includes("/auth/login") ||
          originalRequest.url?.includes("/auth/register")
        ) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        const storedRefreshToken = localStorage.getItem(
          STORAGE_KEYS.refreshToken,
        );

        if (!storedRefreshToken) {
          clearSession();
          return Promise.reject(error);
        }

        try {
          const tokens = await refreshTokens(storedRefreshToken);

          setAccessToken(tokens.accessToken);

          localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
          localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);

          api.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;

          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;

          return api(originalRequest);
        } catch (refreshError) {
          clearSession();
          return Promise.reject(refreshError);
        }
      },
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Register a new account.
  const register = async (userData) => {
    const session = await authService.register(userData);
    saveSession(session);
    return session.user;
  };

  // Log in.
  const login = async (credentials) => {
    const session = await authService.login(credentials);
    saveSession(session);
    return session.user;
  };

  // Log out from the current device.
  const logout = async () => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);

    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } finally {
      clearSession();
    }
  };

  // Log out from all devices.
  const logoutAll = async () => {
    try {
      await authService.logoutAll();
    } finally {
      clearSession();
    }
  };

  const value = {
    user,
    accessToken,
    loading,
    isAuthenticated: Boolean(user && accessToken),
    register,
    login,
    logout,
    logoutAll,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for accessing authentication.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
