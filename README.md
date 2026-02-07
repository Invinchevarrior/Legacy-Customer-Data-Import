# Legacy Customer Data Import

A backend service for importing customer records from CSV files into MongoDB, with built-in validation, error handling, and complete CRUD APIs.

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or remote)

### Installation

```powershell
# Install Node.js dependencies
npm install

# Verify MongoDB is running (default: localhost:27017)
mongod --dbpath C:\data\db
```

### Run the Application

```powershell
npm start
```

Server runs at `http://localhost:3000`

### Run Tests

```powershell
npm test
```

Ensure MongoDB is running before executing tests.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express.js |
| Database | MongoDB (Mongoose ORM) |
| CSV Processing | csv-parser (streaming) |
| Validation | validator library |
| File Upload | multer |
| Testing | Jest + supertest |

---

## API Documentation

### Base URL
```
http://localhost:3000/api/users
```

### 1. Upload & Import CSV

**POST** `/upload`

Upload a CSV file and import customer records with automatic validation.

**Request:**
```powershell
# PowerShell example
$filePath = "C:\path\to\customers.csv"
$form = @{ file = Get-Item -Path $filePath }
Invoke-WebRequest -Uri "http://localhost:3000/api/users/upload" `
  -Method Post `
  -Form $form
```

**CSV Format:**
```csv
full_name,email,date_of_birth,timezone
John Doe,john@example.com,1990-01-15,America/New_York
Jane Smith,jane@example.com,1985-03-22,Europe/London
```

**Response (200 OK) - All valid:**
```json
{
  "processed": 2,
  "success": 2,
  "rejected": 0,
  "rejected_details": []
}
```

**Response (200 OK) - With errors:**
```json
{
  "processed": 3,
  "success": 1,
  "rejected": 2,
  "rejected_details": [
    {
      "row": {
        "full_name": "Bob Johnson",
        "email": "invalid-email",
        "date_of_birth": "1992-06-10",
        "timezone": "UTC"
      },
      "errors": ["Invalid email format"]
    },
    {
      "row": {
        "full_name": "Alice Williams",
        "email": "alice@example.com",
        "date_of_birth": "2025-12-01",
        "timezone": "UTC"
      },
      "errors": ["date_of_birth must be in the past"]
    }
  ]
}
```

---

### 2. Get User by ID

**GET** `/:id`

Retrieve user details by MongoDB ObjectId.

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "full_name": "John Doe",
  "email": "john@example.com",
  "date_of_birth": "1990-01-15T00:00:00.000Z",
  "timezone": "America/New_York"
}
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/users/507f1f77bcf86cd799439011"
```

---

### 3. Update User

**PUT** `/:id`

Update user details. Only these fields can be updated: `full_name`, `email`, `date_of_birth`, `timezone`.

**Request:**
```powershell
$body = @{
    full_name = "John Doe Updated"
    timezone = "Europe/London"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/users/507f1f77bcf86cd799439011" `
  -Method Put `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body $body
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "full_name": "John Doe Updated",
  "email": "john@example.com",
  "date_of_birth": "1990-01-15T00:00:00.000Z",
  "timezone": "Europe/London"
}
```

---

### 4. Delete User

**DELETE** `/:id`

Remove a user record.

**Response (200 OK):**
```json
{
  "message": "User deleted successfully"
}
```

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/users/507f1f77bcf86cd799439011" -Method Delete
```

---

## Project Structure

```
src/
  app.js                 # Express app initialization
  server.js             # Server entry point and MongoDB connection
  config/
    db.js               # MongoDB connection setup
  controllers/
    userController.js   # CSV import handler and CRUD operations
  models/
    User.js             # Mongoose schema with validation rules
  routes/
    userRoutes.js       # API route definitions
  utils/
    csvWorker.js        # CSV streaming and processing logic
tests/
  user.test.js          # Unit tests for User model
  import.test.js        # Integration tests for CSV import
  extended.test.js      # Extended tests for edge cases
```

---

## Assumptions, Limitations & Design Decisions

### Validation Rules
- **full_name**: Required, non-empty string
- **email**: Required, must match RFC 5322 format, globally unique
- **date_of_birth**: Required, valid ISO 8601 string, must be in the past
- **timezone**: Optional; validated against IANA timezone database via `Intl.DateTimeFormat`

### CSV Processing Strategy
- **Streaming**: Processes row-by-row to support large files without memory overload
- **Error Isolation**: Invalid rows are rejected with specific messages; processing continues
- **Duplicate Detection**: Duplicate emails are caught at both schema validation and database constraint levels
- **Auto-Cleanup**: Uploaded files are automatically deleted after processing
- **Memory Limit**: Maximum 200 rejected details retained in report to prevent unbounded growth

### Update Operations
- **Whitelisted Fields Only**: Only `full_name`, `email`, `date_of_birth`, `timezone` can be updated
- **Injection Prevention**: Prevents accidental or malicious modification of unintended properties
- **Validation Enforcement**: All schema validators applied during updates

### Error Handling
- **Client-Safe Errors**: Generic error messages returned to API clients (implementation details not exposed)
- **Server-Side Logging**: Full error details logged for debugging
- **Database Error Mapping**: MongoDB error 11000 (duplicate) translated to user-friendly "Email already exists"

### Upload Security
- **Size Limit**: 5 MB maximum file size
- **Type Filtering**: CSV extensions and MIME types only
- **Temporary Storage**: Files stored in `uploads/` directory, cleaned up after processing

### Database Configuration
- **Default Connection**: `mongodb://localhost:27017/legacy_import`
- **Test Database**: `mongodb://localhost:27017/test_db`
- **Overridable**: Use `MONGO_URI` and `MONGO_URI_TEST` environment variables for custom URIs
- **Index Strategy**: Email uniqueness enforced at both schema and database index levels

### Limitations
- **No Rate Limiting**: Add authentication/rate limiting for production use
- **No Authentication**: Endpoints are unauthenticated; add security layer as needed
- **Event Loop Blocking**: Large CSV files may block event loop (consider worker threads for scaling)
- **Timezone Validation**: Depends on Node.js Intl support (varies across builds)
- **No Pagination**: User listing endpoints not implemented
- **UTF-8 Assumed**: No automatic CSV encoding detection
