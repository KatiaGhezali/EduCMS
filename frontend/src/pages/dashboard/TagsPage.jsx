import { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
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

import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

import {
  createTag,
  deleteTag,
  getTags,
  updateTag,
} from "../../services/tagService";

import { useAuth } from "../../context/AuthContext";

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString();
};

const getErrorMessage = (error, fallback) => {
  return (
    error.response?.data?.message ||
    error.response?.data?.errors?.[0]?.msg ||
    fallback
  );
};

export default function TagsPage() {
  const { user } = useAuth();

  const canManageTags = ["admin", "editor"].includes(user?.role);

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalTags, setTotalTags] = useState(0);

  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagForm, setTagForm] = useState({ name: "" });
  const [saving, setSaving] = useState(false);

  const [tagToDelete, setTagToDelete] = useState(null);
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

  const fetchTags = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const result = await getTags(params);

      setTags(result.tags);
      setTotalTags(result.pagination.total);
    } catch (fetchError) {
      setError(
        getErrorMessage(fetchError, "Unable to load tags. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [page, rowsPerPage, search]);

  const handleOpenCreateDialog = () => {
    setEditingTag(null);
    setTagForm({ name: "" });
    setTagDialogOpen(true);
  };

  const handleOpenEditDialog = (tag) => {
    setEditingTag(tag);
    setTagForm({ name: tag.name || "" });
    setTagDialogOpen(true);
  };

  const handleCloseTagDialog = () => {
    if (saving) return;

    setTagDialogOpen(false);
    setEditingTag(null);
    setTagForm({ name: "" });
  };

  const handleSaveTag = async () => {
    const name = tagForm.name.trim();

    if (!name) {
      showNotification("Please enter a tag name.", "error");
      return;
    }

    try {
      setSaving(true);

      if (editingTag) {
        await updateTag(editingTag.id, { name });
        showNotification("Tag updated successfully.");
      } else {
        await createTag({ name });
        showNotification("Tag created successfully.");
      }

      setTagDialogOpen(false);
      setEditingTag(null);
      setTagForm({ name: "" });

      await fetchTags();
    } catch (saveError) {
      showNotification(
        getErrorMessage(saveError, "Unable to save the tag."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!tagToDelete) return;

    try {
      setDeleting(true);

      await deleteTag(tagToDelete.id);

      showNotification("Tag deleted successfully.");
      setTagToDelete(null);

      if (tags.length === 1 && page > 0) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await fetchTags();
      }
    } catch (deleteError) {
      showNotification(
        getErrorMessage(deleteError, "Unable to delete the tag."),
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Tags
          </Typography>

          <Typography color="text.secondary">
            Manage the tags used to organize your posts.
          </Typography>
        </Box>

        {canManageTags && (
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={handleOpenCreateDialog}
          >
            Add Tag
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search tags..."
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <SearchOutlinedIcon sx={{ mr: 1, color: "text.secondary" }} />
            ),
          }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Name</strong>
              </TableCell>
              <TableCell>
                <strong>Slug</strong>
              </TableCell>
              <TableCell>
                <strong>Posts</strong>
              </TableCell>
              <TableCell>
                <strong>Created</strong>
              </TableCell>
              {canManageTags && (
                <TableCell align="right">
                  <strong>Actions</strong>
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={canManageTags ? 5 : 4}
                  align="center"
                  sx={{ py: 5 }}
                >
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : tags.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManageTags ? 5 : 4}
                  align="center"
                  sx={{ py: 5 }}
                >
                  <Typography color="text.secondary">
                    {search ? "No tags match your search." : "No tags found."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              tags.map((tag) => (
                <TableRow key={tag.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{tag.name}</Typography>
                  </TableCell>

                  <TableCell>{tag.slug}</TableCell>

                  <TableCell>{tag.post_count ?? 0}</TableCell>

                  <TableCell>{formatDate(tag.created_at)}</TableCell>

                  {canManageTags && (
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => handleOpenEditDialog(tag)}
                        startIcon={<EditOutlinedIcon />}
                      >
                        Edit
                      </Button>

                      <Button
                        size="small"
                        color="error"
                        onClick={() => setTagToDelete(tag)}
                        startIcon={<DeleteOutlineOutlinedIcon />}
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
          count={totalTags}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>

      <Dialog
        open={tagDialogOpen}
        onClose={handleCloseTagDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingTag ? "Edit Tag" : "Create Tag"}</DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            required
            margin="dense"
            label="Tag Name"
            placeholder="e.g. React"
            value={tagForm.name}
            onChange={(event) => setTagForm({ name: event.target.value })}
            inputProps={{ maxLength: 100 }}
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            The tag slug will be generated automatically.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseTagDialog} disabled={saving}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveTag}
            disabled={saving || !tagForm.name.trim()}
          >
            {saving ? "Saving..." : editingTag ? "Save Changes" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(tagToDelete)}
        onClose={() => !deleting && setTagToDelete(null)}
      >
        <DialogTitle>Delete Tag</DialogTitle>

        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the tag{" "}
            <strong>{tagToDelete?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTagToDelete(null)} disabled={deleting}>
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteTag}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
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
          onClose={() =>
            setNotification((current) => ({ ...current, open: false }))
          }
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
