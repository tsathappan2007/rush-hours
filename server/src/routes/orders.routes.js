import { Router } from 'express';
import {
  createOrder,
  getStudentOrders,
  getCanteenOrders,
  updateOrderStatus,
  cancelOrder,
  editOrderCustomizations,
  sweepForfeitedOrders,
} from '../controllers/order.controller.js';

const router = Router();

// Student: Place pre-order (atomic stock validation & item customizations)
router.post('/', createOrder);

// Student: View own orders
router.get('/my-orders', getStudentOrders);

// Student: Cancel order within 2-minute grace window while CONFIRMED (restores stock & initiates refund)
router.post('/:orderId/cancel', cancelOrder);

// Student: Edit customizations within 2-minute grace window while CONFIRMED
router.patch('/:orderId/customizations', editOrderCustomizations);

// Canteen Staff: View incoming and active orders for their canteen
router.get('/canteen/:canteenId', getCanteenOrders);

// Canteen Staff: Update order status (enforces state machine & 2-minute prep lockout)
router.patch('/:orderId/status', updateOrderStatus);

// Maintenance / Cron: Sweep uncollected orders past 20-minute deadline and mark FORFEITED
router.post('/sweep-forfeited', sweepForfeitedOrders);

export default router;
