const mongoose = require('mongoose');

/**
 * Jest Setup File
 * Establishes a single MongoDB connection for all test files
 * This prevents connection conflicts and ensures proper test isolation
 */

beforeAll(async () => {
  // Connect to test database only once for all test suites
  if (mongoose.connection.readyState === 0) {
    const uri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test_db';
    await mongoose.connect(uri, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    // Wait a bit for connection to fully initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }
});

afterAll(async () => {
  // Close connection after all tests complete
  // This ensures cleanup and prevents resource leaks
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
