const bcrypt = require('bcryptjs');

/**
 * Authentication Configuration
 * 
 * JWT settings, API keys, and security parameters
 */

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Default API Keys (in production, use environment variables and a secrets manager)
const DEFAULT_ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin-default-key-change-this';
const DEFAULT_USER_API_KEY = process.env.USER_API_KEY || 'user-default-key-change-this';

/**
 * API Key Registry
 * 
 * Maps API keys to user roles and permissions
 * In production, store this in database with encrypted keys
 */
const VALID_API_KEYS = {
  [DEFAULT_ADMIN_API_KEY]: {
    name: 'Admin API Key',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin']
  },
  [DEFAULT_USER_API_KEY]: {
    name: 'User API Key',
    role: 'user',
    permissions: ['read', 'write']
  }
};

/**
 * Validate API Key
 * 
 * @param {string} apiKey - The API key to validate
 * @returns {Object|null} User object with role and permissions, or null if invalid
 */
const validateApiKey = (apiKey) => {
  return VALID_API_KEYS[apiKey] || null;
};

/**
 * Hash Password (for future user authentication)
 * 
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare Password (for future user authentication)
 * 
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} Whether passwords match
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * User Roles and Permissions
 * 
 * Defines access control levels
 */
const USER_ROLES = {
  ADMIN: 'admin',      // Full access
  USER: 'user',        // Read and write own data
  VIEWER: 'viewer'     // Read-only access
};

const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin'
};

/**
 * Permission Matrix
 * 
 * Defines which roles have which permissions
 */
const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [PERMISSIONS.READ, PERMISSIONS.WRITE, PERMISSIONS.DELETE, PERMISSIONS.ADMIN],
  [USER_ROLES.USER]: [PERMISSIONS.READ, PERMISSIONS.WRITE],
  [USER_ROLES.VIEWER]: [PERMISSIONS.READ]
};

/**
 * Check if user has permission
 * 
 * @param {string} role - User role
 * @param {string} permission - Required permission
 * @returns {boolean} Whether role has permission
 */
const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

module.exports = {
  JWT_SECRET,
  JWT_EXPIRY,
  DEFAULT_ADMIN_API_KEY,
  DEFAULT_USER_API_KEY,
  VALID_API_KEYS,
  validateApiKey,
  hashPassword,
  comparePassword,
  USER_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission
};
