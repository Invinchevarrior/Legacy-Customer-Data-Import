const express = require('express');
const multer = require('multer');
const router = express.Router();
const userController = require('../controllers/userController');

const upload = multer({ dest: 'uploads/' }); // Temp storage for CSVs

// CSV Import Route
router.post('/upload', upload.single('file'), userController.importUsers);

// User Management Routes
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
