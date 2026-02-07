const fs = require('fs');
const validator = require('validator');
const User = require('../models/user');
const csvWorker = require('../utils/csvWorker');

/**
 * validateRow(row)
 * 
 * Validates a single CSV row against business rules before database insertion.
 * 
 * Validation rules:
 * - full_name: required, non-empty after trimming
 * - email: required, must pass RFC 5322 validation
 * - date_of_birth: required, valid ISO 8601 string and must be in the past
 * - timezone: optional, but if present must be a valid IANA timezone
 * 
 * @param {Object} row - A CSV row object
 * @returns {Array<string>} Array of error messages (empty if valid)
 */
const validateRow = (row) => {
  const errors = [];

  // Trim and sanitize input fields
  const fullName = row.full_name && String(row.full_name).trim();
  const email = row.email && String(row.email).trim();
  const dobRaw = row.date_of_birth && String(row.date_of_birth).trim();
  const timezone = row.timezone && String(row.timezone).trim();

  // Validate full_name is present and non-empty
  if (!fullName) {
    errors.push('full_name is required');
  }

  // Validate email format using RFC 5322 standard
  if (!email || !validator.isEmail(email)) {
    errors.push('Invalid email format');
  }

  // Validate date_of_birth is a valid ISO 8601 date in the past
  // Note: This is a secondary check; schema validation also enforces past dates
  if (!dobRaw || !validator.isISO8601(dobRaw)) {
    errors.push('date_of_birth must be a valid ISO 8601 date string');
  } else {
    const dob = new Date(dobRaw);
    if (Number.isNaN(dob.getTime()) || dob >= new Date()) {
      errors.push('date_of_birth must be in the past');
    }
  }

  // Validate timezone (if provided) against Intl DateTimeFormat IANA database
  // Invalid IANA timezones throw RangeError
  if (timezone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    } catch (e) {
      errors.push('Invalid timezone identifier');
    }
  }

  return errors;
};

/**
 * importUsers(req, res)
 * 
 * Endpoint: POST /api/users/upload
 * Handles CSV file upload, row-by-row validation, and database insertion.
 * Returns a detailed import report with success/failure counts and error details.
 * 
 * Process:
 * 1. Validate file is present
 * 2. Stream CSV and validate each row using validateRow()
 * 3. Insert valid rows into MongoDB
 * 4. Collect error details for rejected rows (capped at 200)
 * 5. Delete the temporary uploaded file
 * 6. Return import report
 */
exports.importUsers = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
  const filePath = req.file.path;
  try {
    // Process CSV: validate each row and insert valid records into DB
    const report = await csvWorker.processCSV(filePath, validateRow, async (row) => {
      // Map CSV fields to User schema and convert date_of_birth to Date object
      return User.create({
        full_name: row.full_name,
        email: row.email,
        date_of_birth: new Date(row.date_of_birth),
        timezone: row.timezone
      });
    });

    return res.json(report);
  } catch (err) {
    // Log full error server-side; return generic error to client (avoid info leakage)
    console.error('Import error:', err);
    return res.status(500).json({ error: 'Failed to process CSV' });
  } finally {
    // Ensure uploaded file is always cleaned up, success or failure
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore cleanup errors */ }
  }
};

/**
 * CRUD Operations for User Management
 */

/**
 * getUser(req, res)
 * Endpoint: GET /api/users/:id
 * Retrieves a single user by MongoDB ObjectId
 */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * updateUser(req, res)
 * Endpoint: PUT /api/users/:id
 * Updates user details with field-level whitelisting to prevent injection attacks.
 * Only allows: full_name, email, date_of_birth, timezone
 * Automatically converts date_of_birth string to Date object
 */

exports.updateUser = async (req, res) => {
  try {
    // Whitelist allowed fields to prevent injection of unexpected properties
    const allowed = ['full_name', 'email', 'date_of_birth', 'timezone'];
    const update = {};
    allowed.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) update[k] = req.body[k];
    });
    // Convert date_of_birth string to Date object if provided
    if (update.date_of_birth) update.date_of_birth = new Date(update.date_of_birth);

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * deleteUser(req, res)
 * Endpoint: DELETE /api/users/:id
 * Removes a user record from the database by ID
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
