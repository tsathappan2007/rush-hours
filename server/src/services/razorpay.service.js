import crypto from 'crypto';
import Razorpay from 'razorpay';
import { config } from '../config/index.js';

let razorpayClient = null;

export function getRazorpayClient() {
  if (!razorpayClient) {
    const key_id = config.razorpay.keyId || process.env.RAZORPAY_KEY_ID;
    const key_secret = config.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;

    if (key_id && key_secret && !key_id.includes('your_key_id')) {
      razorpayClient = new Razorpay({ key_id, key_secret });
    }
  }
  return razorpayClient;
}

/**
 * Creates a Razorpay Order.
 * In test/mock mode (if keys are placeholders), generates a valid mock order object.
 *
 * @param {Object} params
 * @param {number} params.amountInPaise - Amount in Indian Paise (₹1 = 100 paise)
 * @param {string} [params.currency='INR']
 * @param {string} params.receipt - Internal order reference
 * @param {Object} [params.notes={}]
 * @returns {Promise<Object>}
 */
export async function createRazorpayOrder({ amountInPaise, currency = 'INR', receipt, notes = {} }) {
  const client = getRazorpayClient();

  if (client) {
    return await client.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes,
    });
  }

  // Test / Offline Mock Mode Fallback
  return {
    id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
    entity: 'order',
    amount: amountInPaise,
    amount_paid: 0,
    amount_due: amountInPaise,
    currency,
    receipt,
    status: 'created',
    notes,
    created_at: Math.floor(Date.now() / 1000),
    is_mock: true,
  };
}

/**
 * Cryptographically verifies Razorpay Webhook HMAC-SHA256 signature.
 *
 * @param {Buffer|string} rawBody - Raw body buffer of the incoming webhook request
 * @param {string} signature - Header 'x-razorpay-signature'
 * @param {string} [secret] - Webhook secret (defaults to config)
 * @returns {boolean}
 */
export function verifyWebhookSignature(rawBody, signature, secret) {
  const webhookSecret = secret || config.razorpay.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return false;
  }

  try {
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf-8');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const receivedBuffer = Buffer.from(signature, 'utf-8');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Triggers an automatic refund through the Razorpay Payments API.
 *
 * @param {string} paymentId - Razorpay Payment ID (e.g. 'pay_...')
 * @param {Object} options
 * @param {number} [options.amount] - Amount in paise (optional, defaults to full refund)
 * @param {Object} [options.notes] - Additional metadata for the refund
 * @returns {Promise<Object>}
 */
export async function refundPayment(paymentId, options = {}) {
  const client = getRazorpayClient();

  if (client) {
    try {
      return await client.payments.refund(paymentId, options);
    } catch (err) {
      console.error(`Razorpay API refund failed for ${paymentId}:`, err);
      throw err;
    }
  }

  // Mock refund response when operating in test/mock mode
  console.log(`[Razorpay Mock] Successfully simulated refund for payment ${paymentId}:`, options);
  return {
    id: `rfnd_mock_${crypto.randomBytes(8).toString('hex')}`,
    entity: 'refund',
    amount: options.amount || null,
    currency: 'INR',
    payment_id: paymentId,
    status: 'processed',
    speed_processed: 'instant',
    created_at: Math.floor(Date.now() / 1000),
    is_mock: true,
  };
}
