import { Router } from 'express';
import {
  checkout,
  handleWebhook,
  cleanupExpiredOrders,
} from '../controllers/payment.controller.js';

const router = Router();

// Student: Checkout & initialize Razorpay payment order session
router.post('/checkout', checkout);
router.post('/create-order', checkout); // Compatibility alias

// Razorpay: Server-side webhook listener (cryptographic HMAC validation & order confirmation)
router.post('/webhook', handleWebhook);

// Maintenance / Cron: Sweep and refund unconfirmed expired orders
router.post('/cleanup-expired', cleanupExpiredOrders);

export default router;
