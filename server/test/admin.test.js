import { test, suite, after } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const CUSTOMER_TOKEN = 'demo-jwt-customer-token-xyz123';
const ADMIN_TOKEN = 'demo-jwt-admin-token-sec888';

suite('Lumina Eyewear Admin Dashboard & Order Management Test Suite', () => {
  // Test 1: Unauthenticated request should be rejected with 401
  test('1. GET /api/admin/stats without token should return 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  // Test 2: Customer role attempting admin access should be rejected with 403
  test('2. GET /api/admin/stats with Customer token should return 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: {
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'FORBIDDEN');
  });

  // Test 3: Admin role accessing stats returns live MySQL data
  test('3. GET /api/admin/stats with Admin token should return 200 and real statistics', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.data.totalOrders === 'number');
    assert.ok(typeof body.data.totalRevenue === 'number');
    assert.ok(body.data.statusBreakdown !== undefined);
    assert.ok(body.data.inventory !== undefined);
    assert.ok(Array.isArray(body.data.inventory.lowStockProducts));
  });

  // Test 4: Admin role listing orders with pagination & status filter
  test('4. GET /api/admin/orders with Admin token should return paginated orders list', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/orders?page=1&limit=5`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.orders));
    assert.ok(body.data.pagination);
    assert.strictEqual(body.data.pagination.page, 1);
    assert.strictEqual(body.data.pagination.limit, 5);
  });

  // Test 5: Get single order details including custom 3D specs
  test('5. GET /api/admin/orders/:orderCode returns full order details & items', async () => {
    // Fetch first order from database
    const [rows] = await pool.query('SELECT order_code FROM orders ORDER BY id DESC LIMIT 1');
    assert.ok(rows.length > 0, 'Should have at least 1 order in database');
    const orderCode = rows[0].order_code;

    const res = await fetch(`${BASE_URL}/api/admin/orders/${orderCode}`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.order_code, orderCode);
    assert.ok(Array.isArray(body.data.items));
  });

  // Test 6: Status transition validation - valid transition
  test('6. PATCH /api/admin/orders/:orderCode/status updates status with valid transition', async () => {
    // Create a temporary test order with status 'pending'
    const testCode = `LUM-TEST-${Date.now()}`;
    await pool.query(
      `INSERT INTO orders (
        order_code, user_id, customer_name, customer_email, customer_phone,
        shipping_address, shipping_city, subtotal_amount, total_amount, status
      ) VALUES (?, 'test-user', 'Admin Test', 'admin.test@lumina.vn', '0999999999',
        '123 Test St', 'TP. Hồ Chí Minh', 1000000, 1000000, 'pending')`,
      [testCode]
    );

    // Transition from 'pending' to 'confirmed'
    const res = await fetch(`${BASE_URL}/api/admin/orders/${testCode}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ status: 'confirmed' }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'confirmed');

    // Clean up test order
    await pool.query('DELETE FROM orders WHERE order_code = ?', [testCode]);
  });

  // Test 7: Status transition validation - invalid transition rejected
  test('7. PATCH /api/admin/orders/:orderCode/status rejects invalid transitions (e.g. cancelled -> confirmed)', async () => {
    const testCode = `LUM-CANCEL-${Date.now()}`;
    await pool.query(
      `INSERT INTO orders (
        order_code, user_id, customer_name, customer_email, customer_phone,
        shipping_address, shipping_city, subtotal_amount, total_amount, status
      ) VALUES (?, 'test-user', 'Admin Cancel Test', 'cancel@lumina.vn', '0999999999',
        '123 Test St', 'TP. Hồ Chí Minh', 1000000, 1000000, 'cancelled')`,
      [testCode]
    );

    // Attempt invalid transition: cancelled -> confirmed
    const res = await fetch(`${BASE_URL}/api/admin/orders/${testCode}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ status: 'confirmed' }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'BAD_REQUEST');

    // Clean up
    await pool.query('DELETE FROM orders WHERE order_code = ?', [testCode]);
  });

  // Test 8: Get products inventory list from MySQL
  test('8. GET /api/admin/products returns MySQL product catalog with stock levels', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/products`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
    assert.ok(typeof body.data[0].stock === 'number');
  });

  // Test 9: Update product stock rejects negative values
  test('9. PATCH /api/admin/products/:id rejects negative stock values', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/products/lumina-01`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ stock: -5 }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'BAD_REQUEST');
  });

  // Test 10: Update product stock and price successfully
  test('10. PATCH /api/admin/products/:id updates stock and price in MySQL', async () => {
    // Fetch original stock
    const [rows] = await pool.query('SELECT stock, price FROM products WHERE id = "lumina-01"');
    const originalStock = rows[0].stock;
    const originalPrice = parseFloat(rows[0].price);

    const newStock = originalStock + 2;
    const res = await fetch(`${BASE_URL}/api/admin/products/lumina-01`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ stock: newStock }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.stock, newStock);

    // Revert to original stock to preserve seed consistency
    await pool.query('UPDATE products SET stock = ?, price = ? WHERE id = "lumina-01"', [
      originalStock,
      originalPrice,
    ]);
  });
});
