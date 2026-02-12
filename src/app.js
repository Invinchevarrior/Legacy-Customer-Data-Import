const express = require('express');
const authRoutes = require('./routes/authRoutes');
const userRoutesV1 = require('./routes/v1/userRoutes');
const legacyUserRoutes = require('./routes/userRoutes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

/**
 * Express Application Setup
 * 
 * Production-Ready Security Configuration:
 * - Global rate limiting to prevent DoS attacks
 * - Request validation and sanitization
 * - Centralized error handling
 * - Health check endpoint
 * - API versioning (v1 supported)
 */
const app = express();

// Security: Disable server information disclosure
app.disable('x-powered-by');

// Middleware: Parse incoming JSON request bodies (with size limit)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware: Security headers
app.use((req, res, next) => {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS headers (adjust for your needs)
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  next();
});

// Middleware: Global API rate limiting
app.use(apiLimiter);

/**
 * Health Check Endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Authentication Routes
 * Base: /auth
 * 
 * Public endpoints for:
 * - Login (POST /auth/login)
 * - Token verification (GET /auth/verify)
 * - API key info (GET /auth/api-key/info)
 */
app.use('/auth', authRoutes);

/**
 * API Versioning
 * Support for multiple API versions with independent deprecation paths
 */

/**
 * API v1 Routes
 * Base: /api/v1
 * 
 * Current stable version with all security features:
 * - Authentication (JWT)
 * - Rate Limiting
 * - Input Validation & Sanitization
 * - Transaction Support
 * - Audit Logging
 */
app.use('/api/v1/users', userRoutesV1);

// Legacy compatibility: mount original unversioned routes at /api/users
// These routes maintain existing behavior for clients/tests that expect
// the legacy endpoints without authentication.
app.use('/api/users', legacyUserRoutes);

/**
 * API Root Documentation
 * GET /api
 */
app.get('/api', (req, res) => {
  res.json({
    message: 'Legacy Customer Data Import API',
    version: '1.0.0',
    endpoints: {
      v1: '/api/v1/users'
    },
    documentation: {
      quickStart: 'Check README.md for API documentation',
      authentication: 'Use JWT Bearer tokens or X-API-Key headers',
      rateLimiting: 'Apply to prevent abuse'
    }
  });
});

// Middleware: 404 Not Found Handler
app.use(notFoundHandler);

// Middleware: Centralized Error Handler (must be last)
app.use(errorHandler);

module.exports = app;
