const express = require('express');
const multer = require('multer');
const router = express.Router();
const userController = require('../controllers/userController');

const upload = multer({ dest: 'uploads/' }); // Temp storage for CSVs

// CSV Import Route
router.post('/upload', upload.single('file'), userController.importUsers); // [cite: 15]

// User Management Routes
router.get('/:id', userController.getUser);       // [cite: 32]
router.put('/:id', userController.updateUser);    // [cite: 33]
router.delete('/:id', userController.deleteUser); // [cite: 34]

module.exports = router;