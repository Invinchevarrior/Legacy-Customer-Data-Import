const app = require('./src/app');
const mongoose = require('mongoose');

// Connect to MongoDB [cite: 12]
mongoose.connect('mongodb://localhost:27017/legacy_import', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  app.listen(3000, () => console.log('Server running on port 3000'));
})
.catch(err => console.error('Database connection error:', err));