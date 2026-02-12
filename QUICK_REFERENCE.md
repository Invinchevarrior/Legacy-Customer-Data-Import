# Quick Reference Guide - Legacy Customer Data Import API

## 🚀 Getting Started (5 Minutes)

### 1. Install & Run
```powershell
# Install dependencies
npm install

# Start server
npm start
# Server runs at http://localhost:3000
```

### 2. Get an Auth Token
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"apiKey":"user-default-key-change-this"}'

$token = ($response.Content | ConvertFrom-Json).token
```

### 3. Try an API Call
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-WebRequest -Uri "http://localhost:3000/api/v1/users" `
  -Method Get `
  -Headers $headers
```

---

## 📋 API Endpoints Reference

### Authentication

**Login**
```
POST /auth/login
Body: {"apiKey": "user-api-key"}
Returns: {"token": "...", "expiresIn": "24h", "user": {...}}
```

**Verify (current behavior)**
```
GET /auth/verify
Header: Authorization: Bearer <token>
Returns: {"valid": true, "message": "Token is valid"}  (Note: endpoint currently checks presence of a token and does not perform JWT verification itself)
```

### Users Resource

**List All Users**
```
GET /api/v1/users?page=1&limit=10
Header: Authorization: Bearer <token>
Returns: {data: [...], pagination: {...}}
```

**Get Single User**
```
GET /api/v1/users/:userId
Header: Authorization: Bearer <token>
Returns: User object
```

**Update User**
```
PUT /api/v1/users/:userId
Header: Authorization: Bearer <token>
Body: {"full_name": "Jane Doe", "timezone": "Europe/London"}
Returns: Updated user object
```

**Delete User** (Admin Only)
```
DELETE /api/v1/users/:userId
Header: Authorization: Bearer <admin-token>
Returns: {"message": "User deleted successfully", "id": "..."}
```

**Upload CSV**
```
POST /api/v1/users/upload
Header: Authorization: Bearer <token>
Body: multipart/form-data { file: <csv-file> }
Returns: {processed: N, success: X, rejected: Y, rejected_details: [...]}
```

**Export CSV** (Admin Only)
```
GET /api/v1/users/export/csv
Header: Authorization: Bearer <admin-token>
Returns: CSV file download
```

---

## 🧩 Legacy Compatibility Routes

The app currently also mounts legacy (unversioned) routes at:
```
/api/users/*
```

Notes:
- These routes exist for backwards compatibility with older clients/tests.
- They are **not the same** as the secure v1 routes under `/api/v1/users`.
- Upload limits differ: legacy upload uses **5 MB**, v1 upload uses **50 MB**.

---

## 🔑 Authentication Methods

### Method 1: JWT Token (Recommended)
```powershell
# Get token
$token = # (from login endpoint)

# Use in header
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-WebRequest -Uri "..." -Headers $headers
```

### Method 2: Direct API Key (Development Only)
```powershell
$headers = @{ "X-API-Key" = "user-default-key-change-this" }
Invoke-WebRequest -Uri "..." -Headers $headers
```

---

## 📊 User Roles & Permissions

| Role | List | Get | Create | Update | Delete | Export |
|------|------|-----|--------|--------|--------|--------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| User | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Viewer | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📁 CSV File Format

```csv
full_name,email,date_of_birth,timezone
John Doe,john@example.com,1990-01-15,America/New_York
Jane Smith,jane@example.com,1985-03-22,Europe/London
```

**Validation Rules:**
- `full_name`: 2-100 characters, letters/spaces/hyphens/apostrophes only
- `email`: Valid email format, globally unique
- `date_of_birth`: ISO 8601 format (YYYY-MM-DD), must be in past
- `timezone`: Valid IANA timezone identifier (optional)

---

## ⚡ Rate Limits

| Type | Limit | Window |
|------|-------|--------|
| General API | 100 | 15 min |
| Authentication | 5 | 15 min |
| File Upload | 10 | 1 hour |
| CRUD Ops | 50 | 15 min |

When rate limited, get HTTP 429 response with retry headers.

---

## 🛡️ Security Features

- ✅ JWT Authentication - All endpoints require valid token
- ✅ Rate Limiting - Prevents abuse and DoS attacks
- ✅ Input Validation - Prevents injection attacks
- ✅ CSV Validation - Detects and prevents CSV bombs
- ✅ Transactions - ACID-compliant database operations
- ✅ Audit Logging - Full audit trail of all operations
- ✅ Error Handling - Secure error messages

---

## 📊 CSV Upload Limits

- Maximum file size: **50 MB**
- Maximum rows: **100,000**
- Maximum columns: **100**
- Maximum cell size: **1 MB**
- Maximum total cells: **10 Million**

---

## ⚙️ Configuration

### Environment Variables
```env
# Database
MONGO_URI=mongodb://localhost:27017/legacy_import

# Authentication
JWT_SECRET=your-secret-key
ADMIN_API_KEY=admin-key
USER_API_KEY=user-key

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

See `.env.example` for full configuration options.

---

## 🧪 Testing

```powershell
# Run all tests
npm test

# Expected: 58 tests passing (5 suites)
```

---

## 🔍 Error Handling

### Common Errors

**401 Unauthorized**
```json
{"error": "Access token required"}
```
→ Missing or invalid Authorization header

**403 Forbidden**
```json
{"error": "Insufficient permissions for this operation"}
```
→ Your role doesn't allow this action (e.g., user trying to delete)

**429 Too Many Requests**
```json
{"error": "Too many requests from this IP. Please try again later"}
```
→ Rate limit exceeded, wait 15 minutes or 1 hour

**400 Bad Request**
```json
{"error": "Validation failed", "details": [...]}
```
→ Invalid input data, check details for specific field errors

**404 Not Found**
```json
{"error": "User not found"}
```
→ User ID doesn't exist

---

## 📝 Example: Complete Workflow

```powershell
# 1. Get authentication token
$login = @{
    Uri = "http://localhost:3000/auth/login"
    Method = "Post"
    ContentType = "application/json"
    Body = '{"apiKey":"user-default-key-change-this"}'
}
$tokenResponse = Invoke-WebRequest @login
$token = ($tokenResponse.Content | ConvertFrom-Json).token

# 2. Upload CSV file
$headers = @{ "Authorization" = "Bearer $token" }
$uploadForm = @{ file = Get-Item "C:\users.csv" }
$uploadResult = Invoke-WebRequest `
    -Uri "http://localhost:3000/api/v1/users/upload" `
    -Method Post `
    -Form $uploadForm `
    -Headers $headers

# 3. List imported users
$users = Invoke-WebRequest `
    -Uri "http://localhost:3000/api/v1/users" `
    -Method Get `
    -Headers $headers

# 4. Update a user
$updateBody = @{
    full_name = "Jane Doe Updated"
    timezone = "Europe/Paris"
} | ConvertTo-Json

$updateResult = Invoke-WebRequest `
    -Uri "http://localhost:3000/api/v1/users/<userId>" `
    -Method Put `
    -ContentType "application/json" `
    -Body $updateBody `
    -Headers $headers
```

---

## 🐛 Troubleshooting

**"Cannot connect to database"**
- Check MongoDB is running: `Get-Service -Name MongoDB`
- Verify connection string in .env

**"Token expired"**
- Get a new token from /auth/login
- Default expiration: 24 hours

**"File too large"**
- Maximum: 50 MB
- Split large files into multiple uploads

**"Rate limited"**
- Wait for window to reset (15 min or 1 hour)
- Use admin API key for higher limits

---

## 📚 Full Documentation

- **Complete Setup:** See `README.md`
- **Security Details:** See `SECURITY_PRODUCTION.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Configuration:** See `.env.example`

---

## 🚀 Production Deployment

Before deploying:

1. **Generate new keys:**
   ```bash
   openssl rand -base64 32  # JWT_SECRET
   openssl rand -hex 32     # API keys
   ```

2. **Update .env:**
   - Change JWT_SECRET
   - Change API_KEYs
   - Update MONGO_URI
   - Set NODE_ENV=production
   - Update CORS_ORIGIN

3. **Run tests:** `npm test`

4. **Deploy:** `npm start`

See `SECURITY_PRODUCTION.md` for complete deployment guide.

---

## 💡 Pro Tips

- Use API keys in development, JWT tokens for production
- Admin role needed for delete and export operations
- CSV files are processed row-by-row, so large files won't crash memory
- Transactions ensure all or nothing - no partial imports
- Check rate limit headers in responses: `RateLimit-Remaining`
- Enable audit logging in production for compliance

---

**Quick Links:**
- 📖 [README](README.md) - Full documentation
- 🔒 [SECURITY_PRODUCTION.md](SECURITY_PRODUCTION.md) - Security guide
- 📊 [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - What was built
- 🔧 [.env.example](.env.example) - Configuration template
