const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const userController = require('../../controllers/v1/userController');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { validateUserUpdate, validateUserId, handleValidationErrors } = require('../../middleware/validation');
const { uploadLimiter, crudLimiter } = require('../../middleware/rateLimiter');
const { validateCsvFile } = require('../../middleware/csvFileValidator');

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { /* ignore */ }

/**
 * Multer Configuration
 * 
 * Enhanced with size limits and type filtering
 */
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max file size (checked again by validator)
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedMime = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (ext !== '.csv' && !allowedMime.includes(file.mimetype)) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * CSV Import Route
 * 
 * POST /api/v1/users/upload
 * 
 * Security:
 * - Requires authentication
 * - Rate limited to 10 uploads per hour
 * - CSV file validated for bombs and malicious content
 * - Operations wrapped in transactions
 */
router.post(
  '/upload',
  authenticateToken,
  authorizeRole('admin', 'user'),
  uploadLimiter,
  upload.single('file'),
  validateCsvFile,
  userController.importUsers
);

/**
 * User Management Routes
 */

/**
 * List Users with Pagination
 * GET /api/v1/users
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * 
 * Security:
 * - Requires authentication
 */
router.get(
  '/',
  authenticateToken,
  authorizeRole('admin', 'user'),
  userController.listUsers
);

/**
 * Get User by ID
 * GET /api/v1/users/:id
 * 
 * Security:
 * - Requires authentication
 * - Validates MongoDB ObjectId
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'user'),
  validateUserId,
  handleValidationErrors,
  userController.getUser
);

/**
 * Update User
 * PUT /api/v1/users/:id
 * 
 * Body Parameters (all optional):
 * - full_name (string, 2-100 chars)
 * - email (valid email format)
 * - date_of_birth (ISO 8601, past date)
 * - timezone (valid IANA timezone)
 * 
 * Security:
 * - Requires authentication
 * - Input validation and sanitization
 * - Rate limited CRUD operations
 * - Transactions ensure consistency
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'user'),
  crudLimiter,
  validateUserId,
  validateUserUpdate,
  handleValidationErrors,
  userController.updateUser
);

/**
 * Delete User
 * DELETE /api/v1/users/:id
 * 
 * Security:
 * - Requires authentication AND admin role
 * - Audit logging
 * - Rate limited
 * - Transactions ensure consistency
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole('admin'),
  crudLimiter,
  validateUserId,
  handleValidationErrors,
  userController.deleteUser
);

/**
 * Export Users as CSV
 * GET /api/v1/users/export/csv
 * 
 * Security:
 * - Requires authentication AND admin role
 */
router.get(
  '/export/csv',
  authenticateToken,
  authorizeRole('admin'),
  userController.exportUsersCSV
);

module.exports = router;
