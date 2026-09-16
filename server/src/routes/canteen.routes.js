import { Router } from 'express';
import {
  listCanteens,
  getCanteenMenu,
  toggleItemStock,
  toggleCanteenOrders,
} from '../controllers/canteen.controller.js';

const router = Router();

// Student & Staff: Browse all canteens
router.get('/', listCanteens);

// Student & Staff: Browse live menu, stock levels, and active slots for a canteen
router.get('/:canteenId/menu', getCanteenMenu);

// Canteen Staff: Toggle item in/out of stock
router.patch('/:canteenId/items/:itemId/toggle-stock', toggleItemStock);

// Canteen Staff: Pause or resume accepting new orders for the canteen
router.patch('/:canteenId/toggle-status', toggleCanteenOrders);

export default router;
