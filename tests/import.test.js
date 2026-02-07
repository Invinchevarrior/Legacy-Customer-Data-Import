const fs = require('fs');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const User = require('../src/models/user');

const createTempCsv = (content) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-import-'));
  const filePath = path.join(tmpDir, 'customers.csv');
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
};

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

describe('CSV import endpoint', () => {
  test('imports valid users and rejects invalid rows with detailed errors', async () => {
    const csvContent = [
      'full_name,email,date_of_birth,timezone',
      'John Doe,john@example.com,1990-01-15,America/New_York', // valid
      'Bad Email,bad-email,1980-05-10,Europe/London', // invalid email
      'Future Person,future@example.com,2999-01-01,Invalid/Timezone' // future dob + invalid timezone
    ].join('\n');

    const filePath = createTempCsv(csvContent);

    const res = await request(app)
      .post('/api/users/upload')
      .attach('file', filePath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('processed', 3);
    expect(res.body).toHaveProperty('success', 1);
    expect(res.body).toHaveProperty('rejected', 2);
    expect(Array.isArray(res.body.rejected_details)).toBe(true);
    expect(res.body.rejected_details.length).toBe(2);

    const errorMessages = res.body.rejected_details.flatMap((item) => item.errors);
    expect(errorMessages).toEqual(
      expect.arrayContaining([
        'Invalid email format',
        'date_of_birth must be in the past',
        'Invalid timezone identifier'
      ])
    );

    const usersInDb = await User.find();
    expect(usersInDb).toHaveLength(1);
    expect(usersInDb[0].email).toBe('john@example.com');
  });

  test('returns 400 when no file is uploaded', async () => {
    const res = await request(app).post('/api/users/upload');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'No CSV file uploaded');
  });
});

