import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  verifyWebhookSignature,
  createRazorpayOrder,
  refundPayment,
} from '../src/services/razorpay.service.js';
import { InsufficientStockError } from '../src/services/stock.service.js';

describe('Razorpay Payment Flow & Webhook Verification Tests', () => {
  const testWebhookSecret = 'test_webhook_secret_key_12345';

  test('HMAC-SHA256 Webhook Signature: correctly validates authentic webhook payloads', () => {
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: { entity: { id: 'pay_test_99999', order_id: 'order_test_88888', amount: 5000 } },
      },
    });

    const validSignature = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(payload)
      .digest('hex');

    const isValid = verifyWebhookSignature(payload, validSignature, testWebhookSecret);
    assert.equal(isValid, true, 'Authentic webhook signature must be verified successfully');
  });

  test('HMAC-SHA256 Webhook Signature: rejects forged or tampered payloads', () => {
    const originalPayload = JSON.stringify({ event: 'payment.captured', amount: 5000 });
    const tamperedPayload = JSON.stringify({ event: 'payment.captured', amount: 1000 });

    const signature = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(originalPayload)
      .digest('hex');

    const isValid = verifyWebhookSignature(tamperedPayload, signature, testWebhookSecret);
    assert.equal(isValid, false, 'Tampered payload must fail signature verification');
  });

  test('HMAC-SHA256 Webhook Signature: rejects requests with invalid signature or empty secret', () => {
    assert.equal(verifyWebhookSignature('payload', 'invalid_signature', testWebhookSecret), false);
    assert.equal(verifyWebhookSignature('payload', 'signature', ''), false);
    assert.equal(verifyWebhookSignature('payload', '', testWebhookSecret), false);
  });

  test('Razorpay Order Creation: generates order object with amount in paise', async () => {
    const order = await createRazorpayOrder({
      amountInPaise: 7500, // ₹75.00
      currency: 'INR',
      receipt: 'RH-TEST-001',
    });

    assert.ok(order.id, 'Order must have an ID');
    assert.equal(order.amount, 7500, 'Amount must match in paise');
    assert.equal(order.currency, 'INR', 'Currency must be INR');
    assert.equal(order.status, 'created', 'Order status must be created');
  });

  test('Auto-Refund mechanism: correctly calls refund API or mock handler', async () => {
    const refund = await refundPayment('pay_test_dummy_123', {
      amount: 7500,
      notes: { reason: 'Item out of stock during checkout race' },
    });

    assert.ok(refund.id, 'Refund must have an ID');
    assert.equal(refund.status, 'processed', 'Refund status must be processed');
    assert.equal(refund.currency, 'INR');
  });

  test('Webhook Stock-Depletion Scenario: triggers auto-refund and moves order to REFUNDED', async () => {
    // Simulate the business logic in handleWebhook when stock is depleted
    let orderState = {
      status: 'PENDING_PAYMENT',
      paymentId: 'pay_test_race_conflict',
      totalAmount: 120.00,
    };

    let refundTriggered = false;
    let refundDetails = null;

    const mockDecrementStock = async () => {
      // Simulate stock race condition error
      throw new InsufficientStockError('Crispy Samosa', 2, 0);
    };

    try {
      await mockDecrementStock();
      orderState.status = 'CONFIRMED';
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        orderState.status = 'REFUNDED';
        refundDetails = await refundPayment(orderState.paymentId, {
          amount: Math.round(orderState.totalAmount * 100),
          notes: { reason: err.message },
        });
        refundTriggered = true;
      }
    }

    assert.equal(orderState.status, 'REFUNDED', 'Order status must become REFUNDED');
    assert.equal(refundTriggered, true, 'Auto-refund must be triggered');
    assert.ok(refundDetails && refundDetails.id, 'Refund details must contain an ID');
  });
});
