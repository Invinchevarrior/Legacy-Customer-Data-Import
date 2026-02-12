const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { generateToken } = require('./src/middleware/auth');
const { DEFAULT_ADMIN_API_KEY, DEFAULT_USER_API_KEY } = require('./src/config/auth');

/**
 * Server Initialization
 * 
 * Connects to MongoDB and starts Express server
 * Includes authentication setup guide
 */

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    
    app.listen(PORT, () => {
      console.log('\n========================================');
      console.log('Server running on port', PORT);
      console.log('========================================\n');
      
      // Authentication setup information (kept in sync with README)
      console.log('🔐 AUTHENTICATION SETUP GUIDE\n');
      
      console.log('1. Get JWT token via /auth/login (Admin API key):');
      console.log(`   curl -X POST http://localhost:${PORT}/auth/login \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"apiKey":"${DEFAULT_ADMIN_API_KEY}"}'`);
      
      console.log('\n2. (Optional) Get JWT token with User API key:');
      console.log(`   curl -X POST http://localhost:${PORT}/auth/login \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d '{"apiKey":"${DEFAULT_USER_API_KEY}"}'`);
      
      console.log('\n3. Call secure v1 endpoints with JWT (recommended):');
      console.log(`   curl -H "Authorization: Bearer <your-token>" \\`);
      console.log(`     http://localhost:${PORT}/api/v1/users`);
      
      console.log('\n4. Or call v1 with API key header (development only):');
      console.log(`   curl -H "X-API-Key: ${DEFAULT_ADMIN_API_KEY}" \\`);
      console.log(`     http://localhost:${PORT}/api/v1/users`);
      
      console.log('\n5. Legacy compatibility endpoints (unauthenticated, not for production):');
      console.log(`   curl http://localhost:${PORT}/api/users`);
      
      console.log('\n⚠️  IMPORTANT: Change default keys and secrets in production!');
      console.log('   Set environment variables (see .env.example / SECURITY_PRODUCTION.md):');
      console.log('   - ADMIN_API_KEY');
      console.log('   - USER_API_KEY');
      console.log('   - JWT_SECRET');
      console.log('\n========================================\n');
    });
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message || err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
