import {
  AppBar,
  Avatar,
  Box,
  Button,
  Toolbar,
  Typography,
} from "@mui/material";

import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

function Topbar({ user, onLogout }) {
  const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const initials = fullName
    ? fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <AppBar
      position="static"
      elevation={0}
      color="inherit"
      sx={{
        borderBottom: "1px solid #EAECF0",
        backgroundColor: "#FFFFFF",
      }}
    >
      <Toolbar
        sx={{
          minHeight: "72px !important",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            Welcome back, {user?.first_name || "User"}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Here's what's happening in your workspace.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="body2" fontWeight={600}>
              {fullName || user?.username}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "capitalize" }}
            >
              {user?.role}
            </Typography>
          </Box>

          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: "primary.main",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {initials}
          </Avatar>

          <Button
            variant="outlined"
            color="inherit"
            startIcon={<LogoutOutlinedIcon />}
            onClick={onLogout}
            sx={{
              borderColor: "#EAECF0",
              color: "text.secondary",
            }}
          >
            Log out
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Topbar;
