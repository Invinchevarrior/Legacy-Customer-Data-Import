/**
 * Centralized Error Handler Middleware
 * 
 * Provides consistent error responses across the API
 * - Logs full errors server-side
 * - Returns generic messages to clients (security)
 * - Handles MongoDB errors, validation errors, etc.
 */

const errorHandler = (err, req, res, next) => {
  const isTestEnv = process.env.NODE_ENV === 'test';

  // Log full error for debugging (skip expected noise during tests)
  if (!isTestEnv) {
    console.error('Error:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  }

  // Determine status code
  let statusCode = err.statusCode || 500;
  let clientMessage = 'Internal server error';

  // Handle MongoDB/Mongoose errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    statusCode = 400;
    if (err.code === 11000) {
      clientMessage = 'Duplicate entry detected';
    } else if (err.code === 121) {
      clientMessage = 'Document validation failed';
    }
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    clientMessage = 'Validation failed';
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    clientMessage = 'Invalid ID format';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    clientMessage = 'Invalid authentication token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    clientMessage = 'Authentication token expired';
  }

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'FILE_TOO_LARGE') {
      clientMessage = 'File size exceeds maximum allowed';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      clientMessage = 'Too many files';
    } else if (err.code === 'LIMIT_FILE_SIZE') {
      clientMessage = 'File exceeds size limit';
    } else {
      clientMessage = 'File upload error';
    }
  }

  // Preserve explicit file-filter messages (e.g. CSV-only enforcement)
  if (err.message && err.message.includes('Only CSV files are allowed')) {
    statusCode = 400;
    clientMessage = 'Only CSV files are allowed';
  }

  // Generic error response
  res.status(statusCode).json({
    error: clientMessage,
    timestamp: new Date().toISOString(),
    path: req.path,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Async Error Wrapper
 * 
 * Wraps async route handlers to catch errors and pass to error handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Not Found Handler
 * 
 * Catches requests to undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Resource not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler
};
