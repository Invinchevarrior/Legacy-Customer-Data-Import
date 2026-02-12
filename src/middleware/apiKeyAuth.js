const { validateApiKey, USER_ROLES } = require('../config/auth');

/**
 * Middleware: API Key Authentication
 * 
 * Validates API keys provided in X-API-Key header
 * Supports both JWT and API key authentication
 * 
 * Usage:
 * - JWT: Authorization: Bearer <token>
 * - API Key: X-API-Key: <key>
 */
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required (header: X-API-Key)' });
  }

  const keyData = validateApiKey(apiKey);
  if (!keyData) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  // Attach user data for authorization checks
  req.user = {
    type: 'api-key',
    role: keyData.role,
    permissions: keyData.permissions,
    name: keyData.name
  };

  next();
};

module.exports = {
  authenticateApiKey
};
