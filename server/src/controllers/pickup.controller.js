import QRCode from 'qrcode';
import { prisma } from '../db/prisma.js';

/**
 * Fetch pickup details for an order (QR image Data URL + 4-digit OTP + expiry).
 * GET /api/pickup/:orderId
 */
export async function getOrderPickupDetails(req, res) {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        pickupToken: true,
        canteen: { select: { name: true, location: true } },
        orderItems: { include: { menuItem: { select: { name: true } } } },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (!order.pickupToken) {
      return res.status(404).json({
        success: false,
        error: 'No pickup token found for this order. It may still be awaiting payment confirmation.',
      });
    }

    const token = order.pickupToken;
    const isExpired = new Date() > new Date(token.expiresAt);
    const isUsed = Boolean(token.usedAt);

    // Generate Base64 QR Code Data URL from the secure qrPayload
    const qrDataUrl = await QRCode.toDataURL(token.qrPayload, {
      width: 256,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        canteen: order.canteen,
        items: order.orderItems.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
        })),
        pickup: {
          otpCode: token.otpCode,
          qrPayload: token.qrPayload,
          qrDataUrl,
          expiresAt: token.expiresAt,
          usedAt: token.usedAt,
          isUsed,
          isExpired,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching pickup details:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve pickup details' });
  }
}

/**
 * Canteen staff scans QR code or enters 4-digit OTP to hand over meal and mark collected.
 * Enforces SINGLE-USE: Rejects any second attempt with 409 Conflict.
 * POST /api/pickup/verify
 */
export async function verifyPickup(req, res) {
  try {
    const { canteenId, token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: token (4-digit OTP or QR payload string)',
      });
    }

    const cleanToken = token.toString().trim();

    // Find token by either 4-digit OTP or full QR payload string
    const pickupToken = await prisma.pickupToken.findFirst({
      where: {
        OR: [{ otpCode: cleanToken }, { qrPayload: cleanToken }],
      },
      include: {
        order: {
          include: {
            student: { select: { fullName: true, rollNumber: true, phone: true } },
            canteen: { select: { id: true, name: true } },
            orderItems: { include: { menuItem: { select: { name: true } } } },
          },
        },
      },
    });

    if (!pickupToken) {
      return res.status(404).json({
        success: false,
        error: 'Invalid pickup token or OTP. No matching order found.',
      });
    }

    const { order } = pickupToken;

    // Verify canteen ownership if canteenId was supplied
    if (canteenId && order.canteenId !== canteenId) {
      return res.status(403).json({
        success: false,
        error: `Order belongs to "${order.canteen.name}", not this canteen counter.`,
      });
    }

    // 1. STRICT SINGLE-USE ENFORCEMENT
    if (pickupToken.usedAt) {
      const formattedTime = new Date(pickupToken.usedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return res.status(409).json({
        success: false,
        error: `SECURITY ALERT: This pickup token was already redeemed at ${formattedTime}. Duplicate redemption rejected.`,
        orderNumber: order.orderNumber,
        usedAt: pickupToken.usedAt,
        studentName: order.student.fullName,
      });
    }

    // 2. EXPIRY ENFORCEMENT
    if (new Date() > new Date(pickupToken.expiresAt)) {
      return res.status(400).json({
        success: false,
        error: 'This pickup token has expired. Please advise the student to contact the canteen supervisor.',
        orderNumber: order.orderNumber,
        expiresAt: pickupToken.expiresAt,
      });
    }

    // 3. ATOMICALLY MARK COLLECTED AND RECORD REDEMPTION TIMESTAMP
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Mark token used
      const updatedToken = await tx.pickupToken.update({
        where: { id: pickupToken.id },
        data: { usedAt: new Date() },
      });

      // Update order status to COLLECTED
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: 'COLLECTED' },
        include: {
          student: { select: { fullName: true, rollNumber: true } },
          orderItems: { include: { menuItem: { select: { name: true } } } },
        },
      });

      return { updated, updatedToken };
    });

    console.log(`[Pickup] ✅ Order ${order.orderNumber} successfully marked COLLECTED via token verification.`);

    res.json({
      success: true,
      message: `Order ${order.orderNumber} verified and marked COLLECTED successfully.`,
      data: {
        orderNumber: updatedOrder.updated.orderNumber,
        status: updatedOrder.updated.status,
        studentName: updatedOrder.updated.student.fullName,
        rollNumber: updatedOrder.updated.student.rollNumber,
        items: updatedOrder.updated.orderItems.map((i) => `${i.quantity}x ${i.menuItem.name}`),
        collectedAt: updatedOrder.updatedToken.usedAt,
      },
    });
  } catch (error) {
    console.error('Error verifying pickup token:', error);
    res.status(500).json({ success: false, error: 'Failed to verify pickup token' });
  }
}
