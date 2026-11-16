import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Box, Chip, Paper, Typography } from "@mui/material";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import PostsPage from "./pages/dashboard/PostsPage.jsx";
import CategoriesPage from "./pages/dashboard/CategoriesPage.jsx";
import TagsPage from "./pages/dashboard/TagsPage.jsx";
import CommentsPage from "./pages/dashboard/CommentsPage.jsx";
import MediaPage from "./pages/dashboard/MediaPage.jsx";

import { useAuth } from "./context/AuthContext";

const roleDescriptions = {
  admin: "Manage your content, users, and the entire platform.",
  editor: "Manage and review content across the platform.",
  author: "Create, manage, and publish your own content.",
  subscriber: "Explore and read published content.",
};

function DashboardShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return <DashboardLayout user={user} onLogout={handleLogout} />;
}

function DashboardHome() {
  const { user } = useAuth();

  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.username ||
    "User";

  const role = user?.role || "subscriber";

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Overview
        </Typography>

        <Typography color="text.secondary">
          Welcome to your EduCMS workspace.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          border: "1px solid #EAECF0",
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Hello, {fullName}!
            </Typography>

            <Typography color="text.secondary">
              {roleDescriptions[role] || roleDescriptions.subscriber}
            </Typography>
          </Box>

          <Chip
            label={role}
            color="primary"
            sx={{
              textTransform: "capitalize",
              fontWeight: 600,
            }}
          />
        </Box>
      </Paper>

      <DashboardOverview user={user} />
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardShell />}>
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/dashboard/posts" element={<PostsPage />} />
          <Route path="/dashboard/categories" element={<CategoriesPage />} />
          <Route path="/dashboard/tags" element={<TagsPage />} />
          <Route path="/dashboard/comments" element={<CommentsPage />} />
          <Route path="/dashboard/media" element={<MediaPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
