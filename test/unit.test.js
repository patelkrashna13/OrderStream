const assert = require('assert');
const { validateOrderRow } = require('../src/validation/order.validator');
const { ValidationEngine } = require('../src/validation/validation-engine');
const { ShardRouter } = require('../src/sharding/shard-router');
const { normalizeCsvKeys } = require('../src/parsers/csv-parser');

console.log('--- Starting Unit Test Suite ---');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests += 1;
  try {
    fn();
    passedTests += 1;
    console.log(`✓ PASS: ${name}`);
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
  }
}

// 1. Test CSV Header Normalization
test('Header Normalizer handles typos and whitespace', () => {
  const raw = { ' ORDER_ID ': 'ORD-001', 'customer_id': 'CUST-100', 'Order_date': '2026-08-06', 'order_amout': '99.99', 'STATUS': 'completed' };
  const normalized = normalizeCsvKeys(raw);

  assert.strictEqual(normalized.order_id, 'ORD-001');
  assert.strictEqual(normalized.customer_id, 'CUST-100');
  assert.strictEqual(normalized.order_amount, '99.99');
  assert.strictEqual(normalized.status, 'completed');
});

// 2. Test Order Row Validation - Valid Row
test('Order Validator accepts valid order row payload', () => {
  const row = { order_id: 'ORD-100', customer_id: 'CUST-01', order_date: '2026-08-06T12:00:00.000Z', order_amount: '150.75', status: 'COMPLETED' };
  const result = validateOrderRow(row);

  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.data.order_id, 'ORD-100');
  assert.strictEqual(result.data.order_amount, 150.75);
  assert.strictEqual(result.data.status, 'COMPLETED');
});

// 3. Test Order Row Validation - Invalid Amount
test('Order Validator rejects negative or invalid order_amount', () => {
  const row = { order_id: 'ORD-101', customer_id: 'CUST-01', order_date: '2026-08-06', order_amount: '-25.00', status: 'PENDING' };
  const result = validateOrderRow(row);

  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.field, 'order_amount');
});

// 4. Test Order Row Validation - Invalid Timestamp
test('Order Validator rejects malformed date timestamp', () => {
  const row = { order_id: 'ORD-102', customer_id: 'CUST-01', order_date: 'INVALID_DATE', order_amount: '50.00', status: 'PENDING' };
  const result = validateOrderRow(row);

  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.field, 'order_date');
});

// 5. Test ValidationEngine Error Isolation
test('ValidationEngine tracks valid and isolated failed records', () => {
  const engine = new ValidationEngine('TEST-JOB-001');
  
  const res1 = engine.processRow({ order_id: 'O-1', customer_id: 'C-1', order_date: '2026-08-06', order_amount: '10.00', status: 'COMPLETED' }, 1);
  const res2 = engine.processRow({ order_id: '', customer_id: 'C-1', order_date: '2026-08-06', order_amount: '10.00', status: 'COMPLETED' }, 2);

  assert.strictEqual(res1.isValid, true);
  assert.strictEqual(res2.isValid, false);

  const metrics = engine.getMetrics();
  assert.strictEqual(metrics.totalProcessed, 2);
  assert.strictEqual(metrics.validCount, 1);
  assert.strictEqual(metrics.failedCount, 1);
});

// 6. Test ShardRouter Deterministic Routing
test('ShardRouter routes records deterministically across shards', () => {
  const router = new ShardRouter('customer_id', 2);
  
  const shard1 = router.getShardIndex({ customer_id: 'CUST-001' });
  const shard2 = router.getShardIndex({ customer_id: 'CUST-001' });
  const shard3 = router.getShardIndex({ customer_id: 'CUST-002' });

  assert.strictEqual(shard1, shard2, 'Same customer_id must route to same shard index');
  assert.strictEqual(typeof shard1, 'number');
  assert.ok(shard1 >= 0 && shard1 < 2);
});

console.log(`\n--- Unit Test Results: ${passedTests}/${totalTests} Passed ---`);
if (passedTests !== totalTests) {
  process.exit(1);
}
