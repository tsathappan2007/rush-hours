import { Router } from 'express';
import {
  listCanteens,
  getCanteenMenu,
  toggleItemStock,
  toggleCanteenOrders,
  getSlotsDashboard,
} from '../controllers/canteen.controller.js';

const router = Router();

// Student & Staff: Browse all canteens
router.get('/', listCanteens);

// Student & Staff: Browse live menu, stock levels, and active slots with remaining capacity
router.get('/:canteenId/menu', getCanteenMenu);

// Canteen Staff: View live orders per upcoming slot and queue load dashboard
router.get('/:canteenId/slots-dashboard', getSlotsDashboard);
router.get('/:canteenId/slots', getSlotsDashboard); // Alias

// Canteen Staff: Toggle item in/out of stock
router.patch('/:canteenId/items/:itemId/toggle-stock', toggleItemStock);

// Canteen Staff: One-tap pause or resume accepting new orders for the canteen
router.patch('/:canteenId/toggle-status', toggleCanteenOrders);

export default router;
