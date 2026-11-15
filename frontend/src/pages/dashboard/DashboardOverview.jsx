import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import EditNoteOutlinedIcon from "@mui/icons-material/EditNoteOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";

import { getDashboardData } from "../../services/dashboardService";

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusColor = (status) => {
  switch (status) {
    case "published":
      return "success";
    case "draft":
      return "warning";
    case "archived":
      return "default";
    default:
      return "info";
  }
};

function StatCard({ title, value, icon, description }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        border: "1px solid #EAECF0",
        borderRadius: 3,
        height: "100%",
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography color="text.secondary" variant="body2" fontWeight={500}>
            {title}
          </Typography>

          <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
            {value}
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            {description}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#EEF0FF",
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

function DashboardOverview({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const role = user?.role || "subscriber";

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getDashboardData(role);

        if (isMounted) {
          setDashboardData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load dashboard information. Please try again.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [role]);

  const stats = [
    {
      title: role === "author" ? "Accessible Posts" : "Total Posts",
      value: dashboardData?.totalPosts ?? 0,
      description: "Posts you can access",
      icon: <ArticleOutlinedIcon fontSize="large" />,
    },
    ...(role !== "subscriber"
      ? [
          {
            title: "Published Posts",
            value: dashboardData?.publishedPosts ?? 0,
            description: "Posts currently published",
            icon: <CheckCircleOutlinedIcon fontSize="large" />,
          },
          {
            title: "Draft Posts",
            value: dashboardData?.draftPosts ?? 0,
            description:
              role === "author"
                ? "Your unpublished drafts"
                : "Unpublished posts",
            icon: <EditNoteOutlinedIcon fontSize="large" />,
          },
        ]
      : []),
    {
      title: "Categories",
      value: dashboardData?.totalCategories ?? 0,
      description: "Available categories",
      icon: <CategoryOutlinedIcon fontSize="large" />,
    },
    {
      title: "Tags",
      value: dashboardData?.totalTags ?? 0,
      description: "Available tags",
      icon: <LocalOfferOutlinedIcon fontSize="large" />,
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            xl: "repeat(4, 1fr)",
          },
          gap: 2.5,
          mb: 4,
        }}
      >
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </Box>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #EAECF0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3, borderBottom: "1px solid #EAECF0" }}>
          <Typography variant="h6" fontWeight={700}>
            Recent Posts
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            The latest posts available in your workspace.
          </Typography>
        </Box>

        {dashboardData?.recentPosts?.length > 0 ? (
          <Stack divider={<Box sx={{ borderBottom: "1px solid #EAECF0" }} />}>
            {dashboardData.recentPosts.map((post) => (
              <Box
                key={post.id}
                sx={{
                  p: 3,
                  display: "flex",
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={600} noWrap>
                    {post.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {post.category || "Uncategorized"}
                    {post.author_username ? ` · ${post.author_username}` : ""}
                    {` · ${formatDate(post.created_at)}`}
                  </Typography>
                </Box>

                <Chip
                  label={post.status}
                  color={getStatusColor(post.status)}
                  size="small"
                  sx={{
                    textTransform: "capitalize",
                    fontWeight: 600,
                  }}
                />
              </Box>
            ))}
          </Stack>
        ) : (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No posts available yet.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default DashboardOverview;
