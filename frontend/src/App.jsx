import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Box, Button, Container, Typography, Paper } from "@mui/material";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      navigate("/login");
    }
  };

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper sx={{ p: 5, textAlign: "center", width: "100%" }}>
          <Typography variant="h4" color="primary" gutterBottom>
            Welcome to EduCMS!
          </Typography>

          <Typography variant="h6" gutterBottom>
            {user?.first_name} {user?.last_name}
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 1 }}>
            {user?.email}
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Role: {user?.role}
          </Typography>

          <Typography sx={{ mb: 3 }}>
            Your authentication is working. The dashboard will be developed
            next.
          </Typography>

          <Button variant="contained" onClick={handleLogout}>
            Log out
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      {/* Default and unknown routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
