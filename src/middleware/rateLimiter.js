const rateLimit = require('express-rate-limit');

/**
 * Authentication Rate Limiter
 * 
 * Prevents brute force attacks on authentication endpoints
 * - 5 requests per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts. Please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress
});

/**
 * General API Rate Limiter
 * 
 * Prevents service abuse and DoS attacks
 * - 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP. Please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  skip: (req) => {
    // Don't rate limit health checks or static content
    return req.path.match(/^\/(health|metrics|api-docs)/);
  }
});

/**
 * CSV Upload Rate Limiter
 * 
 * Stricter limits for file upload operations
 * - 10 uploads per hour per IP
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many file uploads. Please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress
});

/**
 * CRUD Operation Rate Limiter
 * 
 * Prevents bulk operations from overwhelming the database
 * - 50 create/update/delete operations per 15 minutes per IP
 */
const crudLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many operations. Please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress
});

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
  crudLimiter
};
