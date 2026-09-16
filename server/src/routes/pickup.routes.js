import { Router } from 'express';

const router = Router();

// Generate or fetch QR code / OTP for an order (student)
router.get('/:orderId/qr', (req, res) => {
  res.json({ message: `Pickup scaffold: Fetch QR/OTP for order ${req.params.orderId}` });
});

// Verify OTP or QR token (canteen staff at counter)
router.post('/verify', (req, res) => {
  res.json({ message: 'Pickup scaffold: Verify student QR / OTP token' });
});

export default router;
