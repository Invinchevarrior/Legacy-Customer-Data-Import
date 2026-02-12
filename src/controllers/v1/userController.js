const fs = require('fs');
const validator = require('validator');
const User = require('../../models/user');
const csvWorker = require('../../utils/csvWorker');
const { withTransaction } = require('../../config/db');
const { asyncHandler } = require('../../middleware/errorHandler');
const { sanitizeNoSQL, sanitizeXSS, isCsvFieldSafe } = require('../../utils/security');

/**
 * validateRow(row)
 * 
 * Enhanced validation with security checks
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
  } else if (!isCsvFieldSafe(fullName)) {
    errors.push('full_name contains potentially dangerous characters');
  }

  // Validate email format using RFC 5322 standard
  if (!email || !validator.isEmail(email)) {
    errors.push('Invalid email format');
  }

  // Validate date_of_birth is a valid ISO 8601 date in the past
  if (!dobRaw || !validator.isISO8601(dobRaw)) {
    errors.push('date_of_birth must be a valid ISO 8601 date string');
  } else {
    const dob = new Date(dobRaw);
    if (Number.isNaN(dob.getTime()) || dob >= new Date()) {
      errors.push('date_of_birth must be in the past');
    }
  }

  // Validate timezone (if provided) against Intl DateTimeFormat IANA database
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
 * Endpoint: POST /api/v1/users/upload
 * Handles CSV file upload with transaction support
 */
exports.importUsers = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  const filePath = req.file.path;
  const userId = req.user?.id || 'anonymous';

  try {
    // Use transaction for bulk operations
    const report = await withTransaction(async (session) => {
      return await csvWorker.processCSV(filePath, validateRow, async (row, session) => {
        // Sanitize inputs to prevent injection
        const sanitizedRow = {
          full_name: sanitizeXSS(row.full_name),
          email: row.email.toLowerCase(),
          date_of_birth: new Date(row.date_of_birth),
          timezone: row.timezone || undefined,
          importedBy: userId,
          importedAt: new Date()
        };

        return User.create([sanitizedRow], { session });
      }, session);
    });

    // Log import event for audit trail
    console.log(`[AUDIT] CSV import completed by ${userId}: ${report.success} successful, ${report.rejected} rejected`);

    return res.json(report);
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: 'Failed to process CSV' });
  } finally {
    try { fs.unlinkSync(filePath); } catch (e) { /* ignore cleanup errors */ }
  }
});

/**
 * CRUD Operations with Enhanced Security
 */

/**
 * getUser(req, res)
 * Endpoint: GET /api/v1/users/:id
 * Retrieves a single user by MongoDB ObjectId
 */
exports.getUser = asyncHandler(async (req, res) => {
  const userId = sanitizeNoSQL(req.params.id);
  
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Remove sensitive fields
  const { __v, ...userWithoutVersion } = user.toObject();
  res.json(userWithoutVersion);
});

/**
 * updateUser(req, res)
 * Endpoint: PUT /api/v1/users/:id
 * Updates user details with field-level whitelisting and transaction support
 */
exports.updateUser = asyncHandler(async (req, res) => {
  const userId = sanitizeNoSQL(req.params.id);

  // Whitelist and sanitize allowed fields
  const allowedFields = ['full_name', 'email', 'date_of_birth', 'timezone'];
  const update = {};

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      let value = req.body[field];
      
      // Sanitize string fields for injection attacks
      if (typeof value === 'string') {
        value = sanitizeXSS(value);
      }

      update[field] = value;
    }
  });

  // Convert date_of_birth string to Date object if provided
  if (update.date_of_birth && typeof update.date_of_birth === 'string') {
    update.date_of_birth = new Date(update.date_of_birth);
  }

  // Perform update with transaction
  const result = await withTransaction(async (session) => {
    return User.findByIdAndUpdate(
      userId,
      update,
      { new: true, runValidators: true, session }
    );
  });

  if (!result) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Audit logging
  console.log(`[AUDIT] User ${userId} updated by ${req.user?.id || 'anonymous'}`);

  const { __v, ...userWithoutVersion } = result.toObject();
  res.json(userWithoutVersion);
});

/**
 * deleteUser(req, res)
 * Endpoint: DELETE /api/v1/users/:id
 * Removes a user record with transaction support
 * Requires admin role
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const userId = sanitizeNoSQL(req.params.id);
  const requestingUserId = req.user?.id || 'anonymous';

  // Perform deletion with transaction
  const result = await withTransaction(async (session) => {
    return User.findByIdAndDelete(userId, { session });
  });

  if (!result) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Audit logging with enhanced details
  console.log(`[AUDIT] User ${userId} deleted by ${requestingUserId} at ${new Date().toISOString()}`);

  res.json({ message: 'User deleted successfully', id: userId });
});

/**
 * listUsers(req, res)
 * Endpoint: GET /api/v1/users
 * Lists all users with pagination
 */
exports.listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find()
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean(),
    User.countDocuments()
  ]);

  res.json({
    data: users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

/**
 * Export analytics (CSV format)
 * Endpoint: GET /api/v1/users/export/csv
 * Exports user data in CSV format
 * Requires admin role
 */
exports.exportUsersCSV = asyncHandler(async (req, res) => {
  const users = await User.find().select('-__v').lean();

  if (users.length === 0) {
    return res.status(404).json({ error: 'No users to export' });
  }

  // Build CSV content
  const headers = ['ID', 'Full Name', 'Email', 'Date of Birth', 'Timezone'];
  const rows = users.map(user => [
    user._id.toString(),
    `"${user.full_name.replace(/"/g, '""')}"`, // Escape quotes in CSV
    user.email,
    user.date_of_birth.toISOString().split('T')[0],
    user.timezone || ''
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
  res.send(csv);
});

module.exports = exports;
