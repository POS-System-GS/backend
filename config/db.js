const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true', // true for Azure/production, false for local
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' // true for local self-signed certs
  },
  pool: {
    max: 15,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create a connection pool promise that will be shared across the application
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log(`Successfully connected to MSSQL server [${config.server}] database [${config.database}]`);
    return pool;
  })
  .catch(err => {
    console.error('Database connection failed! Please ensure your database is running and configuration is correct:', err.message);
    // Do not crash immediately in dev to let devs correct environment variables,
    // but reject so controllers know connection failed.
    throw err;
  });

module.exports = {
  sql,
  poolPromise
};
