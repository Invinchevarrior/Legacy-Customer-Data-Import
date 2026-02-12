const { body, param, validationResult } = require('express-validator');
const validator = require('validator');

/**
 * Validation Rules for User Updates
 * 
 * Sanitizes and validates user input fields:
 * - full_name: string, 2-100 chars, no special characters
 * - email: valid email format
 * - date_of_birth: valid ISO 8601 date in the past
 * - timezone: valid IANA timezone
 */
const validateUserUpdate = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('full_name must be 2-100 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('full_name contains invalid characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('date_of_birth must be ISO 8601 format')
    .custom((value) => {
      const dob = new Date(value);
      if (dob >= new Date()) {
        throw new Error('date_of_birth must be in the past');
      }
      return true;
    }),

  body('timezone')
    .optional()
    .trim()
    .custom((value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
        return true;
      } catch (e) {
        throw new Error('Invalid timezone identifier');
      }
    })
];

/**
 * Validation Rules for User ID Parameter
 * 
 * Validates MongoDB ObjectId format
 */
const validateUserId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

/**
 * Middleware: Handle Validation Errors
 * 
 * Collects all validation errors and returns formatted response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: messages 
    });
  }
  next();
};

module.exports = {
  validateUserUpdate,
  validateUserId,
  handleValidationErrors
};
