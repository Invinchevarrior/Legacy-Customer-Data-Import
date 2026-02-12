/**
 * Security Utilities
 * 
 * Provides functions for input sanitization, NoSQL injection prevention, and XSS protection
 */

/**
 * Sanitize Input for NoSQL Injection Prevention
 * 
 * Prevents NoSQL injection by removing dangerous operators
 * Examples of prevented attacks:
 * - {"$ne": null}
 * - {"$gt": ""}
 * - {"$regex": ".*"}
 * 
 * @param {*} obj - Object or value to sanitize
 * @returns {*} Sanitized object
 */
const sanitizeNoSQL = (obj) => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Remove NoSQL operators from strings
    return obj.replace(/\$/g, '\\$');
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeNoSQL(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Reject keys starting with $ (NoSQL operators)
        if (key.startsWith('$')) {
          continue;
        }
        sanitized[key] = sanitizeNoSQL(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Sanitize Input for XSS Prevention
 * 
 * Escapes HTML special characters to prevent script injection
 * 
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeXSS = (str) => {
  if (typeof str !== 'string') return str;

  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  return str.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
};

/**
 * Validate Email Domain (prevent homograph attacks)
 * 
 * Checks for suspicious unicode characters in email domain
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} Whether email domain is safe
 */
const isEmailDomainSafe = (email) => {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Check for international characters that could be visually similar
    const suspiciousChars = /[\u0430-\u044f\u0410-\u042f\u0080-\u00ff]/;
    return !suspiciousChars.test(domain);
  } catch (e) {
    return false;
  }
};

/**
 * Validate CSV Field for Injection Attacks
 * 
 * Prevents formula injection (=, +, -, @, tab)
 * Prevents command injection
 * 
 * @param {string} field - CSV field value
 * @returns {boolean} Whether field is safe
 */
const isCsvFieldSafe = (field) => {
  if (typeof field !== 'string') return true;

  const trimmed = field.trim();

  // Prevent formula injection
  if (trimmed.match(/^[=+\-@\t\r]/)) {
    return false;
  }

  // Prevent command injection patterns
  if (trimmed.match(/[`;$(){}[\]|&<>]/)) {
    return false;
  }

  return true;
};

/**
 * Remove Sensitive Headers from Response
 * 
 * Prevents information disclosure
 * 
 * @param {Object} obj - Object to clean
 * @param {string[]} fieldsToRemove - Fields to remove
 * @returns {Object} Cleaned object
 */
const removeSensitiveFields = (obj, fieldsToRemove = ['password', 'token', 'secret', '__v']) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => removeSensitiveFields(item, fieldsToRemove));
  }

  const cleaned = { ...obj };
  fieldsToRemove.forEach((field) => {
    delete cleaned[field];
  });

  return cleaned;
};

/**
 * Rate Limit Key Generator
 * 
 * Generates rate limit key considering trust proxy
 * 
 * @param {Object} req - Express request object
 * @returns {string} Rate limit key
 */
const getRateLimitKey = (req) => {
  // Try to get real IP from headers if behind proxy
  let ip = req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.ip;

  // Fallback if still no IP
  if (!ip) ip = 'unknown';

  return ip.trim();
};

/**
 * Validate URL Format (prevent SSRF attacks)
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is safe (external)
 */
const isExternalUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Block internal/private IP addresses
    const internalIps = /^(localhost|127\.|192\.168\.|10\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[01]\.|::1|fc00:|fd00:)/;
    
    if (internalIps.test(hostname)) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
};

module.exports = {
  sanitizeNoSQL,
  sanitizeXSS,
  isEmailDomainSafe,
  isCsvFieldSafe,
  removeSensitiveFields,
  getRateLimitKey,
  isExternalUrl
};
