const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: [true, 'full_name is required'] // [cite: 18]
  },
  email: {
    type: String,
    required: true,
    unique: true, // [cite: 19]
    validate: [validator.isEmail, 'Invalid email format']
  },
  date_of_birth: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value < new Date(); // Must be in the past [cite: 20]
      },
      message: 'date_of_birth must be in the past'
    }
  },
  timezone: {
    type: String, // [cite: 8]
    required: false
  }
});

module.exports = mongoose.model('User', userSchema);