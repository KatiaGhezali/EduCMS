const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const { rateLimit } = require("express-rate-limit");
const path = require("path");

// Load environment variables
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

// Database connection
const { query } = require("./config/database");

// Initialize Express
const app = express();

// API version
const API_VERSION = process.env.API_VERSION || "v1";
const API_PREFIX = `/api/${API_VERSION}`;

// 1. SECURITY MIDDLEWARE

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// 2. GENERAL MIDDLEWARE

// Compress HTTP responses
app.use(compression());

// Parse incoming JSON requests
app.use(express.json({ limit: "1mb" }));

// Parse URL-encoded request bodies
app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

// HTTP request logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// 3. RATE LIMITING

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use(API_PREFIX, apiLimiter);

// 4. HEALTH CHECK ROUTE

app.get(`${API_PREFIX}/health`, async (req, res) => {
  try {
    await query("SELECT 1");

    return res.status(200).json({
      success: true,
      message: "EduCMS API is running.",
      data: {
        apiVersion: API_VERSION,
        database: "connected",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    return res.status(503).json({
      success: false,
      message: "EduCMS API is running, but the database is unavailable.",
      data: {
        apiVersion: API_VERSION,
        database: "disconnected",
      },
    });
  }
});

// 5. 404 HANDLER

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// 6. CENTRALIZED ERROR HANDLER

app.use((error, req, res, next) => {
  console.error("Application error:", error);

  const statusCode = error.statusCode || error.status || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal server error." : error.message,
  });
});

module.exports = app;
