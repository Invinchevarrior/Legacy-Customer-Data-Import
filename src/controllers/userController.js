const fs = require('fs');
const validator = require('validator');
const User = require('../models/user');
const csvWorker = require('../utils/csvWorker');

// Validate a single CSV row
const validateRow = (row) => {
  const errors = [];
  if (!row.full_name || String(row.full_name).trim() === '') errors.push('full_name is required');
  if (!row.email || !validator.isEmail(String(row.email))) errors.push('Invalid email format');

  const dob = new Date(row.date_of_birth);
  if (!row.date_of_birth || isNaN(dob.getTime()) || dob >= new Date()) {
    errors.push('Invalid or future date_of_birth');
  }
  return errors;
};

exports.importUsers = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  try {
    const report = await csvWorker.processCSV(req.file.path, validateRow, async (row) => {
      // create user
      return User.create({
        full_name: row.full_name,
        email: row.email,
        date_of_birth: new Date(row.date_of_birth),
        timezone: row.timezone
      });
    });

    // remove uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    return res.json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// CRUD Operations
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
