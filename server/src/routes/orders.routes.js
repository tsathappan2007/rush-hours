import { Router } from 'express';
import {
  createOrder,
  getStudentOrders,
  getCanteenOrders,
  updateOrderStatus,
} from '../controllers/order.controller.js';

const router = Router();

// Student: Place pre-order (atomic stock validation)
router.post('/', createOrder);

// Student: View own orders
router.get('/my-orders', getStudentOrders);

// Canteen Staff: View incoming and active orders for their canteen
router.get('/canteen/:canteenId', getCanteenOrders);

// Canteen Staff: Update order status (strictly enforces PAID -> CONFIRMED -> PREPARING -> READY -> COLLECTED)
router.patch('/:orderId/status', updateOrderStatus);

export default router;
