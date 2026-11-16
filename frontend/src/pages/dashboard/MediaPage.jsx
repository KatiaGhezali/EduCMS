import { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  TablePagination,
  TextField,
  Typography,
} from "@mui/material";

import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import {
  deleteMedia,
  getMedia,
  updateMedia,
  uploadMedia,
} from "../../services/mediaService";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

// The API URL includes /api/v1, but uploaded files are served
// directly from the backend at /uploads.
const SERVER_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

const getMediaUrl = (filePath) => {
  if (!filePath) return "";

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  return `${SERVER_URL}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
};

const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null) return "Unknown size";

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

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

const isImage = (mimeType) => {
  return mimeType?.startsWith("image/");
};

export default function MediaPage() {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalMedia, setTotalMedia] = useState(0);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadAltText, setUploadAltText] = useState("");
  const [uploading, setUploading] = useState(false);

  const [editingMedia, setEditingMedia] = useState(null);
  const [editAltText, setEditAltText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [mediaToDelete, setMediaToDelete] = useState(null);
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

  const fetchMedia = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getMedia({
        page: page + 1,
        limit: rowsPerPage,
      });

      setMedia(result.media);
      setTotalMedia(result.pagination.total);
    } catch (fetchError) {
      setError(
        getErrorMessage(fetchError, "Unable to load media. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [page, rowsPerPage]);

  const handleOpenUploadDialog = () => {
    setSelectedFile(null);
    setUploadAltText("");
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = () => {
    if (uploading) return;

    setUploadDialogOpen(false);
    setSelectedFile(null);
    setUploadAltText("");
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      showNotification(
        "Unsupported file type. Please select an image or PDF.",
        "error",
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification("The file must not exceed 5 MB.", "error");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showNotification("Please select a file to upload.", "error");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("altText", uploadAltText.trim());

      await uploadMedia(formData);

      showNotification("Media uploaded successfully.");

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadAltText("");

      // Return to the first page so the newest upload is visible.
      setPage(0);

      if (page === 0) {
        await fetchMedia();
      }
    } catch (uploadError) {
      showNotification(
        getErrorMessage(uploadError, "Unable to upload this file."),
        "error",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEditDialog = (item) => {
    setEditingMedia(item);
    setEditAltText(item.alt_text || "");
  };

  const handleCloseEditDialog = () => {
    if (savingEdit) return;

    setEditingMedia(null);
    setEditAltText("");
  };

  const handleSaveEdit = async () => {
    if (!editingMedia) return;

    if (editAltText.length > 255) {
      showNotification("Alt text must not exceed 255 characters.", "error");
      return;
    }

    try {
      setSavingEdit(true);

      await updateMedia(editingMedia.id, {
        altText: editAltText,
      });

      showNotification("Alt text updated successfully.");

      setEditingMedia(null);
      setEditAltText("");

      await fetchMedia();
    } catch (saveError) {
      showNotification(
        getErrorMessage(saveError, "Unable to update alt text."),
        "error",
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMedia = async () => {
    if (!mediaToDelete) return;

    try {
      setDeleting(true);

      await deleteMedia(mediaToDelete.id);

      showNotification("Media deleted successfully.");

      setMediaToDelete(null);

      // If the last item on this page was deleted, go back one page.
      if (media.length === 1 && page > 0) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await fetchMedia();
      }
    } catch (deleteError) {
      showNotification(
        getErrorMessage(deleteError, "Unable to delete this file."),
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      {/* Page heading */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Media Library
          </Typography>

          <Typography color="text.secondary">
            Upload and manage your images and documents.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddOutlinedIcon />}
          onClick={handleOpenUploadDialog}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Upload Media
        </Button>
      </Box>

      {/* Loading state */}
      {loading && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            py: 8,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {!loading && error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchMedia}>
              Retry
            </Button>
          }
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* Empty state */}
      {!loading && !error && media.length === 0 && (
        <Card
          elevation={0}
          sx={{
            border: "1px solid #EAECF0",
            borderRadius: 3,
            textAlign: "center",
            py: 7,
            px: 3,
          }}
        >
          <CloudUploadOutlinedIcon
            sx={{
              fontSize: 52,
              color: "text.secondary",
              mb: 2,
            }}
          />

          <Typography variant="h6" fontWeight={600} gutterBottom>
            Your media library is empty
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Upload an image or PDF to get started.
          </Typography>

          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={handleOpenUploadDialog}
            sx={{ textTransform: "none" }}
          >
            Upload your first file
          </Button>
        </Card>
      )}

      {/* Media cards */}
      {!loading && !error && media.length > 0 && (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2.5,
            }}
          >
            {media.map((item) => {
              const mediaUrl = getMediaUrl(item.file_path);
              const imageFile = isImage(item.mime_type);

              return (
                <Card
                  key={item.id}
                  elevation={0}
                  sx={{
                    border: "1px solid #EAECF0",
                    borderRadius: 3,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Preview */}
                  <Box
                    sx={{
                      height: 180,
                      bgcolor: "#F8FAFC",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {imageFile ? (
                      <Box
                        component="img"
                        src={mediaUrl}
                        alt={item.alt_text || item.original_filename}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : item.mime_type === "application/pdf" ? (
                      <PictureAsPdfOutlinedIcon
                        sx={{ fontSize: 64, color: "#D14343" }}
                      />
                    ) : (
                      <InsertDriveFileOutlinedIcon
                        sx={{ fontSize: 64, color: "text.secondary" }}
                      />
                    )}
                  </Box>

                  <CardContent
                    sx={{
                      p: 2,
                      flexGrow: 1,
                      "&:last-child": { pb: 2 },
                    }}
                  >
                    <Typography
                      fontWeight={600}
                      noWrap
                      title={item.original_filename}
                      sx={{ mb: 0.5 }}
                    >
                      {item.original_filename}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {formatFileSize(item.file_size)}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1.5 }}
                    >
                      Uploaded {formatDate(item.created_at)}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        minHeight: 40,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {item.alt_text || "No alt text"}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mt: 1.5,
                        pt: 1,
                        borderTop: "1px solid #EAECF0",
                      }}
                    >
                      <Button
                        size="small"
                        startIcon={<VisibilityOutlinedIcon />}
                        component="a"
                        href={mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ textTransform: "none" }}
                      >
                        View
                      </Button>

                      <Box>
                        <IconButton
                          size="small"
                          aria-label="Edit alt text"
                          onClick={() => handleOpenEditDialog(item)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Delete media"
                          onClick={() => setMediaToDelete(item)}
                        >
                          <DeleteOutlineOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          <TablePagination
            component="div"
            count={totalMedia}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{ mt: 2 }}
          />
        </>
      )}

      {/* Upload dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle fontWeight={700}>Upload Media</DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Supported formats: JPEG, PNG, GIF, WebP, and PDF. Maximum size: 5
            MB.
          </Typography>

          <Button
            component="label"
            variant="outlined"
            fullWidth
            startIcon={<CloudUploadOutlinedIcon />}
            sx={{
              py: 2,
              borderStyle: "dashed",
              textTransform: "none",
            }}
          >
            {selectedFile ? "Choose another file" : "Choose a file"}

            <input
              type="file"
              hidden
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
              onChange={handleFileChange}
            />
          </Button>

          {selectedFile && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: "#F8FAFC",
                borderRadius: 2,
              }}
            >
              <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>
                {selectedFile.name}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {formatFileSize(selectedFile.size)}
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            label="Alt text"
            placeholder="Describe the image (optional)"
            value={uploadAltText}
            onChange={(event) => setUploadAltText(event.target.value)}
            inputProps={{ maxLength: 255 }}
            helperText={`${uploadAltText.length}/255 characters`}
            sx={{ mt: 3 }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseUploadDialog}
            disabled={uploading}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            startIcon={
              uploading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <CloudUploadOutlinedIcon />
              )
            }
            sx={{ textTransform: "none" }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit alt text dialog */}
      <Dialog
        open={Boolean(editingMedia)}
        onClose={handleCloseEditDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle fontWeight={700}>Edit Alt Text</DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {editingMedia?.original_filename}
          </Typography>

          <TextField
            fullWidth
            label="Alt text"
            value={editAltText}
            onChange={(event) => setEditAltText(event.target.value)}
            inputProps={{ maxLength: 255 }}
            helperText={`${editAltText.length}/255 characters`}
            multiline
            minRows={3}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseEditDialog}
            disabled={savingEdit}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={savingEdit}
            sx={{ textTransform: "none" }}
          >
            {savingEdit ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={Boolean(mediaToDelete)}
        onClose={() => !deleting && setMediaToDelete(null)}
      >
        <DialogTitle fontWeight={700}>Delete Media</DialogTitle>

        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete{" "}
            <strong>{mediaToDelete?.original_filename}</strong>? This will
            permanently delete the media file and its database record.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setMediaToDelete(null)}
            disabled={deleting}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteMedia}
            disabled={deleting}
            sx={{ textTransform: "none" }}
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
