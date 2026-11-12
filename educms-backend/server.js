const app = require("./src/app");
const { pool } = require("./src/config/database");

const PORT = process.env.PORT || 5000;

// Start the Express server
const server = app.listen(PORT, () => {
  console.log("=================================");
  console.log("EduCMS Backend");
  console.log("=================================");
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api/v1`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
  console.log("=================================");
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down server...`);

  server.close(async () => {
    try {
      await pool.end();
      console.log("Database connections closed.");
      process.exitCode = 0;
    } catch (error) {
      console.error("Error closing database connections:", error.message);
      process.exitCode = 1;
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
