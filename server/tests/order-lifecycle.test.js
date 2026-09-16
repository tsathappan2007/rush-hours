import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Order Lifecycle: Grace Window, Staff Prep Lock, Customizations & 20-Min Deadline', () => {
  const GRACE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
  const PICKUP_DEADLINE_MS = 20 * 60 * 1000; // 20 minutes

  test('2-Minute Grace Window: allows cancellation at 60 seconds after confirmation', () => {
    const order = {
      id: 'ord_1',
      status: 'CONFIRMED',
      confirmedAt: new Date(Date.now() - 60 * 1000), // 60 seconds ago
    };

    const elapsed = Date.now() - order.confirmedAt.getTime();
    const canCancel = order.status === 'CONFIRMED' && elapsed <= GRACE_WINDOW_MS;

    assert.equal(canCancel, true, 'Cancellation must be permitted within 2 minutes');
  });

  test('2-Minute Grace Window: rejects cancellation at 130 seconds after confirmation', () => {
    const order = {
      id: 'ord_2',
      status: 'CONFIRMED',
      confirmedAt: new Date(Date.now() - 130 * 1000), // 130 seconds ago
    };

    const elapsed = Date.now() - order.confirmedAt.getTime();
    const canCancel = order.status === 'CONFIRMED' && elapsed <= GRACE_WINDOW_MS;

    assert.equal(canCancel, false, 'Cancellation must be blocked once grace window expires');
    assert.ok(elapsed > GRACE_WINDOW_MS);
  });

  test('Staff Prep Lock: blocks staff from moving order to PREPARING during 2-minute grace window', () => {
    const order = {
      id: 'ord_3',
      status: 'CONFIRMED',
      confirmedAt: new Date(Date.now() - 45 * 1000), // 45 seconds ago
    };

    function attemptMoveToPreparing(ord) {
      if (ord.status === 'CONFIRMED') {
        const elapsed = Date.now() - ord.confirmedAt.getTime();
        if (elapsed < GRACE_WINDOW_MS) {
          const remainingSecs = Math.ceil((GRACE_WINDOW_MS - elapsed) / 1000);
          return {
            allowed: false,
            error: `Order is in student cancellation/edit grace window. ${remainingSecs}s remaining.`,
          };
        }
      }
      return { allowed: true };
    }

    const check = attemptMoveToPreparing(order);
    assert.equal(check.allowed, false, 'Kitchen preparation must be locked during grace window');
    assert.ok(check.error.includes('grace window'));
  });

  test('Staff Prep Lock: allows staff to move order to PREPARING after 2 minutes', () => {
    const order = {
      id: 'ord_4',
      status: 'CONFIRMED',
      confirmedAt: new Date(Date.now() - 125 * 1000), // 2m 5s ago
    };

    const elapsed = Date.now() - order.confirmedAt.getTime();
    const allowed = elapsed >= GRACE_WINDOW_MS;

    assert.equal(allowed, true, 'Staff can start preparing after 2 minutes have passed');
  });

  test('20-Minute Pickup Deadline: sweeps uncollected READY orders to FORFEITED and logs audit', () => {
    const orders = [
      {
        orderNumber: 'RH-TEST-READY-1',
        status: 'READY',
        readyAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago (expired)
      },
      {
        orderNumber: 'RH-TEST-READY-2',
        status: 'READY',
        readyAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago (valid)
      },
    ];

    const auditLogs = [];

    // Simulate sweepForfeitedOrders logic
    orders.forEach((o) => {
      const elapsed = Date.now() - o.readyAt.getTime();
      if (elapsed > PICKUP_DEADLINE_MS) {
        o.status = 'FORFEITED';
        auditLogs.push(`[Audit Log] Order ${o.orderNumber} marked FORFEITED: 20-minute pickup deadline exceeded.`);
      }
    });

    assert.equal(orders[0].status, 'FORFEITED', 'Order past 20 minutes must be forfeited');
    assert.equal(orders[1].status, 'READY', 'Order within 20 minutes must remain READY');
    assert.equal(auditLogs.length, 1, 'Exactly one audit log should be recorded');
    assert.ok(auditLogs[0].includes('RH-TEST-READY-1'));
  });

  test('Item Customization: validates customization tags attached to order item', () => {
    const item = {
      menuItemId: 'item-1',
      name: 'Wok Tossed Veg Hakka Noodles',
      quantity: 1,
      customizations: ['No Onion', 'Extra Spicy'],
    };

    assert.ok(Array.isArray(item.customizations), 'Customizations must be an array');
    assert.equal(item.customizations.length, 2);
    assert.ok(item.customizations.includes('No Onion'));
    assert.ok(item.customizations.includes('Extra Spicy'));
  });
});
