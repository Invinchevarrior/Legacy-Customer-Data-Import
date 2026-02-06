# Legacy Customer Data Import

This project provides a backend service to migrate customer records from legacy CSV files into a MongoDB database. It includes a robust import feature with validation and error reporting, as well as complete CRUD endpoints for user management.

##  Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites & Installation](#prerequisites--installation)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Assumptions & Design Decisions](#assumptions--design-decisions)

---

## Overview

The system processes CSV files containing customer records with the following fields:
- full_name: Required, must not be empty
- email: Required, must be valid email format and unique
- date_of_birth: Required, must be a valid ISO 8601 date in the past
- timezone: Optional; when provided, must be a valid IANA timezone identifier (e.g., `Europe/London`)

The import endpoint validates each record and returns a detailed report including:
- Number of records processed
- Number successfully imported
- Number rejected
- Details of each rejected record with specific error messages

---

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB (mongoose ORM)
- **CSV Processing**: csv-parser
- **Validation**: validator library
- **File Upload**: multer
- **Testing**: Jest with supertest
- **Environment**: Node.js v18+ recommended

---

## Prerequisites & Installation

### Step 1: Install Node.js
Download and install from [nodejs.org](https://nodejs.org/). Verify installation:
\\\powershell
node --version
npm --version
\\\

### Step 2: Install MongoDB
MongoDB is required for the application to run.

#### Option A: Windows Installer (Recommended)
1. Download MongoDB Community Server from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run the MSI installer and follow the setup wizard
3. During installation, select "Install MongoDB as a Service" (or configure manually later)
4. Verify installation:
\\\powershell
mongod --version
\\\

#### Option B: Using Chocolatey
If Chocolatey is installed, run (as Administrator):
\\\powershell
choco install mongodb -y
\\\

#### Option C: Add MongoDB to PATH (if already installed but not in PATH)
If MongoDB is installed but \mongod\ command is not found:

1. Locate MongoDB bin folder (typically \C:\\Program Files\\MongoDB\\Server\\<version>\\bin\)
2. Add to system PATH (Administrator PowerShell)
3. Restart PowerShell or your terminal

### Step 3: Verify MongoDB
Create data directory and test MongoDB:
\\\powershell
New-Item -ItemType Directory -Path C:\\data\\db -Force
mongod --dbpath C:\\data\\db
\\\
You should see logs indicating MongoDB is listening on port 27017.

### Step 4: Clone Repository and Install Dependencies
\\\powershell
cd E:\\github repos\\Legacy-Customer-Data-Import
npm install
\\\

---

## Running the Application

### Start MongoDB (if not running as a service)
Open a terminal and run:
\\\powershell
mongod --dbpath C:\\data\\db
\\\
Leave this terminal open. MongoDB will listen on \mongodb://localhost:27017\

### Start the Server
In another terminal:
\\\powershell
npm start
\\\
Expected output:
\\\
> legacy-customer-import@1.0.0 start
> node server.js

Server running on port 3000
\\\

The server is now running at \http://localhost:3000\

---

## Running Tests

Ensure MongoDB is running (see above), then run:
\\\powershell
npm test
\\\

Test output example:
\\\
PASS  tests/user.test.js
  User model validation
     creates a valid user (45ms)
     rejects invalid email (32ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
\\\

### Environment Variables
Tests use the \MONGO_URI_TEST\ environment variable (default: \mongodb://localhost:27017/test_db\):
\\\powershell
 = "mongodb://your-uri/test_db"; npm test
\\\

---

## API Documentation

### Base URL
\http://localhost:3000/api/users\

---

### 1. Upload & Import CSV
**Endpoint**: \POST /api/users/upload\

**Description**: Upload a CSV file and import customer records with validation.

**Request Headers**:
- \Content-Type: multipart/form-data\

**Request Body**:
- \ile\ (form field): CSV file with columns \ull_name, email, date_of_birth, timezone\

**CSV Format Example**:
\\\csv
full_name,email,date_of_birth,timezone
John Doe,john@example.com,1990-01-15,America/New_York
Jane Smith,jane@example.com,1985-03-22,Europe/London
Bob Johnson,invalid-email,1992-06-10,Asia/Tokyo
Alice Williams,alice@example.com,2025-12-01,UTC
\\\

**Response** (HTTP 200):
\\\json
{
  "processed": 4,
  "success": 2,
  "rejected": 2,
  "rejected_details": [
    {
      "row": {
        "full_name": "Bob Johnson",
        "email": "invalid-email",
        "date_of_birth": "1992-06-10",
        "timezone": "Asia/Tokyo"
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
      "errors": ["Invalid or future date_of_birth"]
    }
  ]
}
\\\

**cURL Example**:
\\\ash
curl -X POST http://localhost:3000/api/users/upload \
  -F "file=@customers.csv"
\\\

**PowerShell Example**:
\\\powershell
\ = "C:\\path\\to\\customers.csv"
\ = @{
    file = Get-Item -Path \
}
Invoke-WebRequest -Uri "http://localhost:3000/api/users/upload" \
  -Method Post \
  -Form \
\\\

---

### 2. Get User by ID
**Endpoint**: \GET /api/users/:id\

**Description**: Retrieve a user's details by MongoDB ObjectId.

**Request Parameters**:
- \id\ (URL parameter): MongoDB ObjectId (e.g., \507f1f77bcf86cd799439011\)

**Response** (HTTP 200):
\\\json
{
  "_id": "507f1f77bcf86cd799439011",
  "full_name": "John Doe",
  "email": "john@example.com",
  "date_of_birth": "1990-01-15T00:00:00.000Z",
  "timezone": "America/New_York",
  "__v": 0
}
\\\

**Error Response** (HTTP 404):
\\\json
{
  "error": "User not found"
}
\\\

**cURL Example**:
\\\ash
curl http://localhost:3000/api/users/507f1f77bcf86cd799439011
\\\

---

### 3. Update User
**Endpoint**: \PUT /api/users/:id\

**Description**: Update user details.

**Request Headers**:
- \Content-Type: application/json\

**Request Body** (all fields optional):
\\\json
{
  "full_name": "John Doe Updated",
  "email": "john.updated@example.com",
  "date_of_birth": "1990-01-15",
  "timezone": "Europe/London"
}
\\\

**Response** (HTTP 200):
\\\json
{
  "_id": "507f1f77bcf86cd799439011",
  "full_name": "John Doe Updated",
  "email": "john.updated@example.com",
  "date_of_birth": "1990-01-15T00:00:00.000Z",
  "timezone": "Europe/London",
  "__v": 1
}
\\\

**cURL Example**:
\\\ash
curl -X PUT http://localhost:3000/api/users/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"full_name":"John Updated","timezone":"Europe/London"}'
\\\

---

### 4. Delete User
**Endpoint**: \DELETE /api/users/:id\

**Description**: Delete a user by ID.

**Request Parameters**:
- \id\ (URL parameter): MongoDB ObjectId

**Response** (HTTP 200):
\\\json
{
  "message": "User deleted successfully"
}
\\\

**Error Response** (HTTP 404):
\\\json
{
  "error": "User not found"
}
\\\

**cURL Example**:
\\\ash
curl -X DELETE http://localhost:3000/api/users/507f1f77bcf86cd799439011
\\\

---

## Project Structure

\\\
Legacy-Customer-Data-Import/
 server.js                          # Entry point, MongoDB connection
 package.json                       # Dependencies and scripts
 README.md                          # This file
 src/
    app.js                        # Express app setup
    config/
       db.js                     # MongoDB connection config
    controllers/
       userController.js         # CSV import & CRUD handlers
    models/
       User.js                   # Mongoose User schema with validation
    routes/
       userRoutes.js             # API route definitions
    utils/
        csvWorker.js              # CSV parsing & validation logic
 tests/
    user.test.js                  # Jest unit tests
 uploads/                          # Temp directory for uploaded CSV files
\\\

---

## Assumptions & Design Decisions

### Validation Rules
- **full_name**: Required, non-empty string
- **email**: Required, must match valid email format (RFC 5322), must be unique in database
- **date_of_birth**: Required, must be valid ISO 8601 date string, must be in the past
- **timezone**: Optional; if present, must be a valid IANA timezone identifier (validated using `Intl.DateTimeFormat`)

### Error Handling
- Invalid CSV rows are not inserted; detailed errors are reported in \
ejected_details\
- Duplicate email violations (MongoDB error code 11000) are caught and reported as "Email already exists"
- File upload errors are returned with HTTP 400
- Database errors are returned with HTTP 500

### CSV Processing
- CSV headers must match exactly: `full_name, email, date_of_birth, timezone`
- Extra or missing columns may cause parsing issues (CSV parser will include/exclude accordingly)
- Uploaded files are automatically deleted after processing
- CSV rows are processed in a streaming, row-by-row fashion to support large files without loading them fully into memory

### Database
- MongoDB connection defaults to \mongodb://localhost:27017/legacy_import\
- Test database defaults to \mongodb://localhost:27017/test_db\
- Both can be overridden via \MONGO_URI\ and \MONGO_URI_TEST\ environment variables
- Email field has unique constraint (enforced at DB level with index)

### Testing
- Tests use an in-memory or test-specific MongoDB database
- Each test clears user data after execution to ensure isolation
- Model validation is tested indirectly through Jest expectations

### Limitations & Future Improvements
- No pagination for large user lists (GET endpoint not implemented)
- CSV processing is synchronous; large files may block the event loop
- No rate limiting or authentication
- Timezone field is not validated against IANA timezone database
- No support for CSV encoding detection (assumes UTF-8)
- Error messages could be more granular per field

---

## Troubleshooting

### MongoDB Connection Error
**Error**: \Database connection error: connect ECONNREFUSED 127.0.0.1:27017\
- Ensure MongoDB is running: \mongod --dbpath C:\\data\\db\
- Check MongoDB is listening on port 27017
- Verify \MONGO_URI\ environment variable if using custom connection string

### Port Already in Use
**Error**: \EADDRINUSE @@@ (bind) error: 10013\
- Find and kill process on port 3000:
\\\powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
\\\

### \mongod\ Command Not Found
- Verify MongoDB installation: \where.exe mongod\
- If not found, install MongoDB or add to PATH (see Installation section)

---

## License

See LICENSE file for details.
