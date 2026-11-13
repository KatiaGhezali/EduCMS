const fs = require("fs/promises");
const path = require("path");

const Media = require("../models/Media");

// Upload a media file
const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a file to upload.",
      });
    }

    const media = await Media.create({
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      filePath: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      altText: req.body.altText,
      uploadedBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Media uploaded successfully.",
      data: media,
    });
  } catch (error) {
    // Remove the uploaded file if saving its database record fails
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    next(error);
  }
};

// Get all media with pagination
const getAllMedia = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const defaultLimit = Number(process.env.DEFAULT_PAGE_SIZE) || 10;
    const maxLimit = Number(process.env.MAX_PAGE_SIZE) || 100;

    const limit = Math.min(
      maxLimit,
      Math.max(1, Number.parseInt(req.query.limit, 10) || defaultLimit),
    );

    // Authors can only access their own uploads
    const uploadedBy = req.user.role === "author" ? req.user.id : undefined;

    const [media, total] = await Promise.all([
      Media.findAll({ page, limit, uploadedBy }),
      Media.count({ uploadedBy }),
    ]);

    return res.status(200).json({
      success: true,
      data: media,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get a specific media record
const getMediaById = async (req, res, next) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    // Authors can only access their own uploads
    if (
      req.user.role === "author" &&
      String(media.uploaded_by) !== String(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this media.",
      });
    }

    return res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

// Update media information
const updateMedia = async (req, res, next) => {
  try {
    const { altText } = req.body;

    if (
      altText !== undefined &&
      (typeof altText !== "string" || altText.length > 255)
    ) {
      return res.status(400).json({
        success: false,
        message: "Alt text must be a string with a maximum of 255 characters.",
      });
    }

    const existingMedia = await Media.findById(req.params.id);

    if (!existingMedia) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    if (
      req.user.role === "author" &&
      String(existingMedia.uploaded_by) !== String(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this media.",
      });
    }

    const updatedMedia = await Media.update(req.params.id, { altText });

    return res.status(200).json({
      success: true,
      message: "Media information updated successfully.",
      data: updatedMedia,
    });
  } catch (error) {
    next(error);
  }
};

// Delete media
const deleteMedia = async (req, res, next) => {
  try {
    const existingMedia = await Media.findById(req.params.id);

    if (!existingMedia) {
      return res.status(404).json({
        success: false,
        message: "Media not found.",
      });
    }

    if (
      req.user.role === "author" &&
      String(existingMedia.uploaded_by) !== String(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this media.",
      });
    }

    await Media.remove(req.params.id);

    // Remove the physical file from the uploads directory
    const uploadDirectory = path.resolve(
      __dirname,
      "../../",
      process.env.UPLOAD_DIR || "uploads",
    );

    const filePath = path.join(
      uploadDirectory,
      path.basename(existingMedia.stored_filename),
    );

    await fs.unlink(filePath).catch((error) => {
      if (error.code !== "ENOENT") {
        console.error("Could not remove media file:", error.message);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Media deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadMedia,
  getAllMedia,
  getMediaById,
  updateMedia,
  deleteMedia,
};
