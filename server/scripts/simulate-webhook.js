/**
 * Helper script to simulate an incoming Razorpay Webhook locally with authentic HMAC-SHA256 signature.
 *
 * Usage:
 *   node scripts/simulate-webhook.js [order_id] [payment_id] [event]
 *
 * Example:
 *   node scripts/simulate-webhook.js order_sample_rzp_12345 pay_sample_123 payment.captured
 */

import crypto from 'crypto';
import http from 'http';
import '../src/config/index.js';

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_razorpay_webhook_secret';
const razorpayOrderId = process.argv[2] || 'order_sample_rzp_12345';
const razorpayPaymentId = process.argv[3] || `pay_sim_${Date.now()}`;
const event = process.argv[4] || 'payment.captured';

const payload = JSON.stringify({
  entity: 'event',
  account_id: 'acc_campus_canteen',
  event: event,
  contains: ['payment', 'order'],
  payload: {
    payment: {
      entity: {
        id: razorpayPaymentId,
        entity: 'payment',
        amount: 10000, // ₹100.00 in paise
        currency: 'INR',
        status: 'captured',
        order_id: razorpayOrderId,
        method: 'upi',
        captured: true,
      },
    },
    order: {
      entity: {
        id: razorpayOrderId,
        entity: 'order',
        amount: 10000,
        status: 'paid',
      },
    },
  },
  created_at: Math.floor(Date.now() / 1000),
});

// Calculate valid HMAC-SHA256 signature
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

console.log(`📡 Simulating Razorpay Webhook [${event}] for Order: ${razorpayOrderId}...`);
console.log(`🔐 Generated Signature: ${signature}`);

const req = http.request(
  {
    hostname: 'localhost',
    port: process.env.PORT || 5000,
    path: '/api/payments/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-razorpay-signature': signature,
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log(`\n📬 Response [Status: ${res.statusCode}]:`);
      try {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
      } catch {
        console.log(data);
      }
    });
  }
);

req.on('error', (err) => {
  console.error('❌ Connection error. Is the server running on http://localhost:5000?', err.message);
});

req.write(payload);
req.end();
