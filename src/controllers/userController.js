const fs = require('fs');
const csv = require('csv-parser');
const User = require('../models/user');
const validator = require('validator');

// Helper to validate a single CSV row manually before DB attempt
const validateRow = (row) => {
  const errors = [];
  if (!row.full_name) errors.push('full_name is required');
  if (!row.email || !validator.isEmail(row.email)) errors.push('Invalid email format');
  
  const dob = new Date(row.date_of_birth);
  if (!row.date_of_birth || isNaN(dob.getTime()) || dob >= new Date()) {
    errors.push('Invalid or future date_of_birth');
  }
  return errors;
};

exports.importUsers = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  const results = [];
  const report = {
    processed: 0,
    success: 0,
    rejected: 0,
    rejected_details: [] // [cite: 28]
  };

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      report.processed = results.length; // [cite: 24]

      for (const row of results) {
        // 1. Validate Format
        const validationErrors = validateRow(row);
        if (validationErrors.length > 0) {
          report.rejected++;
          report.rejected_details.push({ row, errors: validationErrors });
          continue;
        }

        // 2. Database Insert (Handle Unique Email constraint)
        try {
          await User.create({
            full_name: row.full_name,
            email: row.email,
            date_of_birth: new Date(row.date_of_birth),
            timezone: row.timezone
          });
          report.success++; // [cite: 25]
        } catch (err) {
          report.rejected++; // [cite: 26]
          report.rejected_details.push({ 
            row, 
            errors: err.code === 11000 ? ['Email already exists'] : [err.message] 
          });
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      res.json(report); // [cite: 23]
    });
};

// CRUD Operations 
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id); // [cite: 32]
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); // [cite: 33]
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id); // [cite: 34]
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};