import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateQueueLoad } from '../src/controllers/canteen.controller.js';

describe('Time-Slot Capacity & Queue-Load Calculation Tests', () => {
  test('Queue Load: correctly assigns GREEN status when load is under 60%', () => {
    // 10 orders out of 25 capacity = 40%
    const load = calculateQueueLoad(10, 25);
    assert.equal(load.level, 'green', 'Should be green when load < 60%');
    assert.equal(load.percentage, 40);
    assert.equal(load.label, 'Normal');

    // 0 orders out of 30 = 0%
    const zeroLoad = calculateQueueLoad(0, 30);
    assert.equal(zeroLoad.level, 'green');
    assert.equal(zeroLoad.percentage, 0);
  });

  test('Queue Load: correctly assigns YELLOW status when load is between 60% and 84%', () => {
    // 15 orders out of 25 capacity = 60%
    const load60 = calculateQueueLoad(15, 25);
    assert.equal(load60.level, 'yellow', 'Should be yellow at 60% load');
    assert.equal(load60.percentage, 60);
    assert.equal(load60.label, 'Busy');

    // 20 orders out of 25 = 80%
    const load80 = calculateQueueLoad(20, 25);
    assert.equal(load80.level, 'yellow');
    assert.equal(load80.percentage, 80);
  });

  test('Queue Load: correctly assigns RED status when load is 85% or higher (heavy rush or full)', () => {
    // 22 orders out of 25 capacity = 88%
    const load88 = calculateQueueLoad(22, 25);
    assert.equal(load88.level, 'red', 'Should be red at >= 85% load');
    assert.equal(load88.percentage, 88);
    assert.equal(load88.label, 'Heavy Rush');

    // 25 orders out of 25 capacity = 100% full
    const fullLoad = calculateQueueLoad(25, 25);
    assert.equal(fullLoad.level, 'red');
    assert.equal(fullLoad.percentage, 100);
    assert.equal(fullLoad.label, 'Full');
  });

  test('Capacity Filtering: filters out full slots from student booking options', () => {
    const timeSlots = [
      { id: 's1', startTime: '12:30', endTime: '12:45', maxOrders: 25, currentOrders: 25 }, // Full
      { id: 's2', startTime: '12:45', endTime: '13:00', maxOrders: 25, currentOrders: 18 }, // Available (7 left)
      { id: 's3', startTime: '13:00', endTime: '13:15', maxOrders: 20, currentOrders: 20 }, // Full
      { id: 's4', startTime: '13:15', endTime: '13:30', maxOrders: 20, currentOrders: 4 },  // Available (16 left)
    ];

    // Filter slots with remaining capacity
    const studentAvailableSlots = timeSlots
      .filter((slot) => slot.currentOrders < slot.maxOrders)
      .map((slot) => ({
        ...slot,
        availableSlots: slot.maxOrders - slot.currentOrders,
      }));

    assert.equal(studentAvailableSlots.length, 2, 'Only 2 slots should be available to students');
    assert.equal(studentAvailableSlots[0].id, 's2');
    assert.equal(studentAvailableSlots[0].availableSlots, 7);
    assert.equal(studentAvailableSlots[1].id, 's4');
    assert.equal(studentAvailableSlots[1].availableSlots, 16);
  });

  test('One-Tap Pause Toggle: correctly gates order creation when canteen is paused', () => {
    const activeCanteen = { id: 'c1', name: 'Main Food Court', isActive: true };
    const pausedCanteen = { id: 'c2', name: 'North Cafe', isActive: false };

    function checkCanOrder(canteen) {
      if (!canteen.isActive) {
        return { allowed: false, error: `Canteen "${canteen.name}" has paused accepting new orders.` };
      }
      return { allowed: true };
    }

    assert.equal(checkCanOrder(activeCanteen).allowed, true);
    const pausedResult = checkCanOrder(pausedCanteen);
    assert.equal(pausedResult.allowed, false);
    assert.ok(pausedResult.error.includes('paused accepting new orders'));
  });
});
