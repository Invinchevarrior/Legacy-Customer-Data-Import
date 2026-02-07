const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * Multer Configuration
 * 
 * Configures file upload handling with security constraints:
 * - File size limit: 5 MB (prevents resource exhaustion)
 * - File type filter: CSV only (prevents malicious file uploads)
 * - Destination: temporary uploads directory
 */

// Ensure uploads directory exists for temporary file storage
const uploadsDir = path.join(process.cwd(), 'uploads');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { /* ignore */ }

// Configure multer with security settings
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max file size
  // File filter: only accept CSV files
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedMime = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (ext !== '.csv' && !allowedMime.includes(file.mimetype)) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// CSV Import Route
// POST /api/users/upload - Upload and process CSV file with automatic validation
router.post('/upload', upload.single('file'), userController.importUsers);

// User Management Routes
// GET /api/users/:id - Retrieve user by MongoDB ObjectId
router.get('/:id', userController.getUser);

// PUT /api/users/:id - Update user details (whitelisted fields only)
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - Remove user record
router.delete('/:id', userController.deleteUser);

module.exports = router;
