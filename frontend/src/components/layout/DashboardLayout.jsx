import { Box } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function DashboardLayout({ user, onLogout, children }) {
  const location = useLocation();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar role={user?.role} currentPath={location.pathname} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "background.default",
        }}
      >
        <Topbar user={user} onLogout={onLogout} />

        <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
          {children ?? <Outlet />}
        </Box>
      </Box>
    </Box>
  );
}

export default DashboardLayout;
