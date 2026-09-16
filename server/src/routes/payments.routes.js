import { Router } from 'express';

const router = Router();

// Create Razorpay order
router.post('/create-order', (req, res) => {
  res.json({ message: 'Payments scaffold: Create Razorpay order' });
});

// Verify payment signature
router.post('/verify-payment', (req, res) => {
  res.json({ message: 'Payments scaffold: Verify Razorpay payment signature' });
});

// Razorpay webhook endpoint
router.post('/webhook', (req, res) => {
  res.json({ message: 'Payments scaffold: Razorpay webhook listener' });
});

export default router;
