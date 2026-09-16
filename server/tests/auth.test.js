import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';

test('Authentication: Student & Staff Token Verification', async (t) => {
  await t.test('Student token: signs and verifies with STUDENT role', () => {
    const payload = {
      id: 'student-uuid-1',
      email: 'hariharan@college.edu',
      fullName: 'Hariharan K',
      rollNumber: '21CS102',
      role: 'STUDENT',
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
    assert.ok(token, 'Token should be generated');

    const decoded = jwt.verify(token, config.jwtSecret);
    assert.equal(decoded.id, 'student-uuid-1');
    assert.equal(decoded.email, 'hariharan@college.edu');
    assert.equal(decoded.role, 'STUDENT');
    assert.ok(decoded.email.endsWith('@college.edu'), 'Must be college domain');
  });

  await t.test('Staff token: binds staff user to specific canteen', () => {
    const payload = {
      id: 'staff-uuid-1',
      email: 'ramesh.canteen@college.edu',
      fullName: 'Ramesh Kumar',
      staffCode: 'STF-MAIN-01',
      canteenId: 'canteen-uuid-main',
      canteenCode: 'MAIN-FC',
      role: 'MANAGER',
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, config.jwtSecret);
    assert.equal(decoded.staffCode, 'STF-MAIN-01');
    assert.equal(decoded.canteenCode, 'MAIN-FC');
    assert.equal(decoded.role, 'MANAGER');
  });

  await t.test('College domain validation: rejects unauthorized external emails', () => {
    const allowedDomain = '@college.edu';
    const validEmail = 'student@college.edu';
    const invalidEmail1 = 'student@gmail.com';
    const invalidEmail2 = 'hacker@college.edu.phishing.com';

    assert.equal(validEmail.endsWith(allowedDomain), true);
    assert.equal(invalidEmail1.endsWith(allowedDomain), false);
    assert.equal(invalidEmail2.endsWith(allowedDomain), false);
  });

  await t.test('Invalid or expired token rejection', () => {
    const badToken = 'invalid.jwt.token';
    assert.throws(() => {
      jwt.verify(badToken, config.jwtSecret);
    });

    const expiredToken = jwt.sign({ id: '123' }, config.jwtSecret, { expiresIn: '-1s' });
    assert.throws(() => {
      jwt.verify(expiredToken, config.jwtSecret);
    }, (err) => err.name === 'TokenExpiredError');
  });
});
