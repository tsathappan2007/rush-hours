import { Router } from 'express';

const router = Router();

// Create new pre-order (student)
router.post('/', (req, res) => {
  res.json({ message: 'Orders scaffold: Create new pre-order' });
});

// Get student's order history or active orders
router.get('/my-orders', (req, res) => {
  res.json({ message: 'Orders scaffold: Student active and past orders' });
});

// Get incoming/active orders for a canteen (staff queue)
router.get('/canteen/:canteenId', (req, res) => {
  res.json({ message: `Orders scaffold: Live order queue for canteen ${req.params.canteenId}` });
});

// Update order status (PREPARING -> READY -> COMPLETED / CANCELLED)
router.patch('/:orderId/status', (req, res) => {
  res.json({ message: `Orders scaffold: Update status for order ${req.params.orderId}` });
});

export default router;
