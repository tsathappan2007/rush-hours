import { Router } from 'express';

const router = Router();

// Get list of canteens on campus
router.get('/', (req, res) => {
  res.json({ message: 'Canteen scaffold: List campus canteens' });
});

// Get live menu for a specific canteen
router.get('/:canteenId/menu', (req, res) => {
  res.json({ message: `Canteen scaffold: Menu for canteen ${req.params.canteenId}` });
});

// Update stock status of an item (staff)
router.patch('/:canteenId/items/:itemId/stock', (req, res) => {
  res.json({
    message: `Canteen scaffold: Stock update for item ${req.params.itemId} in canteen ${req.params.canteenId}`
  });
});

export default router;
