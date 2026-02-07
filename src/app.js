const express = require('express');
const userRoutes = require('./routes/userRoutes');

/**
 * Express Application Setup
 * 
 * Configures Express middleware and route handlers:
 * - JSON body parser for API requests
 * - User management routers on /api/users mount point
 */
const app = express();

// Middleware: Parse incoming JSON request bodies
app.use(express.json());

// Routes: Mount user API routes at /api/users base path
// Includes CSV upload and CRUD operations
app.use('/api/users', userRoutes);

module.exports = app;
