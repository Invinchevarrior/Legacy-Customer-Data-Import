const fs = require('fs');
const validator = require('validator');
const User = require('../models/user');
const csvWorker = require('../utils/csvWorker');

// Validate a single CSV row against business rules
// - full_name: required, non-empty
// - email: required, valid format
// - date_of_birth: required, ISO 8601 string, must be in the past
// - timezone: optional, but if present must be a valid IANA timezone
const validateRow = (row) => {
  const errors = [];

  const fullName = row.full_name && String(row.full_name).trim();
  const email = row.email && String(row.email).trim();
  const dobRaw = row.date_of_birth && String(row.date_of_birth).trim();
  const timezone = row.timezone && String(row.timezone).trim();

  if (!fullName) {
    errors.push('full_name is required');
  }

  if (!email || !validator.isEmail(email)) {
    errors.push('Invalid email format');
  }

  // Require a valid ISO-8601 date string that is strictly in the past
  if (!dobRaw || !validator.isISO8601(dobRaw)) {
    errors.push('date_of_birth must be a valid ISO 8601 date string');
  } else {
    const dob = new Date(dobRaw);
    if (Number.isNaN(dob.getTime()) || dob >= new Date()) {
      errors.push('date_of_birth must be in the past');
    }
  }

  // Timezone is optional; when provided validate against the runtime's timezone database
  if (timezone) {
    try {
      // Invalid timezones throw RangeError
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    } catch (e) {
      errors.push('Invalid timezone identifier');
    }
  }

  return errors;
};

exports.importUsers = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
  const filePath = req.file.path;
  try {
    const report = await csvWorker.processCSV(filePath, validateRow, async (row) => {
      // create user - map fields explicitly
      return User.create({
        full_name: row.full_name,
        email: row.email,
        date_of_birth: new Date(row.date_of_birth),
        timezone: row.timezone
      });
    });

    return res.json(report);
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: 'Failed to process CSV' });
  } finally {
    // Ensure uploaded file is removed in all cases
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
  }
};

// Ensure uploaded file is removed in all cases
// Wrap importUsers call site with middleware could handle cleanup but perform safe cleanup here
// (Note: multer stores files on disk; ensure uploads folder has proper lifecycle management in production)


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
    // Whitelist fields that can be updated
    const allowed = ['full_name', 'email', 'date_of_birth', 'timezone'];
    const update = {};
    allowed.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) update[k] = req.body[k];
    });
    if (update.date_of_birth) update.date_of_birth = new Date(update.date_of_birth);

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
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
