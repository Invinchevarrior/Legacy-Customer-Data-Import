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

describe('Extended CSV and user tests', () => {
  test('rejects duplicate emails and reports Email already exists', async () => {
    const csvContent = [
      'full_name,email,date_of_birth,timezone',
      'Alice,a@example.com,1990-01-01,UTC',
      'Alice Duplicate,a@example.com,1985-05-05,UTC'
    ].join('\n');

    const filePath = createTempCsv(csvContent);

    const res = await request(app).post('/api/users/upload').attach('file', filePath);
    expect(res.status).toBe(200);
    expect(res.body.processed).toBe(2);
    expect(res.body.success).toBe(1);
    expect(res.body.rejected).toBe(1);
    const msgs = res.body.rejected_details.flatMap((d) => d.errors);
    expect(msgs).toContain('Email already exists');

    const users = await User.find();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('a@example.com');
  });

  test('caps rejected_details to configured maximum', async () => {
    const rows = [];
    rows.push('full_name,email,date_of_birth,timezone');
    const TOTAL = 300;
    for (let i = 0; i < TOTAL; i++) {
      rows.push(`Bad${i},not-an-email,1990-01-01,UTC`);
    }
    const csvContent = rows.join('\n');
    const filePath = createTempCsv(csvContent);

    const res = await request(app).post('/api/users/upload').attach('file', filePath);
    expect(res.status).toBe(200);
    expect(res.body.processed).toBe(TOTAL);
    expect(res.body.success).toBe(0);
    expect(res.body.rejected).toBe(TOTAL);
    // our implementation caps rejected_details to 200
    expect(res.body.rejected_details.length).toBeLessThanOrEqual(200);
  });

  test('updateUser only allows whitelisted fields and converts date_of_birth', async () => {
    const u = new User({ full_name: 'Before', email: 'up@example.com', date_of_birth: '1990-01-01' });
    const saved = await u.save();

    const res = await request(app)
      .put(`/api/users/${saved._id}`)
      .send({ full_name: 'After', isAdmin: true, date_of_birth: '1980-02-02' });

    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe('After');
    expect(res.body).not.toHaveProperty('isAdmin');
    // date_of_birth should be a valid ISO date string after update
    expect(new Date(res.body.date_of_birth).toISOString().startsWith('1980-02-02')).toBe(true);
  });

  test('non-csv upload is rejected by fileFilter', async () => {
    // create a .exe file and attempt to upload - should be rejected by fileFilter
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-import-'));
    const filePath = path.join(tmpDir, 'notcsv.exe');
    fs.writeFileSync(filePath, 'binary-data', 'utf8');

    const res = await request(app).post('/api/users/upload').attach('file', filePath);
    // Expect a client/server error (status >= 400)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
