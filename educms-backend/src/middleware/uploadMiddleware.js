const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Upload configuration
const uploadDirectory = path.resolve(
  __dirname,
  "../../",
  process.env.UPLOAD_DIR || "uploads",
);

const maxFileSize = Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;

// Supported MIME types
const allowedMimeTypes = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

// Create upload directory if it does not exist
fs.mkdirSync(uploadDirectory, { recursive: true });

// Configure file storage
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = allowedMimeTypes[file.mimetype];
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

// Check the declared MIME type
const fileFilter = (req, file, callback) => {
  if (!allowedMimeTypes[file.mimetype]) {
    const error = new Error(
      "Invalid file type. Allowed formats: JPEG, PNG, GIF, WebP and PDF.",
    );

    error.statusCode = 400;
    return callback(error);
  }

  callback(null, true);
};

// Verify the actual file signature
const verifyFileSignature = async (file) => {
  const handle = await fs.promises.open(file.path, "r");

  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);

    if (bytesRead < 3) return false;

    switch (file.mimetype) {
      case "image/jpeg":
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

      case "image/png":
        return buffer
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          );

      case "image/gif":
        return (
          buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
          buffer.subarray(0, 6).toString("ascii") === "GIF89a"
        );

      case "image/webp":
        return (
          buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
          buffer.subarray(8, 12).toString("ascii") === "WEBP"
        );

      case "application/pdf":
        return buffer.subarray(0, 5).toString("ascii") === "%PDF-";

      default:
        return false;
    }
  } finally {
    await handle.close();
  }
};

// Configure Multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize,
  },
});

// Handle upload and verify file contents
const uploadSingleMedia = (req, res, next) => {
  upload.single("file")(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message:
            error.code === "LIMIT_FILE_SIZE"
              ? `File is too large. Maximum size is ${maxFileSize} bytes.`
              : error.message,
        });
      }

      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }

    if (!req.file) {
      return next();
    }

    try {
      const isValid = await verifyFileSignature(req.file);

      if (!isValid) {
        await fs.promises.unlink(req.file.path);

        return res.status(400).json({
          success: false,
          message: "The file content does not match its declared file type.",
        });
      }

      next();
    } catch (verificationError) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      next(verificationError);
    }
  });
};

module.exports = {
  uploadSingleMedia,
};
