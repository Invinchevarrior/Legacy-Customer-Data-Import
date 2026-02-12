const mongoose = require('mongoose');
const validator = require('validator');

/**
 * User Schema Definition
 * 
 * Defines the structure and validation rules for customer records
 * with audit trail support.
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
    lowercase: true,
    validate: [validator.isEmail, 'Invalid email format']
  },
  // Date of birth - required, must be a valid date in the past
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
  timezone: {
    type: String,
    required: false
  },
  // Audit trail: User who imported this record
  importedBy: {
    type: String,
    required: false,
    default: 'system'
  },
  // Audit trail: When this record was imported
  importedAt: {
    type: Date,
    required: false,
    default: Date.now
  },
  // Audit trail: When this record was last updated
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

/**
 * Email Index
 * Creates a unique index on the email field to enforce uniqueness at DB level
 * Prevents duplicate email addresses from being inserted during race conditions
 */
userSchema.index({ email: 1 }, { unique: true });

/**
 * Imported records index
 * Speeds up queries filtering by import date/user
 */
userSchema.index({ importedAt: 1 });
userSchema.index({ importedBy: 1 });

/**
 * Middleware: Update timestamp on save
 */
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);
