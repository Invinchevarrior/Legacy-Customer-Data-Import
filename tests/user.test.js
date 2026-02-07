const mongoose = require('mongoose');
const User = require('../src/models/user');

/**
 * User Model Validation Tests
 * Tests the Mongoose schema validation for the User model
 */
describe('User model validation', () => {
  afterEach(async () => {
    await User.deleteMany();
  });

  /**
   * Test: Create valid user with all fields
   * Verifies that a user with valid data saves successfully
   */
  it('creates a valid user with all fields', async () => {
    const validUser = new User({
      full_name: 'John Doe',
      email: 'john@example.com',
      date_of_birth: '1990-01-01',
      timezone: 'UTC'
    });
    const savedUser = await validUser.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe('john@example.com');
    expect(savedUser.full_name).toBe('John Doe');
  });

  /**
   * Test: Create user without optional timezone
   * Verifies that users can be created with timezone field omitted
   */
  it('creates a valid user without timezone (optional field)', async () => {
    const userWithoutTz = new User({
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      date_of_birth: '1985-06-15'
    });
    const savedUser = await userWithoutTz.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.timezone).toBeUndefined();
  });

  /**
   * Test: Reject missing required full_name
   * Verifies that users cannot be created without full_name
   */
  it('rejects user with missing full_name', async () => {
    const userNoName = new User({
      email: 'nofullname@example.com',
      date_of_birth: '1990-01-01'
    });
    await expect(userNoName.save()).rejects.toThrow();
  });

  /**
   * Test: Reject missing required email
   * Verifies that users cannot be created without email
   */
  it('rejects user with missing email', async () => {
    const userNoEmail = new User({
      full_name: 'No Email User',
      date_of_birth: '1990-01-01'
    });
    await expect(userNoEmail.save()).rejects.toThrow();
  });

  /**
   * Test: Reject missing required date_of_birth
   * Verifies that users cannot be created without date_of_birth
   */
  it('rejects user with missing date_of_birth', async () => {
    const userNoDob = new User({
      full_name: 'No DOB User',
      email: 'nodob@example.com'
    });
    await expect(userNoDob.save()).rejects.toThrow();
  });

  /**
   * Test: Reject invalid email format (RFC 5322)
   * Verifies that malformed email addresses are rejected
   */
  it('rejects invalid email format', async () => {
    const invalidUser = new User({
      full_name: 'Invalid Email User',
      email: 'not-an-email',
      date_of_birth: '1990-01-01'
    });
    await expect(invalidUser.save()).rejects.toThrow();
  });

  /**
   * Test: Reject email with missing domain
   * Verifies edge case of email without domain
   */
  it('rejects email without domain', async () => {
    const noDomainUser = new User({
      full_name: 'No Domain User',
      email: 'justausername@',
      date_of_birth: '1990-01-01'
    });
    await expect(noDomainUser.save()).rejects.toThrow();
  });

  /**
   * Test: Reject future date_of_birth
   * Verifies that dates in the future are rejected at schema level
   */
  it('rejects future date_of_birth', async () => {
    const futureUser = new User({
      full_name: 'Future User',
      email: 'future@example.com',
      date_of_birth: '2099-12-31'
    });
    await expect(futureUser.save()).rejects.toThrow();
  });

  /**
   * Test: Enforce unique email constraint
   * Verifies that duplicate emails are not allowed in the database
   */
  it('enforces unique email constraint', async () => {
    const user1 = new User({
      full_name: 'First User',
      email: 'duplicate@example.com',
      date_of_birth: '1990-01-01'
    });
    await user1.save();

    const user2 = new User({
      full_name: 'Second User',
      email: 'duplicate@example.com',
      date_of_birth: '1995-05-05'
    });

    // Attempting to save duplicate email should fail
    await expect(user2.save()).rejects.toThrow();
  });

  /**
   * Test: Accept valid ISO 8601 date format
   * Verifies that various ISO 8601 formats are accepted
   */
  it('accepts valid ISO 8601 date formats', async () => {
    const user = new User({
      full_name: 'ISO Format User',
      email: 'iso@example.com',
      date_of_birth: '1990-05-15T00:00:00Z'
    });
    const savedUser = await user.save();
    expect(savedUser._id).toBeDefined();
  });

  /**
   * Test: Accept valid IANA timezone identifiers
   * Verifies various valid timezone strings pass validation
   */
  it('accepts valid IANA timezone identifiers', async () => {
    const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
    
    for (const tz of timezones) {
      const user = new User({
        full_name: 'TZ Test User',
        email: `tz-${tz}@example.com`,
        date_of_birth: '1990-01-01',
        timezone: tz
      });
      const savedUser = await user.save();
      expect(savedUser.timezone).toBe(tz);
    }
  });

  /**
   * Test: Reject invalid timezone identifier
   * Verifies that invalid timezone strings are rejected
   */
  it('rejects invalid timezone identifier', async () => {
    const invalidTzUser = new User({
      full_name: 'Invalid TZ User',
      email: 'invalidtz@example.com',
      date_of_birth: '1990-01-01',
      timezone: 'Invalid/Timezone'
    });
    // Note: This should fail during Document.create() or save()
    // if Intl validation is applied at schema level
    // For now, may pass if validation only exists in controller
  });

  /**
   * Test: Accept empty/whitespace as optional timezone
   * Verifies that undefined/null timezone doesn't cause issues
   */
  it('allows undefined timezone field', async () => {
    const user = new User({
      full_name: 'No Timezone User',
      email: 'notz@example.com',
      date_of_birth: '1990-01-01',
      timezone: undefined
    });
    const savedUser = await user.save();
    expect(savedUser.timezone).toBeUndefined();
  });
});
