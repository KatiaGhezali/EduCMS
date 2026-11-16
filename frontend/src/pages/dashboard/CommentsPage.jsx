import { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
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

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

import { getPosts } from "../../services/postService";
import {
  getCommentsByPost,
  updateComment,
  deleteComment,
} from "../../services/commentService";

import { useAuth } from "../../context/AuthContext";

const commentStatuses = ["pending", "approved", "rejected", "spam"];

const getErrorMessage = (error, fallback) => {
  return (
    error.response?.data?.message ||
    error.response?.data?.errors?.[0]?.msg ||
    fallback
  );
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getAuthorName = (comment) => {
  const fullName =
    `${comment.first_name || ""} ${comment.last_name || ""}`.trim();

  return fullName || comment.username || "Unknown";
};

const getStatusColor = (status) => {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "error";
    case "spam":
      return "default";
    default:
      return "default";
  }
};

export default function CommentsPage() {
  const { user } = useAuth();

  const canModerate = ["admin", "editor"].includes(user?.role);

  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState("");

  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState("pending");

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalComments, setTotalComments] = useState(0);

  const [editingComment, setEditingComment] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);

  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showNotification = (message, severity = "success") => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  // Retrieve posts for the post selector
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoadingPosts(true);
        setError("");

        const response = await getPosts({
          page: 1,
          limit: 100,
        });

        setPosts(response.posts || []);

        if (response.posts?.length > 0) {
          setSelectedPost(String(response.posts[0].id));
        }
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load posts."));
      } finally {
        setLoadingPosts(false);
      }
    };

    if (canModerate) {
      fetchPosts();
    }
  }, [canModerate]);

  // Retrieve comments whenever the selected post, status, or pagination changes
  useEffect(() => {
    const fetchComments = async () => {
      if (!selectedPost) {
        setComments([]);
        setTotalComments(0);
        return;
      }

      try {
        setLoadingComments(true);
        setError("");

        const response = await getCommentsByPost(selectedPost, {
          page: page + 1,
          limit: rowsPerPage,
          status,
        });

        setComments(response.comments || []);
        setTotalComments(response.pagination?.total || 0);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load comments."));
        setComments([]);
        setTotalComments(0);
      } finally {
        setLoadingComments(false);
      }
    };

    if (canModerate && !loadingPosts) {
      fetchComments();
    }
  }, [selectedPost, status, page, rowsPerPage, canModerate, loadingPosts]);

  // Change a comment's moderation status
  const handleStatusChange = async (comment, newStatus) => {
    try {
      await updateComment(comment.id, {
        status: newStatus,
      });

      showNotification(`Comment ${newStatus} successfully.`);

      // Refresh the current list
      const response = await getCommentsByPost(selectedPost, {
        page: page + 1,
        limit: rowsPerPage,
        status,
      });

      setComments(response.comments || []);
      setTotalComments(response.pagination?.total || 0);
    } catch (err) {
      showNotification(
        getErrorMessage(err, "Failed to update comment status."),
        "error",
      );
    }
  };

  // Open the edit dialog
  const handleEditClick = (comment) => {
    setEditingComment(comment);
    setEditedContent(comment.content);
  };

  // Save edited comment content
  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      showNotification("Comment content cannot be empty.", "error");
      return;
    }

    try {
      setSaving(true);

      await updateComment(editingComment.id, {
        content: editedContent.trim(),
      });

      showNotification("Comment updated successfully.");
      setEditingComment(null);

      const response = await getCommentsByPost(selectedPost, {
        page: page + 1,
        limit: rowsPerPage,
        status,
      });

      setComments(response.comments || []);
      setTotalComments(response.pagination?.total || 0);
    } catch (err) {
      showNotification(
        getErrorMessage(err, "Failed to update comment."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async () => {
    try {
      setDeleting(true);

      await deleteComment(commentToDelete.id);

      showNotification("Comment deleted successfully.");
      setCommentToDelete(null);

      // If the deleted comment was the only item on this page,
      // return to the previous page when possible.
      if (comments.length === 1 && page > 0) {
        setPage((previousPage) => previousPage - 1);
      } else {
        const response = await getCommentsByPost(selectedPost, {
          page: page + 1,
          limit: rowsPerPage,
          status,
        });

        setComments(response.comments || []);
        setTotalComments(response.pagination?.total || 0);
      }
    } catch (err) {
      showNotification(
        getErrorMessage(err, "Failed to delete comment."),
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handlePostChange = (event) => {
    setSelectedPost(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event) => {
    setStatus(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (!canModerate) {
    return (
      <Alert severity="error">
        You do not have permission to access comment moderation.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Page heading */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Comments
        </Typography>

        <Typography color="text.secondary">
          Review and moderate comments submitted on your posts.
        </Typography>
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: "1px solid #EAECF0",
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <FormControl sx={{ minWidth: 260, flex: 1 }}>
            <InputLabel id="post-select-label">Select post</InputLabel>

            <Select
              labelId="post-select-label"
              value={selectedPost}
              label="Select post"
              onChange={handlePostChange}
              disabled={loadingPosts || posts.length === 0}
            >
              {posts.map((post) => (
                <MenuItem key={post.id} value={String(post.id)}>
                  {post.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="status-select-label">Status</InputLabel>

            <Select
              labelId="status-select-label"
              value={status}
              label="Status"
              onChange={handleStatusFilterChange}
            >
              {commentStatuses.map((commentStatus) => (
                <MenuItem
                  key={commentStatus}
                  value={commentStatus}
                  sx={{ textTransform: "capitalize" }}
                >
                  {commentStatus}
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

      {/* Comments table */}
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #EAECF0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Comment list
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {totalComments} comment{totalComments === 1 ? "" : "s"} found
          </Typography>
        </Box>

        {loadingPosts || loadingComments ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        ) : posts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No posts are available.
            </Typography>
          </Box>
        ) : comments.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">
              No {status} comments found for this post.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Comment</TableCell>
                    <TableCell>Author</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {comments.map((comment) => (
                    <TableRow key={comment.id} hover>
                      <TableCell sx={{ maxWidth: 350 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflowWrap: "anywhere",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {comment.content}
                        </Typography>

                        {comment.parent_id && (
                          <Typography variant="caption" color="text.secondary">
                            Reply to comment #{comment.parent_id}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>{getAuthorName(comment)}</TableCell>

                      <TableCell>
                        <Chip
                          label={comment.status}
                          color={getStatusColor(comment.status)}
                          size="small"
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>

                      <TableCell>{formatDate(comment.created_at)}</TableCell>

                      <TableCell align="right">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 0.5,
                            flexWrap: "wrap",
                          }}
                        >
                          <Button
                            size="small"
                            color="primary"
                            onClick={() => handleEditClick(comment)}
                            startIcon={<EditOutlinedIcon />}
                          >
                            Edit
                          </Button>

                          {comment.status !== "approved" && (
                            <Button
                              size="small"
                              color="success"
                              onClick={() =>
                                handleStatusChange(comment, "approved")
                              }
                              title="Approve comment"
                            >
                              <CheckCircleOutlinedIcon fontSize="small" />
                            </Button>
                          )}

                          {comment.status !== "rejected" && (
                            <Button
                              size="small"
                              color="warning"
                              onClick={() =>
                                handleStatusChange(comment, "rejected")
                              }
                              title="Reject comment"
                            >
                              <BlockOutlinedIcon fontSize="small" />
                            </Button>
                          )}

                          {comment.status !== "spam" && (
                            <Button
                              size="small"
                              color="inherit"
                              onClick={() =>
                                handleStatusChange(comment, "spam")
                              }
                              title="Mark as spam"
                            >
                              Spam
                            </Button>
                          )}

                          <Button
                            size="small"
                            color="error"
                            onClick={() => setCommentToDelete(comment)}
                            title="Delete comment"
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalComments}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* Edit comment dialog */}
      <Dialog
        open={Boolean(editingComment)}
        onClose={() => !saving && setEditingComment(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit comment</DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            maxRows={10}
            label="Comment content"
            value={editedContent}
            onChange={(event) => setEditedContent(event.target.value)}
            inputProps={{ maxLength: 5000 }}
            sx={{ mt: 1 }}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditingComment(null)} disabled={saving}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={saving || !editedContent.trim()}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={Boolean(commentToDelete)}
        onClose={() => !deleting && setCommentToDelete(null)}
      >
        <DialogTitle>Delete comment</DialogTitle>

        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this comment? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCommentToDelete(null)} disabled={deleting}>
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteComment}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() =>
          setNotification((previous) => ({
            ...previous,
            open: false,
          }))
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity={notification.severity}
          variant="filled"
          onClose={() =>
            setNotification((previous) => ({
              ...previous,
              open: false,
            }))
          }
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
