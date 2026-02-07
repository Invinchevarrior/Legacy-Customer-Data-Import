const mongoose = require('mongoose');
const validator = require('validator');

/**
 * User Schema Definition
 * Defines the structure and validation rules for customer records.
 * All fields are validated at the schema level using custom validators.
 */
const userSchema = new mongoose.Schema({
  // Customer's full name - required, non-empty string
  full_name: {
    type: String,
    required: [true, 'full_name is required']
  },
  // Email address - required, must be valid RFC 5322 format and globally unique
  email: {
    type: String,
    required: true,
    unique: true,
    validate: [validator.isEmail, 'Invalid email format']
  },
  // Date of birth - required, must be a valid date in the past
  // Prevents future or invalid dates from being stored
  date_of_birth: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value < new Date();
      },
      message: 'date_of_birth must be in the past'
    }
  },
  // IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
  // Optional field - when provided, must be a valid IANA timezone
  timezone: {
    type: String,
    required: false
  }
});

/**
 * Email Index
 * Creates a unique index on the email field to enforce uniqueness at the DB level.
 * Prevents duplicate email addresses from being inserted even in race conditions.
 */
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
