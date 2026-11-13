const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { poolPromise } = require('./config/db');
const errorHandler = require('./middleware/error');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test Database Connection at startup
poolPromise
  .then(() => {
    console.log('MSSQL database pool initialized successfully.');
  })
  .catch(err => {
    console.error('CRITICAL ERROR: Failed to connect to MSSQL at startup. Server will continue but API requests will fail.');
  });

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Welcome page
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the FreshMart Grocery POS API Service!',
    version: '1.0.0'
  });
});

// Handle 404 Not Found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`
  });
});

// Global Error Handler Middleware
app.use(errorHandler);

// Start server listening
app.listen(PORT, () => {
  console.log(`Grocery Shop POS Backend is running in ${process.env.NODE_ENV || 'production'} mode on http://localhost:${PORT}`);
});
