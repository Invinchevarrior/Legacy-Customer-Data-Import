const mongoose = require('mongoose');
const User = require('../src/models/user');

beforeAll(async () => {
  const uri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test_db';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterEach(async () => {
  await User.deleteMany();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('User model validation', () => {
  it('creates a valid user', async () => {
    const validUser = new User({
      full_name: 'John Doe',
      email: 'john@example.com',
      date_of_birth: '1990-01-01',
      timezone: 'UTC'
    });
    const savedUser = await validUser.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe('john@example.com');
  });

  it('rejects invalid email', async () => {
    const invalidUser = new User({
      full_name: 'Jane Doe',
      email: 'not-an-email',
      date_of_birth: '1990-01-01'
    });
    await expect(invalidUser.save()).rejects.toThrow();
  });
});
