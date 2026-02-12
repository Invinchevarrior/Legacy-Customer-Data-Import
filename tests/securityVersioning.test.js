const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const app = require('../src/app');
const User = require('../src/models/user');
const { generateToken } = require('../src/middleware/auth');

const createTempCsv = (content, fileName = 'customers.csv') => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-security-'));
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
};

describe('Security and Versioning Coverage', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    adminToken = generateToken({
      id: 'test-admin',
      email: 'admin@test.local',
      role: 'admin'
    });
    userToken = generateToken({
      id: 'test-user',
      email: 'user@test.local',
      role: 'user'
    });
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('Authentication and Authorization', () => {
    test('legacy delete allows deletion without authentication (security gap)', async () => {
      const user = await User.create({
        full_name: 'Legacy Delete',
        email: 'legacy-delete@example.com',
        date_of_birth: '1990-01-01',
        timezone: 'UTC'
      });

      const res = await request(app).delete(`/api/users/${user._id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('User deleted successfully');
    });

    test('v1 delete requires authentication and admin role', async () => {
      const user = await User.create({
        full_name: 'Protected Delete',
        email: 'protected-delete@example.com',
        date_of_birth: '1990-01-01',
        timezone: 'UTC'
      });

      const unauthenticated = await request(app).delete(`/api/v1/users/${user._id}`);
      expect(unauthenticated.status).toBe(401);

      const forbidden = await request(app)
        .delete(`/api/v1/users/${user._id}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(forbidden.status).toBe(403);
    });

    test('v1 read endpoint is accessible with valid admin token', async () => {
      const allowed = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allowed.status).toBe(200);
      expect(allowed.body).toHaveProperty('data');
    });
  });

  describe('Rate Limiting', () => {
    test('auth endpoint enforces request limits', async () => {
      let lastResponse;
      for (let i = 0; i < 6; i++) {
        lastResponse = await request(app)
          .post('/auth/login')
          .send({ apiKey: 'invalid-api-key' });
      }

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.headers).toHaveProperty('ratelimit-remaining', '0');
    });
  });

  describe('Request Validation and Sanitization', () => {
    test('v1 update rejects NoSQL-style payloads', async () => {
      const user = await User.create({
        full_name: 'Safe User',
        email: 'safe-user@example.com',
        date_of_birth: '1990-01-01',
        timezone: 'UTC'
      });

      const res = await request(app)
        .put(`/api/v1/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: { $ne: null } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    test('legacy update accepts raw script payload in full_name (security gap)', async () => {
      const user = await User.create({
        full_name: 'Legacy User',
        email: 'legacy-xss@example.com',
        date_of_birth: '1990-01-01',
        timezone: 'UTC'
      });

      const payload = '<script>alert("xss")</script>';
      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .send({ full_name: payload });

      expect(res.status).toBe(200);
      expect(res.body.full_name).toBe(payload);
    });
  });

  describe('Input File Validation', () => {
    test('v1 upload rejects CSV bomb shape with excessive columns', async () => {
      const headerColumns = Array.from({ length: 101 }, (_, i) => `col_${i}`).join(',');
      const row = Array.from({ length: 101 }, () => 'value').join(',');
      const filePath = createTempCsv(`${headerColumns}\n${row}`, 'bomb.csv');

      const res = await request(app)
        .post('/api/v1/users/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', filePath);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('too many columns');
    });

    test('legacy upload accepts formula-like CSV field content (security gap)', async () => {
      const csvContent = [
        'full_name,email,date_of_birth,timezone',
        '=cmd|\' /C calc\'!A0,formula@example.com,1990-01-01,UTC'
      ].join('\n');
      const filePath = createTempCsv(csvContent, 'formula.csv');

      const res = await request(app)
        .post('/api/users/upload')
        .attach('file', filePath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(1);

      const inserted = await User.findOne({ email: 'formula@example.com' });
      expect(inserted).toBeTruthy();
      expect(inserted.full_name.startsWith('=')).toBe(true);
    });
  });

  describe('Database Transaction Safety', () => {
    test('legacy import commits partial data when one row fails (consistency gap)', async () => {
      const csvContent = [
        'full_name,email,date_of_birth,timezone',
        'First User,partial@example.com,1990-01-01,UTC',
        'Duplicate User,partial@example.com,1991-01-01,UTC'
      ].join('\n');
      const filePath = createTempCsv(csvContent, 'partial.csv');

      const res = await request(app)
        .post('/api/users/upload')
        .attach('file', filePath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(1);
      expect(res.body.rejected).toBe(1);

      const count = await User.countDocuments({ email: 'partial@example.com' });
      expect(count).toBe(1);
    });
  });

  describe('API Versioning and Migration', () => {
    test('API docs expose v1 endpoint but no explicit legacy deprecation metadata', async () => {
      const apiRes = await request(app).get('/api');
      expect(apiRes.status).toBe(200);
      expect(apiRes.body.endpoints).toHaveProperty('v1', '/api/v1/users');

      const legacyRes = await request(app).get('/api/users/not-a-valid-id');
      expect(legacyRes.headers.deprecation).toBeUndefined();
      expect(legacyRes.headers.sunset).toBeUndefined();
    });
  });
});
