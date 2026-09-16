import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { VALID_ORDER_TRANSITIONS } from '../src/controllers/order.controller.js';

describe('Order State Machine Enforcement', () => {
  test('strictly enforces single-step transitions without skipping states', () => {
    assert.equal(VALID_ORDER_TRANSITIONS['PENDING_PAYMENT'], 'CONFIRMED');
    assert.equal(VALID_ORDER_TRANSITIONS['PAID'], 'CONFIRMED');
    assert.equal(VALID_ORDER_TRANSITIONS['CONFIRMED'], 'PREPARING');
    assert.equal(VALID_ORDER_TRANSITIONS['PREPARING'], 'READY');
    assert.equal(VALID_ORDER_TRANSITIONS['READY'], 'COLLECTED');
  });

  test('rejects skipping states (e.g. PAID directly to READY or PREPARING)', () => {
    const invalidTransitions = [
      { from: 'PAID', to: 'PREPARING' },
      { from: 'PAID', to: 'READY' },
      { from: 'PAID', to: 'COLLECTED' },
      { from: 'CONFIRMED', to: 'READY' },
      { from: 'CONFIRMED', to: 'COLLECTED' },
      { from: 'PREPARING', to: 'COLLECTED' },
    ];

    for (const { from, to } of invalidTransitions) {
      const expected = VALID_ORDER_TRANSITIONS[from];
      assert.notEqual(
        to,
        expected,
        `Transition from ${from} to ${to} should be invalid (expected: ${expected})`
      );
    }
  });

  test('terminal states (COLLECTED, FORFEITED, REFUNDED) have no further valid transitions', () => {
    assert.equal(VALID_ORDER_TRANSITIONS['COLLECTED'], undefined);
    assert.equal(VALID_ORDER_TRANSITIONS['FORFEITED'], undefined);
    assert.equal(VALID_ORDER_TRANSITIONS['REFUNDED'], undefined);
  });
});
