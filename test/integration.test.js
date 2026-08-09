const assert = require('assert');
const http = require('http');
const app = require('../src/app');

console.log('--- Starting Integration Test Suite ---');

let server;

function startServer() {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      console.log(`Integration test server running on port ${port}`);
      resolve(port);
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

function makeGetRequest(port, path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, body: json });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function runIntegrationTests() {
  const port = await startServer();
  let passed = 0;
  let total = 0;

  // Test 1: GET / Status Endpoint
  total += 1;
  try {
    const res = await makeGetRequest(port, '/');
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    console.log('✓ PASS: GET / returns status success');
    passed += 1;
  } catch (err) {
    console.error('✗ FAIL: GET / status endpoint test failed', err);
  }

  // Test 2: GET /health Status Endpoint
  total += 1;
  try {
    const res = await makeGetRequest(port, '/health');
    assert.ok(res.statusCode === 200 || res.statusCode === 503);
    assert.ok(res.body.status === 'UP' || res.body.status === 'DEGRADED');
    console.log('✓ PASS: GET /health status endpoint verified');
    passed += 1;
  } catch (err) {
    console.error('✗ FAIL: GET /health endpoint test failed', err);
  }

  // Test 3: GET /orders/NON_EXISTENT 404 Check
  total += 1;
  try {
    const res = await makeGetRequest(port, '/api/v1/orders/NON_EXISTENT_ORD_999');
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.code, 'ORDER_NOT_FOUND');
    console.log('✓ PASS: GET /orders/:orderId 404 handled cleanly');
    passed += 1;
  } catch (err) {
    console.error('✗ FAIL: GET /orders/:orderId 404 test failed', err);
  }

  await stopServer();

  console.log(`\n--- Integration Test Results: ${passed}/${total} Passed ---`);
  if (passed !== total) {
    process.exit(1);
  }
}

if (require.main === module) {
  runIntegrationTests().catch((err) => {
    console.error('Integration test runner error:', err);
    process.exit(1);
  });
}
