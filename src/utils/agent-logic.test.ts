import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateDiscountPolicy,
  calculateOrderSummary,
  detectCustomerSentiment,
  checkStockStatus,
} from './agent-logic';

test('evaluateDiscountPolicy auto-approves up to 5% for standard customer', () => {
  const result = evaluateDiscountPolicy({
    orderTotal: 5000,
    requestedDiscountPct: 5,
    customerOrderCount: 1,
  });

  assert.equal(result.requiresApproval, false);
  assert.equal(result.autoApproved, true);
  assert.equal(result.maxAgentDiscountPct, 5);
});

test('evaluateDiscountPolicy auto-approves up to 10% for VIP customer (>=3 orders)', () => {
  const result = evaluateDiscountPolicy({
    orderTotal: 12000,
    requestedDiscountPct: 10,
    customerOrderCount: 4,
  });

  assert.equal(result.requiresApproval, false);
  assert.equal(result.autoApproved, true);
  assert.equal(result.maxAgentDiscountPct, 10);
});

test('evaluateDiscountPolicy requires human approval when requested discount exceeds limit', () => {
  const result = evaluateDiscountPolicy({
    orderTotal: 25000,
    requestedDiscountPct: 20,
    customerOrderCount: 2,
  });

  assert.equal(result.requiresApproval, true);
  assert.equal(result.autoApproved, false);
  assert.match(result.reason, /Store owner approval required/);
});

test('calculateOrderSummary correctly computes subtotal, discount, and margin', () => {
  // Unit price 1000, qty 2 => subtotal 2000. 10% discount => discount 200, final 1800.
  // COGS = 2000 * 0.6 = 1200. Profit = 1800 - 1200 = 600. Margin = 600 / 1800 = 33%.
  const summary = calculateOrderSummary(1000, 2, 10);

  assert.equal(summary.subtotal, 2000);
  assert.equal(summary.discountAmount, 200);
  assert.equal(summary.finalAmount, 1800);
  assert.equal(summary.marginPct, 33);
});

test('detectCustomerSentiment detects urgent and negative messages for flagging', () => {
  const urgent = detectCustomerSentiment('URGENT: My shipment arrived completely broken and damaged!');
  assert.equal(urgent.sentiment, 'urgent');
  assert.equal(urgent.shouldFlag, true);

  const angry = detectCustomerSentiment('This is the worst experience ever, let me talk to your manager');
  assert.equal(angry.sentiment, 'negative');
  assert.equal(angry.shouldFlag, true);

  const happy = detectCustomerSentiment('Thank you so much, the product is awesome and works great!');
  assert.equal(happy.sentiment, 'positive');
  assert.equal(happy.shouldFlag, false);

  const neutral = detectCustomerSentiment('What are the dimensions and warranty details?');
  assert.equal(neutral.sentiment, 'neutral');
  assert.equal(neutral.shouldFlag, false);
});

test('checkStockStatus correctly classifies inventory health', () => {
  assert.equal(checkStockStatus(1).status, 'critical');
  assert.equal(checkStockStatus(1).needsRestock, true);

  assert.equal(checkStockStatus(4).status, 'low');
  assert.equal(checkStockStatus(4).needsRestock, true);

  assert.equal(checkStockStatus(10).status, 'healthy');
  assert.equal(checkStockStatus(10).needsRestock, false);
});
