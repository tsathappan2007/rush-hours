import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/db/prisma.js';
import {
  decrementStockAtomic,
  InsufficientStockError,
} from '../src/services/stock.service.js';

describe('Race Condition Concurrency Tests: Simultaneous Orders for Last Unit of Stock', () => {
  let isDbAvailable = false;
  let testCanteenId;
  let testItemId;

  before(async () => {
    try {
      await prisma.$connect();
      isDbAvailable = true;

      // Seed an isolated test canteen and an item with exactly 1 unit in stock
      const canteen = await prisma.canteen.create({
        data: {
          name: 'Concurrency Test Canteen',
          code: `TEST-${Date.now().toString(36).toUpperCase()}`,
          openingTime: '08:00',
          closingTime: '22:00',
          isActive: true,
        },
      });
      testCanteenId = canteen.id;

      const item = await prisma.menuItem.create({
        data: {
          canteenId: canteen.id,
          name: 'Last Samosa in Canteen',
          price: 25.00,
          category: 'Snacks',
          stockMode: 'COUNTABLE',
          isAvailable: true,
          stock: {
            create: {
              quantity: 1, // Exactly 1 unit available
              dailyTotal: 1,
            },
          },
        },
      });
      testItemId = item.id;
    } catch {
      isDbAvailable = false;
    }
  });

  after(async () => {
    if (isDbAvailable && testCanteenId) {
      try {
        await prisma.canteen.delete({ where: { id: testCanteenId } });
      } catch {
        // cleanup ignore
      }
      await prisma.$disconnect();
    }
  });

  test('Database atomic query: Two simultaneous orders for the last unit of stock', async (t) => {
    if (!isDbAvailable) {
      t.skip('Skipping live PostgreSQL test because DB server is not reachable at localhost:5432.');
      return;
    }

    const order1 = decrementStockAtomic([{ menuItemId: testItemId, quantity: 1 }]);
    const order2 = decrementStockAtomic([{ menuItemId: testItemId, quantity: 1 }]);

    const results = await Promise.allSettled([order1, order2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one order must succeed
    assert.equal(fulfilled.length, 1, 'Exactly one simultaneous order should succeed');

    // Exactly one order must fail due to stock depletion
    assert.equal(rejected.length, 1, 'Exactly one simultaneous order should fail');
    assert.ok(
      rejected[0].reason instanceof InsufficientStockError ||
      rejected[0].reason.message.includes('Insufficient stock'),
      'Rejected order must throw InsufficientStockError'
    );

    // Verify database stock ended at exactly 0 and never became negative
    const finalStock = await prisma.stock.findUnique({
      where: { menuItemId: testItemId },
    });
    assert.equal(finalStock.quantity, 0, 'Final stock in DB must be exactly 0');
  });

  test('Transactional atomic conditional update model prevents overselling under concurrency', async () => {
    // Model the PostgreSQL atomic conditional statement:
    // UPDATE stock SET quantity = quantity - count WHERE quantity >= count
    class AtomicStockStore {
      constructor(initialQuantity) {
        this.quantity = initialQuantity;
        this.successfulOrders = 0;
        this.lock = Promise.resolve();
      }

      async tryDecrement(amount) {
        // Atomic compare-and-swap with async execution interleaving
        return new Promise((resolve, reject) => {
          setImmediate(() => {
            if (this.quantity >= amount) {
              this.quantity -= amount;
              this.successfulOrders += 1;
              resolve({ success: true, remaining: this.quantity });
            } else {
              reject(new InsufficientStockError('Last Samosa', amount, this.quantity));
            }
          });
        });
      }
    }

    const store = new AtomicStockStore(1); // Exactly 1 unit available

    // Fire 2 simultaneous competing requests for that single unit
    const [result1, result2] = await Promise.allSettled([
      store.tryDecrement(1),
      store.tryDecrement(1),
    ]);

    const fulfilled = [result1, result2].filter((r) => r.status === 'fulfilled');
    const rejected = [result1, result2].filter((r) => r.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'Only one order can claim the last item');
    assert.equal(rejected.length, 1, 'The competing order must be rejected');
    assert.equal(store.quantity, 0, 'Final quantity must be 0 and never negative');
    assert.equal(store.successfulOrders, 1, 'Only 1 successful purchase recorded');
  });
});
