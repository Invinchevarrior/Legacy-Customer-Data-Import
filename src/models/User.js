const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: [true, 'full_name is required']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: [validator.isEmail, 'Invalid email format']
  },
  date_of_birth: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value < new Date();
      },
      message: 'date_of_birth must be in the past'
    }
  },
  timezone: {
    type: String,
    required: false
  }
});

module.exports = mongoose.model('User', userSchema);
