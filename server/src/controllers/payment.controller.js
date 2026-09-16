import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { config } from '../config/index.js';
import {
  createRazorpayOrder,
  verifyWebhookSignature,
  refundPayment,
} from '../services/razorpay.service.js';
import {
  decrementStockAtomic,
  InsufficientStockError,
  TimeSlotFullError,
} from '../services/stock.service.js';

/**
 * Initiate student checkout and create a Razorpay payment order.
 * Note: Stock is NOT decremented yet. Confirmation and atomic decrement occur on webhook.
 * POST /api/payments/checkout
 */
export async function checkout(req, res) {
  try {
    const { studentId, canteenId, timeSlotId, items } = req.body;

    if (!studentId || !canteenId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, canteenId, items (array)',
      });
    }

    // 1. Verify student exists
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student profile not found' });
    }

    // 2. Verify canteen is accepting orders
    const canteen = await prisma.canteen.findUnique({ where: { id: canteenId } });
    if (!canteen) {
      return res.status(404).json({ success: false, error: 'Canteen not found' });
    }
    if (!canteen.isActive) {
      return res.status(400).json({
        success: false,
        error: `Canteen "${canteen.name}" has paused accepting new orders.`,
      });
    }

    // 3. Verify items and compute total using verified DB prices
    const itemIds = items.map((i) => i.menuItemId);
    const dbItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        canteenId,
      },
      include: { stock: true },
    });

    if (dbItems.length !== itemIds.length) {
      return res.status(400).json({
        success: false,
        error: 'One or more items do not exist or do not belong to the selected canteen.',
      });
    }

    const dbItemMap = new Map(dbItems.map((i) => [i.id, i]));
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, error: 'Item quantity must be a positive integer.' });
      }

      const dbItem = dbItemMap.get(item.menuItemId);
      if (!dbItem.isAvailable) {
        return res.status(400).json({
          success: false,
          error: `Item "${dbItem.name}" is currently marked out of stock.`,
        });
      }

      // Soft stock check before opening payment gateway
      if (dbItem.stockMode === 'COUNTABLE' && dbItem.stock && dbItem.stock.quantity < quantity) {
        return res.status(409).json({
          success: false,
          error: `Insufficient stock for "${dbItem.name}". Available: ${dbItem.stock.quantity}`,
        });
      }

      const unitPrice = Number(dbItem.price);
      const subtotal = unitPrice * quantity;
      totalAmount += subtotal;

      orderItemsData.push({
        menuItemId: item.menuItemId,
        quantity,
        unitPrice,
        subtotal,
        customizations: Array.isArray(item.customizations) ? item.customizations : [],
      });
    }

    // Convert total to paise (₹1 = 100 paise)
    const amountInPaise = Math.round(totalAmount * 100);
    const orderNumber = `RH-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // 4. Create Razorpay Order
    const rzpOrder = await createRazorpayOrder({
      amountInPaise,
      currency: 'INR',
      receipt: orderNumber,
      notes: {
        canteenId,
        studentId,
        orderNumber,
      },
    });

    // 5. Store initial order in DB with status PENDING_PAYMENT
    const createdOrder = await prisma.order.create({
      data: {
        orderNumber,
        studentId,
        canteenId,
        timeSlotId: timeSlotId || null,
        status: 'PENDING_PAYMENT',
        totalAmount,
        razorpayOrderId: rzpOrder.id,
        orderItems: {
          create: orderItemsData.map((oi) => ({
            menuItemId: oi.menuItemId,
            quantity: oi.quantity,
            unitPrice: oi.unitPrice,
            subtotal: oi.subtotal,
            customizations: oi.customizations,
          })),
        },
      },
      include: {
        orderItems: { include: { menuItem: { select: { name: true } } } },
        canteen: { select: { name: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Payment session created successfully.',
      data: {
        orderId: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        status: createdOrder.status,
        totalAmount: Number(createdOrder.totalAmount),
        razorpay: {
          orderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          keyId: config.razorpay.keyId || process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        },
      },
    });
  } catch (error) {
    console.error('Error initiating checkout:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate payment checkout' });
  }
}

/**
 * Handle incoming Razorpay webhooks.
 * Confirms payment, validates HMAC signature, atomically decrements stock, and triggers auto-refund on failure.
 * POST /api/payments/webhook
 */
export async function handleWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  // 1. Verify Webhook HMAC SHA256 Signature
  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    console.warn('[Razorpay Webhook] Invalid webhook signature detected. Request rejected.');
    return res.status(400).json({ success: false, error: 'Invalid webhook signature' });
  }

  const event = req.body.event;
  const payload = req.body.payload;

  console.log(`[Razorpay Webhook] Received verified event: "${event}"`);

  try {
    // Handle payment successful events
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment ? payload.payment.entity : null;
      const orderEntity = payload.order ? payload.order.entity : null;

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id || null;

      if (!razorpayOrderId) {
        console.warn('[Razorpay Webhook] Missing razorpayOrderId in webhook payload');
        return res.status(200).json({ status: 'ignored_missing_order_id' });
      }

      // Find corresponding system order
      const order = await prisma.order.findFirst({
        where: { razorpayOrderId },
        include: {
          orderItems: true,
          pickupToken: true,
        },
      });

      if (!order) {
        console.warn(`[Razorpay Webhook] No matching order found for Razorpay Order ID: ${razorpayOrderId}`);
        return res.status(200).json({ status: 'order_not_found' });
      }

      // Idempotency check: skip if already confirmed or completed
      if (['CONFIRMED', 'PREPARING', 'READY', 'COLLECTED'].includes(order.status)) {
        console.log(`[Razorpay Webhook] Order ${order.orderNumber} is already in state "${order.status}". Skipping.`);
        return res.status(200).json({ status: 'already_processed' });
      }

      // 2. ATOMIC STOCK DECREMENT INSIDE TRANSACTION
      try {
        await prisma.$transaction(async (tx) => {
          // Decrement stock atomically (throws InsufficientStockError if unavailable)
          await decrementStockAtomic(order.orderItems, order.timeSlotId, tx);

          // Generate OTP & QR pickup token
          const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
          const qrPayload = crypto.randomBytes(24).toString('hex');
          const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

          // Update order status to CONFIRMED
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'CONFIRMED',
              confirmedAt: new Date(),
              razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
              paidAt: new Date(),
              pickupToken: {
                create: {
                  otpCode,
                  qrPayload,
                  expiresAt,
                },
              },
            },
          });
        });

        console.log(`[Razorpay Webhook] ✅ Order ${order.orderNumber} successfully confirmed with atomic stock decrement.`);
        return res.status(200).json({ status: 'order_confirmed', orderId: order.id });
      } catch (stockError) {
        // 3. AUTO-REFUND TRIGGER IF STOCK RUNS OUT BEFORE WEBHOOK ARRIVES
        if (stockError instanceof InsufficientStockError || stockError instanceof TimeSlotFullError) {
          console.warn(`[Razorpay Webhook] Stock conflict for order ${order.orderNumber}: ${stockError.message}. Triggering auto-refund.`);

          // Mark order as REFUNDED in DB
          await prisma.order.update({
            where: { id: order.id },
            data: {
              status: 'REFUNDED',
              razorpayPaymentId: razorpayPaymentId || order.razorpayPaymentId,
            },
          });

          // Trigger refund via Razorpay API
          if (razorpayPaymentId) {
            await refundPayment(razorpayPaymentId, {
              amount: Math.round(Number(order.totalAmount) * 100),
              notes: {
                reason: 'Stock unavailable at payment confirmation',
                orderNumber: order.orderNumber,
              },
            });
          }

          return res.status(200).json({
            status: 'stock_unavailable_refund_triggered',
            orderId: order.id,
            error: stockError.message,
          });
        }

        throw stockError;
      }
    }

    // Handle payment failed events
    if (event === 'payment.failed') {
      const paymentEntity = payload.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;

      if (razorpayOrderId) {
        await prisma.order.updateMany({
          where: { razorpayOrderId, status: 'PENDING_PAYMENT' },
          data: { status: 'FORFEITED' },
        });
        console.log(`[Razorpay Webhook] Marked order with Razorpay ID ${razorpayOrderId} as FORFEITED due to payment failure.`);
      }

      return res.status(200).json({ status: 'payment_failed_recorded' });
    }

    // Default acknowledge for other events
    return res.status(200).json({ status: 'event_ignored' });
  } catch (error) {
    console.error('[Razorpay Webhook] Error processing webhook event:', error);
    return res.status(500).json({ success: false, error: 'Internal webhook handling error' });
  }
}

/**
 * Sweep and clean up orders stuck in PENDING_PAYMENT past a timeout threshold.
 * Auto-refunds any captured payments and marks uncollected orders FORFEITED.
 * POST /api/payments/cleanup-expired
 */
export async function cleanupExpiredOrders(req, res) {
  try {
    const timeoutMinutes = parseInt(req.query.timeoutMinutes || '15', 10);
    const expirationThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        createdAt: { lt: expirationThreshold },
      },
    });

    let refundedCount = 0;
    let forfeitedCount = 0;

    for (const order of expiredOrders) {
      if (order.razorpayPaymentId) {
        // Paid but unconfirmed -> auto-trigger refund
        await refundPayment(order.razorpayPaymentId, {
          amount: Math.round(Number(order.totalAmount) * 100),
          notes: { reason: 'Order confirmation timed out' },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'REFUNDED' },
        });
        refundedCount++;
      } else {
        // Abandoned cart / never paid
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'FORFEITED' },
        });
        forfeitedCount++;
      }
    }

    res.json({
      success: true,
      message: `Cleaned up ${expiredOrders.length} expired orders.`,
      data: {
        totalCleaned: expiredOrders.length,
        refundedCount,
        forfeitedCount,
      },
    });
  } catch (error) {
    console.error('Error cleaning up expired orders:', error);
    res.status(500).json({ success: false, error: 'Failed to clean up expired orders' });
  }
}
