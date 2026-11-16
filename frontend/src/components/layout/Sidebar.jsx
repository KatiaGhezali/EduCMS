import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";

import { NavLink } from "react-router-dom";

import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import CommentOutlinedIcon from "@mui/icons-material/CommentOutlined";
import PermMediaOutlinedIcon from "@mui/icons-material/PermMediaOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";

const drawerWidth = 250;

const navigationByRole = {
  admin: [
    { label: "Overview", icon: DashboardOutlinedIcon, path: "/dashboard" },
    { label: "Posts", icon: ArticleOutlinedIcon, path: "/dashboard/posts" },
    {
      label: "Categories",
      icon: CategoryOutlinedIcon,
      path: "/dashboard/categories",
    },
    {
      label: "Tags",
      icon: LocalOfferOutlinedIcon,
      path: "/dashboard/tags",
    },
    {
      label: "Comments",
      icon: CommentOutlinedIcon,
      path: "/dashboard/comments",
    },
    {
      label: "Media",
      icon: PermMediaOutlinedIcon,
      path: "/dashboard/media",
      disabled: true,
    },
    {
      label: "Users",
      icon: PeopleOutlinedIcon,
      path: "/dashboard/users",
      disabled: true,
    },
  ],

  editor: [
    { label: "Overview", icon: DashboardOutlinedIcon, path: "/dashboard" },
    { label: "Posts", icon: ArticleOutlinedIcon, path: "/dashboard/posts" },
    {
      label: "Categories",
      icon: CategoryOutlinedIcon,
      path: "/dashboard/categories",
    },
    {
      label: "Tags",
      icon: LocalOfferOutlinedIcon,
      path: "/dashboard/tags",
    },
    {
      label: "Comments",
      icon: CommentOutlinedIcon,
      path: "/dashboard/comments",
    },
    {
      label: "Media",
      icon: PermMediaOutlinedIcon,
      path: "/dashboard/media",
      disabled: true,
    },
  ],

  author: [
    { label: "Overview", icon: DashboardOutlinedIcon, path: "/dashboard" },
    {
      label: "My Posts",
      icon: ArticleOutlinedIcon,
      path: "/dashboard/posts",
    },
    {
      label: "Comments",
      icon: CommentOutlinedIcon,
      path: "/dashboard/comments",
      disabled: true,
    },
    {
      label: "Media",
      icon: PermMediaOutlinedIcon,
      path: "/dashboard/media",
      disabled: true,
    },
  ],

  subscriber: [
    { label: "Overview", icon: DashboardOutlinedIcon, path: "/dashboard" },
    {
      label: "Browse Posts",
      icon: ArticleOutlinedIcon,
      path: "/dashboard/posts",
    },
  ],
};

function Sidebar({ role, currentPath }) {
  const navigation = navigationByRole[role] || navigationByRole.subscriber;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "1px solid #EAECF0",
          backgroundColor: "#FFFFFF",
          px: 2,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          py: 3,
          px: 1,
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            backgroundColor: "primary.main",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          E
        </Box>

        <Typography variant="h6" fontWeight={700}>
          EduCMS
        </Typography>
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={600}
        sx={{ px: 1, mb: 1, mt: 2, letterSpacing: 1 }}
      >
        WORKSPACE
      </Typography>

      <List sx={{ p: 0 }}>
        {navigation.map((item) => {
          const Icon = item.icon;

          const isActive =
            currentPath === item.path ||
            (item.path !== "/dashboard" &&
              currentPath.startsWith(`${item.path}/`));

          return (
            <ListItemButton
              key={item.path}
              component={item.disabled ? "div" : NavLink}
              to={item.disabled ? undefined : item.path}
              disabled={item.disabled}
              selected={isActive}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1.2,
                "&.Mui-selected": {
                  backgroundColor: "primary.light",
                  color: "primary.main",
                  "& .MuiListItemIcon-root": {
                    color: "primary.main",
                  },
                },
                "&.Mui-selected:hover": {
                  backgroundColor: "primary.light",
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon />
              </ListItemIcon>

              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                    },
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Drawer>
  );
}

export { drawerWidth };
export default Sidebar;
