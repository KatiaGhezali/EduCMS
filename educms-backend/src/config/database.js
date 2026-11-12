const { Pool } = require("pg");
// Create a PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  min: Number(process.env.DB_POOL_MIN) || 2,
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 5000,
});

// Handle errors from idle connections
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

// Execute a SQL query
const query = async (text, params = []) => {
  const result = await pool.query(text, params);
  return result;
};

// Test the database connection
const testConnection = async () => {
  let client;

  try {
    client = await pool.connect();

    const result = await client.query(
      "SELECT NOW() AS current_time, version() AS database_version",
    );

    console.log("PostgreSQL connection successful!");
    console.log("Database time:", result.rows[0].current_time);
    console.log("Database version:", result.rows[0].database_version);

    return true;
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Execute multiple queries inside a transaction
const transaction = async (callback) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  testConnection,
  transaction,
};
