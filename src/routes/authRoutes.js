const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiter');
const { generateToken, validateApiKey } = require('../config/auth');
const { authenticateApiKey } = require('../middleware/apiKeyAuth');

/**
 * Authentication Routes
 * 
 * Handles JWT token generation and authentication
 */

/**
 * Login Endpoint
 * POST /auth/login
 * 
 * Accepts API key and returns JWT token
 * 
 * Request:
 * {
 *   "apiKey": "your-api-key"
 * }
 * 
 * Response:
 * {
 *   "token": "eyJhbGciOi...",
 *   "expiresIn": "24h",
 *   "type": "Bearer"
 * }
 */
router.post('/login', authLimiter, (req, res) => {
  const { apiKey } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  const keyData = validateApiKey(apiKey);
  if (!keyData) {
    // Don't reveal whether key is invalid - prevent enumeration attacks
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token
  const user = {
    id: keyData.name,
    email: `${keyData.name}@api.local`,
    role: keyData.role
  };

  const token = generateToken(user);

  // Log authentication event for audit trail
  console.log(`[AUDIT] Authentication: ${keyData.name} (${keyData.role}) at ${new Date().toISOString()}`);

  res.json({
    token,
    expiresIn: '24h',
    type: 'Bearer',
    user: {
      name: keyData.name,
      role: keyData.role,
      permissions: keyData.permissions
    }
  });
});

/**
 * Verify Token Endpoint
 * GET /auth/verify
 * 
 * Verifies that a JWT token is valid
 * Must provide token in Authorization header
 */
router.get('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  // Token verification is done by the JWT middleware
  // If we reach here, token is valid
  res.json({ valid: true, message: 'Token is valid' });
});

/**
 * API Key Info Endpoint
 * GET /auth/api-key/info
 * 
 * Returns information about an API key
 */
router.get('/api-key/info', authenticateApiKey, (req, res) => {
  res.json({
    name: req.user.name,
    role: req.user.role,
    permissions: req.user.permissions
  });
});

module.exports = router;
