const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const userController = require('../controllers/userController');

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { /* ignore */ }

// Multer configuration: limit size and accept CSV only
const upload = multer({
	dest: uploadsDir,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
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
router.post('/upload', upload.single('file'), userController.importUsers);

// User Management Routes
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
