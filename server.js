const app = require('./src/app');
const { connectDB } = require('./src/config/db');

connectDB()
  .then(() => {
    app.listen(3000, () => console.log('Server running on port 3000'));
  })
  .catch(err => console.error('Database connection error:', err.message || err));
