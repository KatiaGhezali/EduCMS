import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";

import api from "../../services/api";
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  getPostRevisions,
  getPostRevision,
  restorePostRevision,
} from "../../services/postService";
import { useAuth } from "../../context/AuthContext";

const statusOptions = ["all", "draft", "published", "archived"];

function getDisplayName(value) {
  if (!value) return "—";

  if (typeof value === "string") return value;

  if (typeof value === "object") {
    const fullName =
      `${value.first_name || ""} ${value.last_name || ""}`.trim();

    return fullName || value.username || value.name || "—";
  }

  return "—";
}

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusColor(status) {
  switch (status) {
    case "published":
      return "success";
    case "draft":
      return "warning";
    case "archived":
      return "default";
    default:
      return "default";
  }
}

function PostsPage() {
  const { user } = useAuth();

  const isSubscriber = user?.role === "subscriber";
  const canDelete = ["admin", "editor", "author"].includes(user?.role);
  const canCreate = ["admin", "editor", "author"].includes(user?.role);
  const canFeaturePosts = ["admin", "editor"].includes(user?.role);
  const canViewRevisions = ["admin", "editor"].includes(user?.role);

  const canEditPost = (post) =>
    ["admin", "editor"].includes(user?.role) ||
    (user?.role === "author" && Number(post.author_id) === Number(user?.id));

  const emptyPostForm = {
    title: "",
    excerpt: "",
    content: "",
    categoryId: "",
    status: "draft",
    metaTitle: "",
    metaDescription: "",
    readingTime: 1,
    commentsEnabled: true,
    isFeatured: false,
  };

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [newPost, setNewPost] = useState(emptyPostForm);
  const [savingPost, setSavingPost] = useState(false);
  const [refreshPosts, setRefreshPosts] = useState(0);

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [postToDelete, setPostToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Post revision history
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyPost, setHistoryPost] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [loadingRevisions, setLoadingRevisions] = useState(false);

  // Selected revision preview
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [loadingRevision, setLoadingRevision] = useState(false);

  // Revision restoration
  const [revisionToRestore, setRevisionToRestore] = useState(null);
  const [restoringRevision, setRestoringRevision] = useState(false);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesResponse, tagsResponse] = await Promise.all([
          api.get("/categories", { params: { limit: 100 } }),
          api.get("/tags", { params: { limit: 100 } }),
        ]);

        setCategories(categoriesResponse.data.data || []);
        setTags(tagsResponse.data.data || []);
      } catch (err) {
        console.error("Failed to load post filters:", err);
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError("");

      try {
        const params = {
          page: page + 1,
          limit: rowsPerPage,
        };

        if (search.trim()) params.search = search.trim();
        if (status !== "all") params.status = status;
        if (categoryId) params.categoryId = categoryId;
        if (tagId) params.tagId = tagId;

        const result = await getPosts(params);

        setPosts(result.posts);
        setPagination(result.pagination);
      } catch (err) {
        console.error("Failed to load posts:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load posts. Please try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [page, rowsPerPage, search, status, categoryId, tagId, refreshPosts]);

  const handlePostFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setNewPost((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSavePost = async (event) => {
    event.preventDefault();

    setSavingPost(true);

    try {
      const postData = {
        title: newPost.title.trim(),
        excerpt: newPost.excerpt.trim(),
        content: newPost.content,
        categoryId: newPost.categoryId ? Number(newPost.categoryId) : undefined,
        status: newPost.status,
        metaTitle: newPost.metaTitle.trim(),
        metaDescription: newPost.metaDescription.trim(),
        readingTime: Number(newPost.readingTime),
        commentsEnabled: newPost.commentsEnabled,
      };

      if (canFeaturePosts) {
        postData.isFeatured = newPost.isFeatured;
      }

      if (editingPost) {
        await updatePost(editingPost.id, postData);
      } else {
        await createPost(postData);
      }

      setNewPost(emptyPostForm);
      setEditingPost(null);
      setCreateDialogOpen(false);
      setPage(0);
      setRefreshPosts((current) => current + 1);

      setNotification({
        open: true,
        message: editingPost
          ? "Post updated successfully."
          : "Post created successfully.",
        severity: "success",
      });
    } catch (err) {
      setNotification({
        open: true,
        message:
          err.response?.data?.message ||
          (editingPost
            ? "Unable to update this post."
            : "Unable to create this post."),
        severity: "error",
      });
    } finally {
      setSavingPost(false);
    }
  };

  const handleEditPost = async (post) => {
    setSavingPost(true);

    try {
      const response = await api.get(`/posts/${post.id}`);
      const postDetails = response.data.data;

      setEditingPost(postDetails);

      setNewPost({
        title: postDetails.title || "",
        excerpt: postDetails.excerpt || "",
        content: postDetails.content || "",
        categoryId: postDetails.category_id ?? "",
        status: postDetails.status || "draft",
        metaTitle: postDetails.meta_title || "",
        metaDescription: postDetails.meta_description || "",
        readingTime: postDetails.reading_time ?? 1,
        commentsEnabled: postDetails.comments_enabled ?? true,
        isFeatured: postDetails.is_featured ?? false,
      });

      setCreateDialogOpen(true);
    } catch (err) {
      setNotification({
        open: true,
        message: err.response?.data?.message || "Unable to load this post.",
        severity: "error",
      });
    } finally {
      setSavingPost(false);
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    setDeleting(true);

    try {
      await deletePost(postToDelete.id);

      setPosts((currentPosts) =>
        currentPosts.filter((post) => post.id !== postToDelete.id),
      );

      setPagination((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));

      setNotification({
        open: true,
        message: "Post deleted successfully.",
        severity: "success",
      });

      setPostToDelete(null);
    } catch (err) {
      setNotification({
        open: true,
        message: err.response?.data?.message || "Unable to delete this post.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Open the revision history of a post
  const handleOpenHistory = async (post) => {
    setHistoryPost(post);
    setHistoryDialogOpen(true);
    setRevisions([]);
    setSelectedRevision(null);

    setLoadingRevisions(true);

    try {
      const result = await getPostRevisions(post.id);
      setRevisions(result);
    } catch (err) {
      setNotification({
        open: true,
        message:
          err.response?.data?.message ||
          "Unable to load post revision history.",
        severity: "error",
      });
    } finally {
      setLoadingRevisions(false);
    }
  };

  // View the details of a selected revision
  const handleViewRevision = async (revision) => {
    setLoadingRevision(true);
    setRevisionDialogOpen(true);
    setSelectedRevision(null);

    try {
      const result = await getPostRevision(
        historyPost.id,
        revision.revision_id,
      );

      setSelectedRevision(result);
    } catch (err) {
      setRevisionDialogOpen(false);

      setNotification({
        open: true,
        message: err.response?.data?.message || "Unable to load this revision.",
        severity: "error",
      });
    } finally {
      setLoadingRevision(false);
    }
  };

  // Restore a selected revision
  const handleRestoreRevision = async () => {
    if (!historyPost || !revisionToRestore) return;

    setRestoringRevision(true);

    try {
      await restorePostRevision(historyPost.id, revisionToRestore.revision_id);

      setRevisionToRestore(null);
      setRevisionDialogOpen(false);
      setHistoryDialogOpen(false);
      setHistoryPost(null);
      setSelectedRevision(null);

      // Refresh the posts table
      setRefreshPosts((current) => current + 1);

      setNotification({
        open: true,
        message: "Post revision restored successfully.",
        severity: "success",
      });
    } catch (err) {
      setNotification({
        open: true,
        message:
          err.response?.data?.message || "Unable to restore this revision.",
        severity: "error",
      });
    } finally {
      setRestoringRevision(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(0);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {user?.role === "author" ? "My Posts" : "Posts"}
          </Typography>

          <Typography color="text.secondary">
            {isSubscriber
              ? "Explore published posts."
              : "Manage and keep track of your content."}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Chip
            label={`${pagination.total} ${pagination.total === 1 ? "post" : "posts"}`}
            color="primary"
            variant="outlined"
          />

          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddOutlinedIcon />}
              onClick={() => {
                setEditingPost(null);
                setNewPost(emptyPostForm);
                setCreateDialogOpen(true);
              }}
              sx={{ borderRadius: 2, textTransform: "none" }}
            >
              Create Post
            </Button>
          )}
        </Box>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: "1px solid #EAECF0",
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <TextField
            placeholder="Search posts..."
            value={search}
            onChange={handleSearchChange}
            size="small"
            sx={{ flex: "1 1 220px" }}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchOutlinedIcon sx={{ color: "text.secondary", mr: 1 }} />
                ),
              },
            }}
          />

          {!isSubscriber && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={handleFilterChange(setStatus)}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option === "all"
                      ? "All statuses"
                      : option.charAt(0).toUpperCase() + option.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryId}
              label="Category"
              onChange={handleFilterChange(setCategoryId)}
            >
              <MenuItem value="">All categories</MenuItem>

              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Tag</InputLabel>
            <Select
              value={tagId}
              label="Tag"
              onChange={handleFilterChange(setTagId)}
            >
              <MenuItem value="">All tags</MenuItem>

              {tags.map((tag) => (
                <MenuItem key={tag.id} value={tag.id}>
                  {tag.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          border: "1px solid #EAECF0",
          borderRadius: 3,
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#F9FAFB" }}>
              <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Author</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>

              {canDelete && (
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={canDelete ? 6 : 5}
                  align="center"
                  sx={{ py: 6 }}
                >
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canDelete ? 6 : 5}
                  align="center"
                  sx={{ py: 6 }}
                >
                  <Typography color="text.secondary">
                    No posts found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{post.title}</Typography>

                    {post.excerpt && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {post.excerpt}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>{getDisplayName(post.author)}</TableCell>

                  <TableCell>{getDisplayName(post.category)}</TableCell>

                  <TableCell>
                    <Chip
                      label={post.status}
                      color={getStatusColor(post.status)}
                      size="small"
                      sx={{ textTransform: "capitalize" }}
                    />
                  </TableCell>

                  <TableCell>{formatDate(post.created_at)}</TableCell>

                  {canDelete && (
                    <TableCell align="right">
                      {canViewRevisions && (
                        <Button
                          color="secondary"
                          size="small"
                          startIcon={<HistoryOutlinedIcon />}
                          onClick={() => handleOpenHistory(post)}
                          sx={{ mr: 1 }}
                        >
                          History
                        </Button>
                      )}
                      {canEditPost(post) && (
                        <Button
                          color="primary"
                          size="small"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => handleEditPost(post)}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
                      )}

                      <Button
                        color="error"
                        size="small"
                        startIcon={<DeleteOutlineOutlinedIcon />}
                        onClick={() => setPostToDelete(post)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={pagination.total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>

      <Dialog
        open={createDialogOpen}
        onClose={() => {
          if (!savingPost) {
            setCreateDialogOpen(false);
            setEditingPost(null);
            setNewPost(emptyPostForm);
          }
        }}
        fullWidth
        maxWidth="md"
      >
        <Box component="form" onSubmit={handleSavePost}>
          <DialogTitle>
            {editingPost ? "Edit Post" : "Create a New Post"}
          </DialogTitle>

          <DialogContent>
            <DialogContentText sx={{ mb: 3 }}>
              {editingPost
                ? "Update the details of your post below."
                : "Fill in the details below to create a new post."}
            </DialogContentText>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                label="Post Title"
                name="title"
                value={newPost.title}
                onChange={handlePostFormChange}
                required
                fullWidth
                inputProps={{ maxLength: 255 }}
              />

              <TextField
                label="Excerpt"
                name="excerpt"
                value={newPost.excerpt}
                onChange={handlePostFormChange}
                fullWidth
                multiline
                rows={2}
                placeholder="A short summary of your post..."
              />

              <TextField
                label="Content"
                name="content"
                value={newPost.content}
                onChange={handlePostFormChange}
                required
                fullWidth
                multiline
                minRows={8}
                placeholder="Write your post content here..."
              />

              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  name="categoryId"
                  value={newPost.categoryId}
                  label="Category"
                  onChange={handlePostFormChange}
                >
                  <MenuItem value="">No category</MenuItem>

                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={newPost.status}
                  label="Status"
                  onChange={handlePostFormChange}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Reading Time (minutes)"
                name="readingTime"
                type="number"
                value={newPost.readingTime}
                onChange={handlePostFormChange}
                required
                fullWidth
                slotProps={{
                  htmlInput: { min: 1 },
                }}
              />

              <TextField
                label="Meta Title (SEO)"
                name="metaTitle"
                value={newPost.metaTitle}
                onChange={handlePostFormChange}
                fullWidth
                inputProps={{ maxLength: 255 }}
              />

              <TextField
                label="Meta Description (SEO)"
                name="metaDescription"
                value={newPost.metaDescription}
                onChange={handlePostFormChange}
                fullWidth
                multiline
                rows={2}
                inputProps={{ maxLength: 500 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    name="commentsEnabled"
                    checked={newPost.commentsEnabled}
                    onChange={handlePostFormChange}
                  />
                }
                label="Allow comments on this post"
              />

              {canFeaturePosts && (
                <FormControlLabel
                  control={
                    <Checkbox
                      name="isFeatured"
                      checked={newPost.isFeatured}
                      onChange={handlePostFormChange}
                    />
                  }
                  label="Mark as featured"
                />
              )}
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingPost(null);
                setNewPost(emptyPostForm);
              }}
              disabled={savingPost}
            >
              Cancel
            </Button>

            <Button type="submit" variant="contained" disabled={savingPost}>
              {savingPost
                ? "Saving..."
                : editingPost
                  ? "Save Changes"
                  : "Create Post"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Post Revision History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => {
          if (!restoringRevision) {
            setHistoryDialogOpen(false);
            setHistoryPost(null);
            setRevisions([]);
          }
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Post History
          {historyPost && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {historyPost.title}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {loadingRevisions ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : revisions.length === 0 ? (
            <Alert severity="info">
              No previous versions are available for this post yet. A revision
              is created automatically when an existing post is updated.
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Version</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Saved</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {revisions.map((revision) => (
                    <TableRow key={revision.revision_id} hover>
                      <TableCell>v{revision.revision_number}</TableCell>

                      <TableCell>
                        <Typography fontWeight={500}>
                          {revision.title}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={revision.status}
                          color={getStatusColor(revision.status)}
                          size="small"
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>

                      <TableCell>{formatDate(revision.created_at)}</TableCell>

                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<VisibilityOutlinedIcon />}
                          onClick={() => handleViewRevision(revision)}
                          sx={{ mr: 1 }}
                        >
                          View
                        </Button>

                        <Button
                          size="small"
                          color="warning"
                          startIcon={<RestoreOutlinedIcon />}
                          onClick={() => setRevisionToRestore(revision)}
                        >
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setHistoryDialogOpen(false);
              setHistoryPost(null);
              setRevisions([]);
            }}
            disabled={restoringRevision}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revision Preview Dialog */}
      <Dialog
        open={revisionDialogOpen}
        onClose={() => {
          if (!restoringRevision) {
            setRevisionDialogOpen(false);
            setSelectedRevision(null);
          }
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Revision Preview
          {selectedRevision && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Version {selectedRevision.revision_number}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {loadingRevision ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : selectedRevision ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Title
                </Typography>

                <Typography variant="h5" fontWeight={700}>
                  {selectedRevision.title}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Chip
                  label={selectedRevision.status}
                  color={getStatusColor(selectedRevision.status)}
                  sx={{ textTransform: "capitalize" }}
                />

                <Chip
                  label={`Version ${selectedRevision.revision_number}`}
                  variant="outlined"
                />

                <Chip
                  label={`Saved ${formatDate(selectedRevision.created_at)}`}
                  variant="outlined"
                />
              </Box>

              {selectedRevision.excerpt && (
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Excerpt
                  </Typography>

                  <Typography>{selectedRevision.excerpt}</Typography>
                </Box>
              )}

              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Content
                </Typography>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    border: "1px solid #EAECF0",
                    borderRadius: 2,
                    backgroundColor: "#F9FAFB",
                    maxHeight: 400,
                    overflowY: "auto",
                  }}
                >
                  <Typography
                    sx={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {selectedRevision.content}
                  </Typography>
                </Paper>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Slug
                </Typography>

                <Typography variant="body2">{selectedRevision.slug}</Typography>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Published Date
                </Typography>

                <Typography variant="body2">
                  {formatDate(selectedRevision.published_at)}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Alert severity="error">Unable to display this revision.</Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setRevisionDialogOpen(false);
              setSelectedRevision(null);
            }}
            disabled={restoringRevision}
          >
            Close
          </Button>

          {selectedRevision && (
            <Button
              color="warning"
              variant="contained"
              startIcon={<RestoreOutlinedIcon />}
              onClick={() => setRevisionToRestore(selectedRevision)}
              disabled={restoringRevision}
            >
              Restore This Version
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Restore Revision Confirmation Dialog */}
      <Dialog
        open={Boolean(revisionToRestore)}
        onClose={() => {
          if (!restoringRevision) {
            setRevisionToRestore(null);
          }
        }}
      >
        <DialogTitle>Restore this version?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            Are you sure you want to restore version{" "}
            {revisionToRestore?.revision_number} of "{historyPost?.title}"? The
            current version will be saved in history before restoration.
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setRevisionToRestore(null)}
            disabled={restoringRevision}
          >
            Cancel
          </Button>

          <Button
            color="warning"
            variant="contained"
            onClick={handleRestoreRevision}
            disabled={restoringRevision}
          >
            {restoringRevision ? "Restoring..." : "Restore Version"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(postToDelete)}
        onClose={() => !deleting && setPostToDelete(null)}
      >
        <DialogTitle>Delete post?</DialogTitle>

        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{postToDelete?.title}"? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPostToDelete(null)} disabled={deleting}>
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Post"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() =>
          setNotification((current) => ({ ...current, open: false }))
        }
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={notification.severity}
          variant="filled"
          onClose={() =>
            setNotification((current) => ({ ...current, open: false }))
          }
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PostsPage;
