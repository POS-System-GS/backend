/**
 * Centralized Global Error Handling Middleware
 */
module.exports = (err, req, res, next) => {
  // Log the complete stack trace for debugging
  console.error('Unhandled Error:', err);

  const statusCode = err.statusCode || 500;
  
  // Custom MSSQL connection or query execution errors
  let message = err.message || 'An unexpected server error occurred.';
  
  // Clean up database-specific detail leaks to users
  if (err.code === 'ELOGIN') {
    message = 'Database login failed. Please verify credentials.';
  } else if (err.code === 'ETIMEOUT') {
    message = 'Database operation timed out.';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};
