import { prisma } from '../db/prisma.js';

/**
 * List all canteens on campus.
 * GET /api/canteens
 */
export async function listCanteens(req, res) {
  try {
    const canteens = await prisma.canteen.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        location: true,
        openingTime: true,
        closingTime: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            menuItems: { where: { isAvailable: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: canteens,
    });
  } catch (error) {
    console.error('Error listing canteens:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve canteens' });
  }
}

/**
 * Get live menu, available time slots, and current stock status for a canteen.
 * GET /api/canteens/:canteenId/menu
 */
export async function getCanteenMenu(req, res) {
  try {
    const { canteenId } = req.params;

    const canteen = await prisma.canteen.findUnique({
      where: { id: canteenId },
      include: {
        menuItems: {
          include: {
            stock: {
              select: {
                quantity: true,
                dailyTotal: true,
                lastRestockedAt: true,
              },
            },
          },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
        timeSlots: {
          where: {
            isActive: true,
          },
          orderBy: [{ slotDate: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!canteen) {
      return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    // Format menu items into categorized groups
    const menuByCategory = canteen.menuItems.reduce((acc, item) => {
      const cat = item.category || 'General';
      if (!acc[cat]) acc[cat] = [];

      acc[cat].push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        category: item.category,
        imageUrl: item.imageUrl,
        stockMode: item.stockMode,
        isAvailable: item.isAvailable,
        stockQuantity: item.stock ? item.stock.quantity : null,
      });

      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        canteen: {
          id: canteen.id,
          name: canteen.name,
          code: canteen.code,
          description: canteen.description,
          location: canteen.location,
          openingTime: canteen.openingTime,
          closingTime: canteen.closingTime,
          isActive: canteen.isActive,
        },
        timeSlots: canteen.timeSlots.map((slot) => ({
          id: slot.id,
          slotDate: slot.slotDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxOrders: slot.maxOrders,
          currentOrders: slot.currentOrders,
          availableSlots: Math.max(0, slot.maxOrders - slot.currentOrders),
          isFull: slot.currentOrders >= slot.maxOrders,
        })),
        menuByCategory,
      },
    });
  } catch (error) {
    console.error('Error fetching canteen menu:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve canteen menu' });
  }
}

/**
 * Toggle an item in/out of stock.
 * PATCH /api/canteens/:canteenId/items/:itemId/toggle-stock
 */
export async function toggleItemStock(req, res) {
  try {
    const { canteenId, itemId } = req.params;
    const { isAvailable } = req.body;

    const item = await prisma.menuItem.findFirst({
      where: { id: itemId, canteenId },
    });

    if (!item) {
      return res.status(404).json({ success: false, error: 'Menu item not found in this canteen' });
    }

    const nextAvailability = typeof isAvailable === 'boolean' ? isAvailable : !item.isAvailable;

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: nextAvailability },
      include: { stock: true },
    });

    res.json({
      success: true,
      message: `Menu item "${updated.name}" is now ${updated.isAvailable ? 'in stock (available)' : 'out of stock'}`,
      data: {
        id: updated.id,
        name: updated.name,
        isAvailable: updated.isAvailable,
        stockMode: updated.stockMode,
        stockQuantity: updated.stock ? updated.stock.quantity : null,
      },
    });
  } catch (error) {
    console.error('Error toggling item stock:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle item stock' });
  }
}

/**
 * Pause or resume accepting new orders for a canteen.
 * PATCH /api/canteens/:canteenId/toggle-status
 */
export async function toggleCanteenOrders(req, res) {
  try {
    const { canteenId } = req.params;
    const { isActive } = req.body;

    const canteen = await prisma.canteen.findUnique({
      where: { id: canteenId },
    });

    if (!canteen) {
      return res.status(404).json({ success: false, error: 'Canteen not found' });
    }

    const nextStatus = typeof isActive === 'boolean' ? isActive : !canteen.isActive;

    const updated = await prisma.canteen.update({
      where: { id: canteenId },
      data: { isActive: nextStatus },
    });

    res.json({
      success: true,
      message: `Canteen "${updated.name}" orders are now ${updated.isActive ? 'resumed (active)' : 'paused'}`,
      data: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error('Error toggling canteen status:', error);
    res.status(500).json({ success: false, error: 'Failed to update canteen status' });
  }
}
