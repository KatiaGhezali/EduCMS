const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

// Database connection pool
const { pool } = require("../src/config/database");

// Execute database migration
const runMigration = async () => {
  let client;
  let schema = "";

  try {
    console.log("Starting database migration...");

    // Read the SQL schema file
    const schemaPath = path.join(__dirname, "schema.sql");
    schema = fs.readFileSync(schemaPath, "utf8");

    // Get a database connection
    client = await pool.connect();

    // Start a transaction
    await client.query("BEGIN");

    // Execute the SQL schema
    await client.query(schema);

    // Commit the transaction
    await client.query("COMMIT");

    console.log("Database migration completed successfully!");
  } catch (error) {
    // Roll back changes if migration fails
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("Database migration failed:", error.message);

    if (error.position) {
      const position = Number(error.position);
      const textBeforeError = schema.slice(0, position);
      const lineNumber = textBeforeError.split("\n").length;
      const columnNumber = position - textBeforeError.lastIndexOf("\n");

      console.error(`SQL error at line ${lineNumber}, column ${columnNumber}`);
      console.error(
        schema
          .split("\n")
          .slice(Math.max(0, lineNumber - 3), lineNumber + 2)
          .join("\n"),
      );
    }

    process.exitCode = 1;
  } finally {
    // Release the database connection
    if (client) {
      client.release();
    }

    // Close the connection pool
    await pool.end();
  }
};

// Run the migration
runMigration();
