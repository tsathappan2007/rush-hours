import { prisma } from '../db/prisma.js';

export class InsufficientStockError extends Error {
  constructor(itemName, requested, available) {
    super(`Insufficient stock for "${itemName}". Requested: ${requested}, Available: ${available}`);
    this.name = 'InsufficientStockError';
    this.statusCode = 409;
    this.details = { itemName, requested, available };
  }
}

export class TimeSlotFullError extends Error {
  constructor(slotInfo) {
    super(`Selected time slot ${slotInfo} is at maximum capacity.`);
    this.name = 'TimeSlotFullError';
    this.statusCode = 409;
  }
}

/**
 * Atomically decrements stock for countable items and validates slot capacity.
 * Executed inside a Prisma interactive transaction to prevent race conditions on the last item.
 *
 * @param {Array<{ menuItemId: string, quantity: number, name?: string }>} items
 * @param {string|null} timeSlotId - Optional time slot ID for slot capacity items
 * @param {import('@prisma/client').Prisma.TransactionClient} tx - Active Prisma transaction client
 * @returns {Promise<Array<{ menuItemId: string, newQuantity: number }>>}
 */
export async function decrementStockAtomic(items, timeSlotId = null, tx = null) {
  const runInTx = async (client) => {
    // 1. If a time slot is chosen, atomically check capacity and increment order count
    if (timeSlotId) {
      const slotUpdate = await client.$executeRaw`
        UPDATE "time_slots"
        SET "current_orders" = "current_orders" + 1,
            "updated_at" = NOW()
        WHERE "id" = ${timeSlotId}::uuid
          AND "is_active" = true
          AND "current_orders" < "max_orders"
      `;

      if (slotUpdate === 0) {
        throw new TimeSlotFullError(timeSlotId);
      }
    }

    const decrementedResults = [];

    // 2. Atomically decrement stock for each item
    for (const item of items) {
      const { menuItemId, quantity } = item;
      if (!quantity || quantity <= 0) continue;

      // Check item's stock_mode
      const menuItem = await client.menuItem.findUnique({
        where: { id: menuItemId },
        select: { id: true, name: true, stockMode: true, isAvailable: true },
      });

      if (!menuItem || !menuItem.isAvailable) {
        throw new InsufficientStockError(menuItem?.name || menuItemId, quantity, 0);
      }

      // If item is COUNTABLE, run atomic conditional decrement
      if (menuItem.stockMode === 'COUNTABLE') {
        const rows = await client.$queryRaw`
          UPDATE "stock"
          SET "quantity" = "quantity" - ${quantity},
              "updated_at" = NOW()
          WHERE "menu_item_id" = ${menuItemId}::uuid
            AND "quantity" >= ${quantity}
          RETURNING "quantity"
        `;

        if (!rows || rows.length === 0) {
          // Fetch current available to provide clear error
          const currentStock = await client.stock.findUnique({
            where: { menuItemId },
            select: { quantity: true },
          });
          const available = currentStock ? currentStock.quantity : 0;
          throw new InsufficientStockError(menuItem.name, quantity, available);
        }

        decrementedResults.push({
          menuItemId,
          name: menuItem.name,
          remainingQuantity: rows[0].quantity,
        });
      }
    }

    return decrementedResults;
  };

  // Run within provided transaction client or create a new interactive transaction
  if (tx) {
    return await runInTx(tx);
  } else {
    return await prisma.$transaction(async (newTx) => {
      return await runInTx(newTx);
    });
  }
}

/**
 * Restores stock for items in case of order cancellation, refund, or payment expiration.
 *
 * @param {Array<{ menuItemId: string, quantity: number }>} items
 * @param {string|null} timeSlotId
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
export async function restoreStockAtomic(items, timeSlotId = null, tx = null) {
  const runInTx = async (client) => {
    if (timeSlotId) {
      await client.$executeRaw`
        UPDATE "time_slots"
        SET "current_orders" = GREATEST(0, "current_orders" - 1),
            "updated_at" = NOW()
        WHERE "id" = ${timeSlotId}::uuid
      `;
    }

    for (const item of items) {
      const { menuItemId, quantity } = item;
      if (!quantity || quantity <= 0) continue;

      await client.$executeRaw`
        UPDATE "stock"
        SET "quantity" = "quantity" + ${quantity},
            "updated_at" = NOW()
        WHERE "menu_item_id" = ${menuItemId}::uuid
      `;
    }
  };

  if (tx) {
    return await runInTx(tx);
  } else {
    return await prisma.$transaction(async (newTx) => {
      return await runInTx(newTx);
    });
  }
}
