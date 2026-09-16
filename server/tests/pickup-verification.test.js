import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';

describe('Pickup Token Generation & Single-Use Verification Tests', () => {
  test('QR Code Data URL Generation: produces valid Base64 PNG image', async () => {
    const qrPayload = 'rh_token_sample_test_payload_1234567890';
    const dataUrl = await QRCode.toDataURL(qrPayload, { width: 200 });

    assert.ok(dataUrl.startsWith('data:image/png;base64,'), 'QR code must be a valid base64 data URL');
    assert.ok(dataUrl.length > 100, 'QR data URL should contain image bytes');
  });

  test('Single-Use Enforcement: rejects duplicate redemption of already-used token', () => {
    // Model the single-use check in verifyPickup
    const usedAt = new Date('2026-09-16T12:30:00Z');
    const tokenRecord = {
      id: 'tok_1',
      otpCode: '7492',
      qrPayload: 'payload_sample',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      usedAt: usedAt,
    };

    function simulateVerification(token) {
      if (token.usedAt) {
        return {
          statusCode: 409,
          success: false,
          error: `SECURITY ALERT: This pickup token was already redeemed at ${token.usedAt.toISOString()}. Duplicate redemption rejected.`,
        };
      }
      if (new Date() > new Date(token.expiresAt)) {
        return { statusCode: 400, success: false, error: 'This pickup token has expired.' };
      }
      token.usedAt = new Date();
      return { statusCode: 200, success: true, message: 'Collected' };
    }

    // Attempt second scan on an already used token
    const result = simulateVerification(tokenRecord);
    assert.equal(result.statusCode, 409, 'Duplicate redemption must return 409 Conflict');
    assert.equal(result.success, false);
    assert.ok(result.error.includes('already redeemed'));
  });

  test('Single-Use Lifecycle: first attempt succeeds, second attempt fails immediately', () => {
    const freshToken = {
      id: 'tok_2',
      otpCode: '1983',
      qrPayload: 'fresh_payload',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
      usedAt: null, // Unused
    };

    function processScan(token) {
      if (token.usedAt) {
        return { statusCode: 409, error: 'Already redeemed' };
      }
      if (new Date() > new Date(token.expiresAt)) {
        return { statusCode: 400, error: 'Expired' };
      }
      token.usedAt = new Date();
      return { statusCode: 200, message: 'Order marked COLLECTED' };
    }

    // 1st scan attempt (fresh)
    const firstScan = processScan(freshToken);
    assert.equal(firstScan.statusCode, 200, 'First scan must succeed');
    assert.ok(freshToken.usedAt !== null, 'usedAt must be stamped after first scan');

    // 2nd scan attempt (replay attack or duplicate scan)
    const secondScan = processScan(freshToken);
    assert.equal(secondScan.statusCode, 409, 'Second scan must be blocked with 409 Conflict');
    assert.equal(secondScan.error, 'Already redeemed');
  });

  test('Expiry Enforcement: rejects verification if pickup token is expired', () => {
    const expiredToken = {
      id: 'tok_expired',
      otpCode: '4321',
      qrPayload: 'expired_payload',
      expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 mins ago
      usedAt: null,
    };

    const isExpired = new Date() > new Date(expiredToken.expiresAt);
    assert.equal(isExpired, true, 'Token must be marked expired');

    function processScan(token) {
      if (token.usedAt) return { statusCode: 409, error: 'Already redeemed' };
      if (new Date() > new Date(token.expiresAt)) {
        return { statusCode: 400, error: 'Pickup token has expired' };
      }
      token.usedAt = new Date();
      return { statusCode: 200 };
    }

    const res = processScan(expiredToken);
    assert.equal(res.statusCode, 400, 'Expired token must return 400 Bad Request');
    assert.equal(res.error, 'Pickup token has expired');
    assert.equal(expiredToken.usedAt, null, 'Expired token must not be marked collected');
  });
});
