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

import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";

import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../services/categoryService";

import { useAuth } from "../../context/AuthContext";

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.errors?.[0]?.msg ||
    "Something went wrong. Please try again."
  );
}

function CategoriesPage() {
  const { user } = useAuth();

  const canManageCategories = ["admin", "editor"].includes(user?.role);

  const emptyCategoryForm = {
    name: "",
    description: "",
    parentId: "",
  };

  const [categories, setCategories] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [savingCategory, setSavingCategory] = useState(false);

  const [categoryToDelete, setCategoryToDelete] = useState(null);
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

  const fetchCategories = async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const result = await getCategories(params);

      setCategories(result.categories);
      setPagination(result.pagination);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    const fetchParentCategories = async () => {
      try {
        const result = await getCategories({
          page: 1,
          limit: 100,
        });

        setParentCategories(result.categories);
      } catch (err) {
        console.error("Failed to load parent categories:", err);
      }
    };

    fetchParentCategories();
  }, []);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
    setCategoryDialogOpen(true);
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);

    setCategoryForm({
      name: category.name || "",
      description: category.description || "",
      parentId: category.parent_id ?? category.parentId ?? "",
    });

    setCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    if (savingCategory) return;

    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setCategoryForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();

    if (!categoryForm.name.trim()) {
      showNotification("Please enter a category name.", "error");
      return;
    }

    const categoryData = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      parentId: categoryForm.parentId
        ? Number(categoryForm.parentId)
        : null,
    };

    setSavingCategory(true);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
        showNotification("Category updated successfully.");
      } else {
        await createCategory(categoryData);
        showNotification("Category created successfully.");
      }

      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);

      await fetchCategories();

      const parentResult = await getCategories({
        page: 1,
        limit: 100,
      });

      setParentCategories(parentResult.categories);
    } catch (err) {
      console.error("Failed to save category:", err);
      showNotification(getErrorMessage(err), "error");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setDeleting(true);

    try {
      await deleteCategory(categoryToDelete.id);

      showNotification("Category deleted successfully.");
      setCategoryToDelete(null);

      if (categories.length === 1 && page > 0) {
        setPage((previous) => previous - 1);
      } else {
        await fetchCategories();
      }

      const parentResult = await getCategories({
        page: 1,
        limit: 100,
      });

      setParentCategories(parentResult.categories);
    } catch (err) {
      console.error("Failed to delete category:", err);
      showNotification(getErrorMessage(err), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  const getParentName = (category) => {
    return category.parent_name || category.parentName || "—";
  };

  const getPostCount = (category) => {
    return category.post_count ?? category.postCount ?? 0;
  };

  const availableParents = parentCategories.filter(
    (category) => Number(category.id) !== Number(editingCategory?.id)
  );

  return (
    <Box>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Categories
          </Typography>

          <Typography color="text.secondary">
            Organize your posts into categories.
          </Typography>
        </Box>

        {canManageCategories && (
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={openCreateDialog}
          >
            Add Category
          </Button>
        )}
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
        <TextField
          fullWidth
          size="small"
          placeholder="Search categories..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <SearchOutlinedIcon
                sx={{ mr: 1, color: "text.secondary" }}
              />
            ),
          }}
        />
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid #EAECF0",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 8,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={fetchCategories}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#F9FAFB" }}>
                    <TableCell sx={{ fontWeight: 700 }}>
                      Name
                    </TableCell>

                    <TableCell sx={{ fontWeight: 700 }}>
                      Slug
                    </TableCell>

                    <TableCell sx={{ fontWeight: 700 }}>
                      Parent Category
                    </TableCell>

                    <TableCell sx={{ fontWeight: 700 }}>
                      Posts
                    </TableCell>

                    <TableCell sx={{ fontWeight: 700 }}>
                      Created
                    </TableCell>

                    {canManageCategories && (
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        Actions
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canManageCategories ? 6 : 5}
                        align="center"
                        sx={{ py: 6 }}
                      >
                        <Typography color="text.secondary">
                          No categories found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>
                            {category.name}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {category.slug || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {getParentName(category)}
                        </TableCell>

                        <TableCell>
                          {getPostCount(category)}
                        </TableCell>

                        <TableCell>
                          {formatDate(category.created_at || category.createdAt)}
                        </TableCell>

                        {canManageCategories && (
                          <TableCell align="right">
                            <Button
                              size="small"
                              color="primary"
                              startIcon={<EditOutlinedIcon />}
                              onClick={() => openEditDialog(category)}
                              sx={{ mr: 1 }}
                            >
                              Edit
                            </Button>

                            <Button
                              size="small"
                              color="error"
                              startIcon={<DeleteOutlineOutlinedIcon />}
                              onClick={() => setCategoryToDelete(category)}
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
            </TableContainer>

            <TablePagination
              component="div"
              count={pagination.total || 0}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* Create / Edit Category Dialog */}
      <Dialog
        open={categoryDialogOpen}
        onClose={closeCategoryDialog}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={handleSaveCategory}>
          <DialogTitle fontWeight={700}>
            {editingCategory ? "Edit Category" : "Create Category"}
          </DialogTitle>

          <DialogContent>
            <TextField
              autoFocus
              required
              fullWidth
              margin="normal"
              label="Category Name"
              name="name"
              value={categoryForm.name}
              onChange={handleFormChange}
              inputProps={{ maxLength: 100 }}
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              margin="normal"
              label="Description"
              name="description"
              value={categoryForm.description}
              onChange={handleFormChange}
            />

            <FormControl fullWidth margin="normal">
              <InputLabel id="parent-category-label">
                Parent Category
              </InputLabel>

              <Select
                labelId="parent-category-label"
                label="Parent Category"
                name="parentId"
                value={categoryForm.parentId}
                onChange={handleFormChange}
              >
                <MenuItem value="">
                  <em>None (Top-level category)</em>
                </MenuItem>

                {availableParents.map((category) => (
                  <MenuItem
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              The category slug will be generated automatically.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={closeCategoryDialog}
              disabled={savingCategory}
              color="inherit"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={savingCategory}
            >
              {savingCategory ? (
                <CircularProgress size={22} color="inherit" />
              ) : editingCategory ? (
                "Save Changes"
              ) : (
                "Create Category"
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(categoryToDelete)}
        onClose={() => {
          if (!deleting) setCategoryToDelete(null);
        }}
      >
        <DialogTitle fontWeight={700}>
          Delete Category
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{categoryToDelete?.name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setCategoryToDelete(null)}
            disabled={deleting}
            color="inherit"
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteCategory}
            disabled={deleting}
          >
            {deleting ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Delete"
            )}
          </Button>
        </DialogActions>
      </Dialog>

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

export default CategoriesPage;
