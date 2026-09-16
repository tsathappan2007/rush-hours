import { Router } from 'express';
import {
  getOrderPickupDetails,
  verifyPickup,
} from '../controllers/pickup.controller.js';

const router = Router();

// Student: Fetch QR code image Data URL, 4-digit OTP, and expiry for an order
router.get('/:orderId', getOrderPickupDetails);
router.get('/:orderId/qr', getOrderPickupDetails); // Compatibility alias

// Canteen Staff: Scan QR or enter OTP to verify and mark collected (single-use enforced)
router.post('/verify', verifyPickup);

export default router;
