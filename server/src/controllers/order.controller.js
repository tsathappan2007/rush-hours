import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { decrementStockAtomic, InsufficientStockError, TimeSlotFullError } from '../services/stock.service.js';

// Strict State Machine transitions:
// PENDING_PAYMENT / PAID -> CONFIRMED -> PREPARING -> READY -> COLLECTED
export const VALID_ORDER_TRANSITIONS = {
  PENDING_PAYMENT: 'CONFIRMED',
  PAID: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'COLLECTED',
};

/**
 * Place a new student pre-order.
 * Validates canteen active status and stock atomically before confirming.
 * POST /api/orders
 */
export async function createOrder(req, res) {
  try {
    const { studentId, canteenId, timeSlotId, items } = req.body;

    if (!studentId || !canteenId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, canteenId, items (array)',
      });
    }

    // 1. Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    // 2. Verify canteen exists and is currently accepting orders
    const canteen = await prisma.canteen.findUnique({
      where: { id: canteenId },
    });
    if (!canteen) {
      return res.status(404).json({ success: false, error: 'Canteen not found' });
    }
    if (!canteen.isActive) {
      return res.status(400).json({
        success: false,
        error: `Canteen "${canteen.name}" has paused new orders at this time.`,
      });
    }

    // 3. Verify menu items exist, belong to this canteen, and are marked available
    const itemIds = items.map((i) => i.menuItemId);
    const dbItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        canteenId,
      },
    });

    if (dbItems.length !== itemIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more items do not exist or do not belong to the selected canteen.',
      });
    }

    const unavailableItem = dbItems.find((i) => !i.isAvailable);
    if (unavailableItem) {
      return res.status(400).json({
        success: false,
        error: `Item "${unavailableItem.name}" is currently marked out of stock.`,
      });
    }

    // Map item details and calculate subtotal/total from DB values
    const dbItemMap = new Map(dbItems.map((i) => [i.id, i]));
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Item quantity must be a positive integer.',
        });
      }

      const dbItem = dbItemMap.get(item.menuItemId);
      const unitPrice = Number(dbItem.price);
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;

      orderItemsData.push({
        menuItemId: item.menuItemId,
        quantity,
        unitPrice,
        subtotal,
      });
    }

    // 4. Generate Order Number & Pickup Token
    const orderNumber = `RH-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit numeric OTP
    const qrPayload = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours expiry

    // 5. Execute atomic stock decrement & order creation inside an interactive transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // Atomic stock check and decrement (throws InsufficientStockError or TimeSlotFullError)
      await decrementStockAtomic(items, timeSlotId, tx);

      // Create Order
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          studentId,
          canteenId,
          timeSlotId: timeSlotId || null,
          status: 'PAID',
          totalAmount,
          paidAt: new Date(),
          orderItems: {
            create: orderItemsData.map((oi) => ({
              menuItemId: oi.menuItemId,
              quantity: oi.quantity,
              unitPrice: oi.unitPrice,
              subtotal: oi.subtotal,
            })),
          },
          pickupToken: {
            create: {
              otpCode,
              qrPayload,
              expiresAt,
            },
          },
        },
        include: {
          orderItems: {
            include: {
              menuItem: { select: { name: true, category: true } },
            },
          },
          pickupToken: true,
          canteen: { select: { name: true, location: true } },
        },
      });

      return createdOrder;
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed and confirmed successfully.',
      data: newOrder,
    });
  } catch (error) {
    if (error instanceof InsufficientStockError || error instanceof TimeSlotFullError) {
      return res.status(error.statusCode || 409).json({
        success: false,
        error: error.message,
        details: error.details || null,
      });
    }

    console.error('Error creating order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to place order due to a server error.',
    });
  }
}

/**
 * List a student's orders.
 * GET /api/orders/my-orders?studentId=...
 */
export async function getStudentOrders(req, res) {
  try {
    const studentId = req.query.studentId || req.headers['x-student-id'];

    if (!studentId) {
      return res.status(400).json({ success: false, error: 'studentId query param or header required' });
    }

    const orders = await prisma.order.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        canteen: { select: { id: true, name: true, location: true } },
        timeSlot: { select: { slotDate: true, startTime: true, endTime: true } },
        orderItems: {
          include: {
            menuItem: { select: { id: true, name: true, imageUrl: true } },
          },
        },
        pickupToken: {
          select: {
            otpCode: true,
            qrPayload: true,
            expiresAt: true,
            usedAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching student orders:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve student orders' });
  }
}

/**
 * Canteen-side view of incoming and active orders.
 * GET /api/orders/canteen/:canteenId?status=...
 */
export async function getCanteenOrders(req, res) {
  try {
    const { canteenId } = req.params;
    const { status } = req.query;

    const whereClause = { canteenId };
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, rollNumber: true, phone: true } },
        timeSlot: { select: { slotDate: true, startTime: true, endTime: true } },
        orderItems: {
          include: {
            menuItem: { select: { id: true, name: true, stockMode: true } },
          },
        },
        pickupToken: {
          select: {
            otpCode: true,
            expiresAt: true,
            usedAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching canteen orders:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve canteen orders' });
  }
}

/**
 * Update order status through the strict state machine:
 * PAID -> CONFIRMED -> PREPARING -> READY -> COLLECTED
 * No skipping states allowed.
 * PATCH /api/orders/:orderId/status
 */
export async function updateOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status: targetStatus } = req.body;

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: status',
      });
    }

    const normalizedTarget = targetStatus.toUpperCase();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { pickupToken: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const currentStatus = order.status;

    // Terminal statuses cannot transition further
    if (['COLLECTED', 'FORFEITED', 'REFUNDED'].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        error: `Order is already in terminal state "${currentStatus}" and cannot be updated further.`,
      });
    }

    // Strict state machine validation
    const expectedNextStatus = VALID_ORDER_TRANSITIONS[currentStatus];

    if (normalizedTarget !== expectedNextStatus) {
      return res.status(400).json({
        success: false,
        error: `Invalid state transition: Cannot transition order from "${currentStatus}" to "${normalizedTarget}". Next required state is "${expectedNextStatus}".`,
        currentStatus,
        attemptedStatus: normalizedTarget,
        requiredNextStatus: expectedNextStatus,
      });
    }

    // Execute update
    const updateData = { status: normalizedTarget };

    // If order reaches COLLECTED, mark pickup token used
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          pickupToken: true,
          orderItems: { include: { menuItem: true } },
          student: { select: { fullName: true, rollNumber: true } },
        },
      });

      if (normalizedTarget === 'COLLECTED' && order.pickupToken) {
        await tx.pickupToken.update({
          where: { orderId },
          data: { usedAt: new Date() },
        });
      }

      return updated;
    });

    res.json({
      success: true,
      message: `Order status successfully transitioned from "${currentStatus}" to "${normalizedTarget}".`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
}
