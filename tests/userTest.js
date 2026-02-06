const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test_db');
});

afterEach(async () => {
  await User.deleteMany();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('User Management API', () => {
  it('should create a valid user via generic flow', async () => {
    // This tests the model validation logic indirectly
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

  it('should fail if email is invalid', async () => {
    const invalidUser = new User({
      full_name: 'Jane Doe',
      email: 'not-an-email', // [cite: 19]
      date_of_birth: '1990-01-01'
    });
    await expect(invalidUser.save()).rejects.toThrow();
  });
});