# Legacy Customer Data Import - Production Ready

A **production-ready** backend service for importing customer records from CSV files into MongoDB, with comprehensive security, authentication, rate limiting, transaction safety, and complete CRUD APIs.

> ⚠️ **IMPORTANT:** This version includes CRITICAL SECURITY IMPLEMENTATIONS. See [SECURITY_PRODUCTION.md](SECURITY_PRODUCTION.md) for complete security documentation.

## What's New - Security & Production Features

### 🔐 Authentication & Authorization
- JWT token-based authentication
- API key management with role-based access control
- Admin, User, and Viewer roles
- Audit logging for all operations

### 🛡️ Rate Limiting
- 100 API requests per 15 minutes per IP (prevents DoS)
- 5 authentication attempts per 15 minutes (prevents brute force)
- 10 CSV uploads per hour (prevents abuse)
- 50 CRUD operations per 15 minutes

### ✅ Request Validation & Sanitization
- Input validation using express-validator
- NoSQL injection prevention
- XSS attack prevention
- CSV formula injection prevention

### 📦 File Safety
- CSV bomb detection and prevention
- 50 MB file size limit
- 100,000 row limit
- 100 column limit per row
- Malicious file pattern detection

### 💾 Database Transaction Safety
- ACID-compliant bulk operations
- Automatic rollback on errors
- Consistent state guarantee
- All-or-nothing semantics

### 📍 API Versioning
- Versioned endpoints (`/api/v1/`)
- Clear migration path for future versions
- Backward compatibility support
- Deprecation planning

---

## Quick Start Guide

### Installation

```powershell
# 1. Install dependencies
npm install

# 2. Verify MongoDB is running
Get-Service -Name MongoDB

# 3. Start the server
npm start
```

Server runs at `http://localhost:3000`

### First-Time Authentication Setup

```powershell
# 1. Get a JWT token using default API key
$response = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"apiKey":"user-default-key-change-this"}'

# 2. Extract token
$token = ($response.Content | ConvertFrom-Json).token

# 3. Use token for API calls
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/users" `
  -Method Get `
  -Headers $headers
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express.js |
| Database | MongoDB (Mongoose ORM) with Transactions |
| CSV Processing | csv-parser (streaming) + validation |
| Authentication | JWT + API Keys |
| Validation | express-validator |
| Security | bcryptjs, rate-limiting |
| Testing | Jest + supertest |

---

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

**API v1 (`/api/v1/*`) endpoints require authentication** via JWT token (recommended).  
For backwards compatibility, the legacy endpoints mounted at `/api/users/*` are still present in code and **do not use the v1 auth middleware by default** (see “Legacy compatibility endpoints” below).

**Option 1: JWT Token**
```http
Authorization: Bearer <your-token>
```

**Option 2: API Key (Development/Admin)**
```http
X-API-Key: <your-api-key>
```

### Endpoints

#### Upload & Import CSV

```http
POST /api/v1/users/upload

Content-Type: multipart/form-data
Authorization: Bearer <token>

file: @customers.csv
```

**CSV Format:**
```csv
full_name,email,date_of_birth,timezone
John Doe,john@example.com,1990-01-15,America/New_York
Jane Smith,jane@example.com,1985-03-22,Europe/London
```

#### Get Users (Paginated)

```http
GET /api/v1/users?page=1&limit=10
Authorization: Bearer <token>
```

#### Get User by ID

```http
GET /api/v1/users/{userId}
Authorization: Bearer <token>
```

#### Update User

```http
PUT /api/v1/users/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Jane Doe",
  "timezone": "Europe/London"
}
```

#### Delete User (Admin Only)

```http
DELETE /api/v1/users/{userId}
Authorization: Bearer <admin-token>
```

#### Export Users as CSV (Admin Only)

```http
GET /api/v1/users/export/csv
Authorization: Bearer <admin-token>
```

#### Legacy compatibility endpoints (Unversioned)

The app currently also mounts **legacy routes** at:

```http
/api/users/*
```

Notes:
- These routes exist for compatibility with older clients/tests.
- They are **not protected by the v1 JWT middleware** in `src/app.js`.
- They also use a **smaller upload limit (5 MB)** than v1 (v1 supports up to 50 MB).
- For production deployments, you should disable these routes or add equivalent auth/limits.

---

## Testing

### Run Full Test Suite

```powershell
npm test
```

### Current Status
- ✅ 58/58 tests passing (100%)
- ✅ 5/5 test suites passing
- Test files:
  - `tests/user.test.js` (User model validation)
  - `tests/import.test.js` (legacy CSV import endpoint)
  - `tests/crud.test.js` (legacy CRUD endpoints)
  - `tests/extended.test.js` (edge cases & limits)
  - `tests/securityVersioning.test.js` (v1 vs legacy security/versioning coverage)

---

## Security Documentation

**For complete security implementation details, validation rules, and deployment checklist, see:**

### 📋 [SECURITY_PRODUCTION.md](SECURITY_PRODUCTION.md)

Topics covered:
- Authentication & Authorization implementation
- Rate limiting configuration
- Request validation & sanitization rules
- CSV file validation & bomb detection
- Database transaction safety
- API versioning strategy
- Setup & configuration guide
- Deployment checklist
- Troubleshooting guide

---

## Project Structure

```
├── server.js                           # Server entry point (connects DB, starts Express)
├── src/
│   ├── app.js                          # Express app setup (security headers, routing)
│   ├── config/
│   │   ├── db.js                       # Database configuration + transactions
│   │   └── auth.js                     # Authentication & role configuration
│   ├── middleware/
│   │   ├── auth.js                     # JWT authentication
│   │   ├── apiKeyAuth.js               # API key authentication
│   │   ├── rateLimiter.js              # Rate limiting
│   │   ├── validation.js               # Request validation
│   │   ├── csvFileValidator.js         # CSV file validation / bomb detection
│   │   └── errorHandler.js             # Centralized error handling
│   ├── routes/
│   │   ├── authRoutes.js               # Authentication endpoints (/auth/*)
│   │   ├── userRoutes.js               # Legacy user routes (/api/users/*)
│   │   └── v1/
│   │       └── userRoutes.js           # API v1 user routes (/api/v1/users/*)
│   ├── controllers/
│   │   ├── userController.js           # Legacy controller (used by legacy routes)
│   │   └── v1/
│   │       └── userController.js       # API v1 user controller
│   ├── models/
│   │   └── User.js                     # User schema + audit fields
│   └── utils/
│       ├── csvWorker.js                # CSV processing with transactions
│       └── security.js                 # Security utilities
├── tests/                              # Jest test suites
│   ├── user.test.js
│   ├── import.test.js
│   ├── crud.test.js
│   ├── extended.test.js
│   └── securityVersioning.test.js
├── jest.setup.js                       # Jest MongoDB connection setup
├── .env.example                        # Environment configuration template
├── package.json                        # Dependencies & scripts
└── README.md                           # This file
```

---

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
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
```

### Production Configuration

⚠️ **CRITICAL:** Change all default values for production deployment!

See [SECURITY_PRODUCTION.md](SECURITY_PRODUCTION.md) for complete production setup guide.

---

## Key Features

### CSV Processing
- **Streaming:** Row-by-row processing for large files (no memory overload)
- **Validation:** Comprehensive field validation
- **Error Handling:** Detailed error reporting with row-level details
- **Duplicate Detection:** Prevents duplicate emails

### Request Validation
- **Email:** RFC 5322 format validation
- **Date:** ISO 8601 format, must be in past
- **Timezone:** Validated against IANA database
- **Full Name:** 2-100 characters, safe characters only
- **Injection Prevention:** Blocks NoSQL and XSS attacks

### CSV Safety
- **Bomb Detection:** Identifies malicious CSV patterns
- **Size Limits:** 50 MB max file, 100K rows max
- **Column Limits:** Max 100 columns per row
- **Cell Limits:** 1 MB per cell, 10M total cells

### Audit Trail
- **Import Tracking:** Records who imported data and when
- **Modification History:** Tracks all updates with timestamps
- **Access Logging:** Audit log for authentication events
- **Delete Tracking:** Records deletion events with user info

---

## Error Handling

API returns structured error responses with helpful messages:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

## Rate Limiting

The API implements tiered rate limiting to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| CSV Upload | 10 uploads | 1 hour |
| CRUD Operations | 50 operations | 15 minutes |

Rate limit headers are included in responses:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1234567890
```

---

## Migration from Legacy API

The service now uses versioned endpoints for the secure API. **Legacy endpoints are still mounted for compatibility**, but the recommended integration path is to migrate to v1.

**Legacy (compatibility, unversioned):**
```http
POST /api/users/upload
GET /api/users/:id
PUT /api/users/:id
DELETE /api/users/:id
```

**v1 (recommended, protected):**
```http
POST /api/v1/users/upload          # Requires authentication
GET /api/v1/users/:id              # Requires authentication
PUT /api/v1/users/:id              # Requires authentication
DELETE /api/v1/users/:id           # Requires admin role + authentication
```

See [SECURITY_PRODUCTION.md](SECURITY_PRODUCTION.md) for detailed migration guide.

---

## Deployment

### Development
```powershell
npm start
```

### Production
```bash
npm ci --only=production
NODE_ENV=production npm start
```

See [SECURITY_PRODUCTION.md](SECURITY_PRODUCTION.md) for complete deployment checklist.

---

## Support & Issues

For detailed troubleshooting, security information, and implementation guides:

1. **Security & Production Guide:** See [SECURITY_PRODUCTION.md](SECURITY_PRODUCTION.md)
2. **API Documentation:** Review this README and security guide
3. **Test Suite:** Run `npm test` to verify functionality
4. **Logs:** Check server console output for detailed error messages

---

## License

See [LICENSE](LICENSE) file for details.

---

**Last Updated:** February 2026  
**Version:** 1.0.0 - Production Ready
