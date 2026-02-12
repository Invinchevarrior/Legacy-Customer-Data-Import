const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../config/auth');

/**
 * Middleware: Authentication via JWT Bearer Token
 * 
 * Validates JWT tokens in Authorization: Bearer <token> header.
 * Extracts user info and attaches to req.user
 * 
 * Response:
 * - 401: Missing or invalid token
 * - 403: Token expired or invalid signature
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Middleware: Authorization by Role
 * 
 * Restricts endpoint access to specific user roles.
 * Must be used after authenticateToken middleware.
 * 
 * @param {...string} allowedRoles - Allowed role values
 * @returns {Function} Express middleware
 */
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this operation' });
    }
    next();
  };
};

/**
 * Generate JWT Token
 * 
 * Creates an access token for authenticated users.
 * 
 * @param {Object} user - User object with id and role
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

module.exports = {
  authenticateToken,
  authorizeRole,
  generateToken
};
