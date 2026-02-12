# Security & Production Implementation Guide

This document outlines the critical security and production-readiness improvements added to the Legacy Customer Data Import system.

## Table of Contents

1. [Critical Security Implementations](#critical-security-implementations)
2. [Setup & Configuration](#setup--configuration)
3. [API Documentation](#api-documentation-v1)
4. [Migration Guide](#migration-guide)
5. [Deployment Checklist](#deployment-checklist)
6. [Troubleshooting](#troubleshooting)

---

## Critical Security Implementations

### 1. **Authentication & Authorization**

**Problem:** Endpoints were completely open to unauthorized access. Anyone could delete all customer data without restriction.

**Solution:**
- **JWT Token-based Authentication:** All protected endpoints require valid JWT tokens
- **API Key Management:** Support for API keys with role-based access control
- **Role-Based Access Control (RBAC):**
  - `admin`: Full access (read, write, delete, admin operations)
  - `user`: Standard access (read, write operations)
  - `viewer`: Read-only access

**Implementation:**
```javascript
// Get JWT Token
POST /auth/login
{
  "apiKey": "admin-default-key-change-this"
}

// Response:
{
  "token": "eyJhbGciOi...",
  "expiresIn": "24h",
  "type": "Bearer"
}

// Use Token
Authorization: Bearer <token>
```

**Key Files:**
- `src/config/auth.js` - Authentication configuration
- `src/middleware/auth.js` - JWT middleware
- `src/middleware/apiKeyAuth.js` - API key authentication
- `src/routes/authRoutes.js` - Authentication endpoints

---

### 2. **Rate Limiting**

**Problem:** Service could be overwhelmed with unlimited requests, leading to Denial of Service (DoS) attacks.

**Solution:**
- **Global Rate Limiter:** 100 requests per 15 minutes per IP
- **Auth Rate Limiter:** 5 authentication attempts per 15 minutes (prevents brute force)
- **Upload Rate Limiter:** 10 CSV uploads per hour per IP
- **CRUD Rate Limiter:** 50 operations per 15 minutes per IP

**Configuration:**
```javascript
// src/middleware/rateLimiter.js
- Authentication: 5/15min
- API Operations: 100/15min
- File Uploads: 10/hour
- CRUD Operations: 50/15min
```

**Headers Returned:**
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1234567890
```

**Key Files:**
- `src/middleware/rateLimiter.js` - Rate limiting configuration

---

### 3. **Request Validation & Sanitization**

**Problem:** Vulnerable to NoSQL injection, XSS, and formula injection attacks.

**Solution:**
- **Input Validation:** Comprehensive field validation using `express-validator`
- **NoSQL Injection Prevention:** Escapes NoSQL operators and filters dangerous keys
- **XSS Prevention:** HTML entity encoding for string fields
- **CSV Formula Injection Prevention:** Blocks dangerous prefixes (=, +, -, @)

**Validation Rules:**
```javascript
// Full Name
- Required, 2-100 characters
- Only letters, spaces, hyphens, periods, and apostrophes

// Email
- Valid RFC 5322 format
- Case-insensitive, globally unique

// Date of Birth
- ISO 8601 format
- Must be in the past

// Timezone
- Valid IANA timezone identifier
```

**Key Files:**
- `src/utils/security.js` - Security utilities
- `src/middleware/validation.js` - Request validation

---

### 4. **Input File Validation**

**Problem:** No protection against CSV bombs or malicious files that could crash or overwhelm the server.

**Solution:**
- **File Size Limits:** 50 MB maximum file size
- **Row Limits:** Maximum 100,000 rows per file
- **Column Limits:** Maximum 100 columns per row
- **Cell Size Limits:** Maximum 1 MB per cell
- **Total Cell Limit:** Maximum 10 million cells per file
- **CSV Bomb Detection:** Identifies suspicious patterns (huge rows, excess columns)

**Validation Process:**
```
1. Check file exists and is readable
2. Verify file size within limits
3. Validate CSV header format
4. Sample rows for bomb detection
5. Check for compression bomb patterns
```

**Error Handling:**
```json
{
  "error": "CSV file appears to be malicious or corrupted (potential CSV bomb detected)"
}
```

**Key Files:**
- `src/middleware/csvFileValidator.js` - CSV validation middleware

---

### 5. **Database Transaction Safety**

**Problem:** Partial failures could leave database in inconsistent state. If 50 of 100 records insert successfully but then an error occurs, the other 50 remain uninserted with no way to rollback.

**Solution:**
- **MongoDB Sessions & Transactions:** ACID-compliant bulk operations
- **Automatic Rollback:** If any operation fails, entire transaction is rolled back
- **Consistency Guarantee:** All-or-nothing semantics for bulk operations

**Implementation:**
```javascript
const report = await withTransaction(async (session) => {
  // All operations within transaction
  // If ANY fails, ALL are rolled back
  return await User.create(users, { session });
});
```

**Key Files:**
- `src/config/db.js` - Database configuration with transaction support
- `src/utils/csvWorker.js` - CSV processing with session support

---

### 6. **API Versioning**

**Problem:** No migration path for breaking changes. Any API modification breaks all clients immediately.

**Solution:**
- **Versioned Routes:** `/api/v1/` base path for current stable version
- **Backward Compatibility:** Support for multiple API versions simultaneously
- **Deprecation Strategy:** Plan for v2+ with clear migration paths
- **Version Negotiation:** Accept `Accept` header for version selection

**Current Version:**
- **v1:** `/api/v1/users` - Current stable with all security features

**Future Versions:**
- **v2:** Plan breaking changes with v1 still available
- **Deprecation:** Announce sunsetting dates 90+ days in advance

**Key Files:**
- `src/routes/v1/userRoutes.js` - V1 routes
- `src/controllers/v1/userController.js` - V1 controllers

---

## Setup & Configuration

### Prerequisites
- Node.js v16+
- MongoDB 4.4+
- npm or yarn

### Installation

```powershell
# 1. Install dependencies
npm install

# 2. Set environment variables (create .env file)
# CRITICAL: Change these from defaults in production!

MONGO_URI=mongodb://localhost:27017/legacy_import
MONGO_URI_TEST=mongodb://localhost:27017/test_db

# Authentication
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRY=24h
ADMIN_API_KEY=admin-default-key-change-this
USER_API_KEY=user-default-key-change-this

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# 3. Start MongoDB
# (Ensure it's running on localhost:27017 or set MONGO_URI)

# 4. Run the server
npm start
```

### Environment Variables (Production)

**Critical:** Change all default values in production!

```bash
# Authentication
JWT_SECRET=<generate-strong-random-secret>
ADMIN_API_KEY=<generate-admin-key>
USER_API_KEY=<generate-user-key>

# Database
MONGO_URI=<production-mongodb-connection-string>

# Security
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production

# Rate Limiting (optional customization)
RATE_LIMIT_WINDOW=900000  # 15 minutes in ms
RATE_LIMIT_MAX=100        # requests per window
```

### Generating Secrets (Production)

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate API Keys
openssl rand -hex 32
```

---

## API Documentation (v1)

### Authentication

#### Login (Get JWT Token)

```http
POST /auth/login

Content-Type: application/json
{
  "apiKey": "user-default-key-change-this"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "type": "Bearer",
  "user": {
    "name": "User API Key",
    "role": "user",
    "permissions": ["read", "write"]
  }
}
```

**Using the Token:**
```http
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Or Using API Key Directly:**
```http
GET /api/v1/users
X-API-Key: user-default-key-change-this
```

---

#### Verify (current behavior)

`GET /auth/verify` currently checks that a Bearer token is present and returns a success response. It does **not** perform JWT verification itself; JWT validation is enforced by `authenticateToken` on protected routes (e.g. `/api/v1/*`).

### CSV Upload & Import

#### Upload and Import CSV File

```http
POST /api/v1/users/upload
Authorization: Bearer <token>
X-API-Key: <api-key>

Content-Type: multipart/form-data
file: @customers.csv
```

**CSV Format:**
```csv
full_name,email,date_of_birth,timezone
John Doe,john@example.com,1990-01-15,America/New_York
Jane Smith,jane@example.com,1985-03-22,Europe/London
```

**Response (Success):**
```json
{
  "processed": 2,
  "success": 2,
  "rejected": 0,
  "rejected_details": []
}
```

**Response (With Errors):**
```json
{
  "processed": 3,
  "success": 2,
  "rejected": 1,
  "rejected_details": [
    {
      "row": {
        "full_name": "Invalid",
        "email": "invalid-email",
        "date_of_birth": "2025-01-01",
        "timezone": "Invalid/Zone"
      },
      "errors": [
        "Invalid email format",
        "date_of_birth must be in the past",
        "Invalid timezone identifier"
      ]
    }
  ]
}
```

**Rate Limiting:**
- 10 uploads per hour per IP
- If exceeded: HTTP 429 (Too Many Requests)

---

### User Resource

#### List Users

```http
GET /api/v1/users?page=1&limit=10
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10, max: 100)

**Response:**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "full_name": "John Doe",
      "email": "john@example.com",
      "date_of_birth": "1990-01-15T00:00:00.000Z",
      "timezone": "America/New_York",
      "importedBy": "admin",
      "importedAt": "2024-01-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

---

#### Get User by ID

```http
GET /api/v1/users/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "full_name": "John Doe",
  "email": "john@example.com",
  "date_of_birth": "1990-01-15T00:00:00.000Z",
  "timezone": "America/New_York",
  "importedBy": "admin",
  "importedAt": "2024-01-20T10:30:00.000Z",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

---

#### Update User

```http
PUT /api/v1/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Jane Doe",
  "timezone": "Europe/London"
}
```

**Allowed Fields:**
- `full_name` (2-100 chars, letters/spaces/hyphens/apostrophes)
- `email` (valid email format)
- `date_of_birth` (ISO 8601, past date)
- `timezone` (valid IANA timezone)

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "full_name": "Jane Doe",
  "email": "john@example.com",
  "date_of_birth": "1990-01-15T00:00:00.000Z",
  "timezone": "Europe/London",
  "importedBy": "admin",
  "importedAt": "2024-01-20T10:30:00.000Z",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-21T15:45:00.000Z"
}
```

---

#### Delete User

```http
DELETE /api/v1/users/:id
Authorization: Bearer <token>
```

**Required Role:** `admin` only

**Response:**
```json
{
  "message": "User deleted successfully",
  "id": "507f1f77bcf86cd799439011"
}
```

---

#### Export Users as CSV

```http
GET /api/v1/users/export/csv
Authorization: Bearer <token>
```

**Required Role:** `admin` only

**Response:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="users-export.csv"

ID,Full Name,Email,Date of Birth,Timezone
507f1f77bcf86cd799439011,John Doe,john@example.com,1990-01-15,America/New_York
507f1f77bcf86cd799439012,Jane Smith,jane@example.com,1985-03-22,Europe/London
```

---

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

#### 403 Forbidden
```json
{
  "error": "Insufficient permissions for this operation"
}
```

#### 404 Not Found
```json
{
  "error": "User not found"
}
```

#### 429 Too Many Requests
```json
{
  "error": "Too many requests from this IP. Please try again later"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "path": "/api/v1/users"
}
```

---

## Migration Guide

### From Old Endpoints to v1

#### Legacy Endpoints (Compatibility)
```
POST /api/users/upload
GET /api/users/:id
PUT /api/users/:id
DELETE /api/users/:id
```

**Note:** The application currently still mounts these legacy routes at `/api/users` in `src/app.js` for backwards compatibility. They may not have the full v1 security middleware applied by default. For production, migrate clients to v1 and disable/protect the legacy mount.

#### v1 Endpoints (Recommended / Protected)
```
POST /api/v1/users/upload     # Same functionality
GET /api/v1/users/:id         # Same functionality
PUT /api/v1/users/:id         # Same functionality
DELETE /api/v1/users/:id      # Requires admin role
```

#### Required Changes

**1. Authentication Setup:**
```powershell
# Get a JWT token first
$response = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"apiKey":"user-default-key-change-this"}'

$token = ($response.Content | ConvertFrom-Json).token
```

**2. Use Token in Requests:**
```powershell
# Old (Not Authenticated)
Invoke-WebRequest -Uri "http://localhost:3000/api/users/507f1f77bcf86cd799439011" `
  -Method Get

# New (With Authentication)
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/users/507f1f77bcf86cd799439011" `
  -Method Get `
  -Headers $headers
```

**3. CSV Upload:**
```powershell
# New with authentication
$filePath = "C:\path\to\customers.csv"
$form = @{ file = Get-Item -Path $filePath }
$headers = @{ "Authorization" = "Bearer $token" }

Invoke-WebRequest -Uri "http://localhost:3000/api/v1/users/upload" `
  -Method Post `
  -Form $form `
  -Headers $headers
```

**4. Delete User (Now Requires Admin Role):**
```powershell
# Requires admin API key, not user API key
$adminResponse = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"apiKey":"admin-default-key-change-this"}'

$adminToken = ($adminResponse.Content | ConvertFrom-Json).token

$headers = @{ "Authorization" = "Bearer $adminToken" }
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/users/507f1f77bcf86cd799439011" `
  -Method Delete `
  -Headers $headers
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Environment Variables:**
  - [ ] Change `JWT_SECRET` to a strong random string
  - [ ] Change `ADMIN_API_KEY` to a new admin key
  - [ ] Change `USER_API_KEY` to a new user key
  - [ ] Set `NODE_ENV=production`
  - [ ] Configure `CORS_ORIGIN` for your domain
  - [ ] Update `MONGO_URI` to production MongoDB

- [ ] **Security:**
  - [ ] Enable HTTPS/TLS
  - [ ] Configure CORS properly (don't use '*' in production)
  - [ ] Set up rate limiting thresholds appropriately
  - [ ] Configure firewall rules
  - [ ] Enable MongoDB authentication

- [ ] **Database:**
  - [ ] Backup existing data
  - [ ] Run migrations (schema already updated)
  - [ ] Create database indices
  - [ ] Enable MongoDB transactions (v4.0+)
  - [ ] Set up automated backups

- [ ] **Monitoring:**
  - [ ] Set up application logging
  - [ ] Configure error tracking (e.g., Sentry)
  - [ ] Set up performance monitoring
  - [ ] Create database monitoring alerts
  - [ ] Monitor rate limiting metrics

- [ ] **Testing:**
  - [ ] Run full test suite: `npm test`
  - [ ] Test authentication flows
  - [ ] Verify rate limiting works
  - [ ] Test CSV upload with various file sizes
  - [ ] Test error handling and edge cases
  - [ ] Load test with production-like volume

- [ ] **Documentation:**
  - [ ] Update client documentation
  - [ ] Document new API keys
  - [ ] Create runbook for troubleshooting
  - [ ] Document backup/restore procedures

### Deployment

```bash
# 1. Install dependencies (production only)
npm ci --only=production

# 2. Run tests
npm test

# 3. Set environment variables
export NODE_ENV=production
export JWT_SECRET=<your-secret>
export ADMIN_API_KEY=<admin-key>
export USER_API_KEY=<user-key>
export MONGO_URI=<production-uri>

# 4. Start application
npm start
```

### Post-Deployment

- [ ] Verify application is running
- [ ] Test all authentication flows
- [ ] Verify audit logs are being written
- [ ] Monitor error rates
- [ ] Test backup restoration
- [ ] Notify users of changes
- [ ] Document any configuration specifics

---

## Troubleshooting

### Authentication Issues

**Problem:** "Access token required"
```json
{
  "error": "Access token required"
}
```

**Solution:**
1. Did you forget to include the `Authorization` header?
2. Is the header formatted correctly? `Authorization: Bearer <token>`
3. Is the token expired? Get a new one from `/auth/login`

---

**Problem:** "Invalid or expired token"
```json
{
  "error": "Invalid or expired token"
}
```

**Solution:**
1. Get a fresh token from `/auth/login`
2. Verify the JWT_SECRET hasn't changed
3. Check token hasn't expired (default 24h)

---

### Rate Limiting Issues

**Problem:** "Too many requests"
```json
{
  "error": "Too many requests from this IP. Please try again later"
}
```

**Solution:**
1. Wait 15 minutes for the rate limit window to reset
2. In production, use backend API keys to bypass user IP limits
3. Check `RateLimit-Reset` header for reset timestamp

---

### CSV Upload Issues

**Problem:** "CSV file appears to be malicious"
```json
{
  "error": "CSV file appears to be malicious or corrupted"
}
```

**Solution:**
1. File size exceeds 50 MB - compress or split
2. File has >100,000 rows - split into multiple files
3. File has >100 columns - verify CSV structure
4. Individual cells exceed 1 MB - trim data

**File Size Limits:**
- Maximum file: 50 MB
- Maximum rows: 100,000
- Maximum columns: 100
- Maximum cell size: 1 MB
- Maximum total cells: 10 million

---

### Database Issues

**Problem:** "Database connection error"

**Solution:**
1. Is MongoDB running? `Get-Service -Name MongoDB`
2. Is connection string correct? Check `MONGO_URI`
3. Are credentials valid?
4. Is network connectivity working?

```powershell
# Test MongoDB connection
mongo "mongodb://localhost:27017/legacy_import"
```

---

### Transaction Rollback Issues

If you see partial data imports, this indicates a transaction failed:

1. Check MongoDB logs: `tail -f /var/log/mongodb/mongod.log`
2. Verify MongoDB version supports transactions (4.0+)
3. Check database disk space
4. Monitor transaction timeout settings

---

## Performance Optimization

### For Large Files

Split CSV files larger than 10 MB:
```powershell
# Split file into 5MB chunks
Split-Path -Path large-file.csv -Size 5MB
```

### Connection Pooling

MongoDB connection pool is configured automatically:
```javascript
// src/config/db.js
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2
});
```

### Database Indices

Existing indices optimize queries:
```javascript
// Email lookups (created automatically)
db.users.createIndex({ email: 1 }, { unique: true })

// Import filtering
db.users.createIndex({ importedAt: 1 })
db.users.createIndex({ importedBy: 1 })
```

---

## Support & Maintenance

### Getting Help

1. Check this guide first
2. Review error messages carefully
3. Check application logs: `console.log` output
4. Review MongoDB logs
5. Test with the example commands provided

### Reporting Issues

Include:
- Application version
- MongoDB version
- Error message and stack trace
- Steps to reproduce
- Environment (development/production)

---

**End of Security & Production Implementation Guide**
