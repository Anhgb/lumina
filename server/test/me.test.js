import { test, suite, after } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const CUSTOMER_A_TOKEN = 'demo-jwt-customer-token-xyz123'; // cust-lumina-01
const CUSTOMER_B_TOKEN = 'demo-jwt-customer2-token-uvw456'; // cust-lumina-02
const ADMIN_TOKEN = 'demo-jwt-admin-token-sec888';

suite('My Lumina Customer Portal API Test Suite (Prompt 02)', () => {
  let customerAOrderCode = null;

  // Setup: create a test order for Customer A if needed
  test('0. Setup: Ensure an order exists for Customer A', async () => {
    // Check if Customer A has any order
    const [rows] = await pool.query(
      'SELECT order_code FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      ['cust-lumina-01']
    );

    if (rows.length > 0) {
      customerAOrderCode = rows[0].order_code;
    } else {
      // Insert a test order
      customerAOrderCode = `LUM-TEST-${Date.now()}`;
      const [orderResult] = await pool.query(
        `INSERT INTO orders (
          order_code, user_id, customer_name, customer_email, customer_phone,
          shipping_address, shipping_city, subtotal_amount, total_amount,
          payment_method, payment_status, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1500000, 1500000, 'cod', 'unpaid', 'confirmed')`,
        [
          customerAOrderCode,
          'cust-lumina-01',
          'Nguyễn Minh Anh',
          'minhanh.nguyen@lumina.vn',
          '0901234567',
          '123 Lê Lợi',
          'Hồ Chí Minh',
        ]
      );

      // Insert an order item with custom spec
      const [itemResult] = await pool.query(
        `INSERT INTO order_items (
          order_id, product_id, product_type, product_name, quantity, unit_price, subtotal
        ) VALUES (?, 'custom-aviator', 'custom', 'Lumina Bespoke Aviator', 1, 1500000, 1500000)`,
        [orderResult.insertId]
      );

      await pool.query(
        `INSERT INTO custom_specs (
          order_item_id, base_model, frame_type, frame_color, metalness, roughness,
          lens_color, lens_opacity, temple_style, engraving_text, engraving_placement
        ) VALUES (?, 'aviator', 'acetate', '#D4AF37', 0.9, 0.2, '#1F2937', 0.45, 'classic-acetate', 'LUMINA', 'outer_temple')`,
        [itemResult.insertId]
      );
    }

    assert.ok(customerAOrderCode, 'Customer A test order code should exist');
  });

  // Test 1: Guest request to /api/me/profile without token returns 401
  test('1. GET /api/me/profile without token should return 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/me/profile`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  // Test 2: Admin requesting /api/me/profile is rejected with 403 Forbidden
  test('2. GET /api/me/profile with Admin token should return 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/me/profile`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'FORBIDDEN');
  });

  // Test 3: Customer A requests /api/me/profile returns 200 and real statistics
  test('3. GET /api/me/profile with Customer A token should return 200 and customer profile', async () => {
    const res = await fetch(`${BASE_URL}/api/me/profile`, {
      headers: {
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.id, 'cust-lumina-01');
    assert.ok(typeof body.data.stats.totalOrders === 'number');
    assert.ok(typeof body.data.loyalty.points === 'number');
    assert.ok(body.data.loyalty.tier);
  });

  // Test 4: Customer A requests /api/me/orders returns paginated orders
  test('4. GET /api/me/orders with Customer A token should return customer orders list', async () => {
    const res = await fetch(`${BASE_URL}/api/me/orders?page=1&limit=5`, {
      headers: {
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.pagination);
    assert.strictEqual(body.pagination.page, 1);
  });

  // Test 5: Customer A looks up their own order by code returns 200 OK
  test('5. GET /api/me/orders/:orderCode for Customer A own order returns 200 OK', async () => {
    const res = await fetch(`${BASE_URL}/api/me/orders/${customerAOrderCode}`, {
      headers: {
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.orderCode, customerAOrderCode);
    assert.ok(Array.isArray(body.data.items));
  });

  // Test 6: IDOR Protection: Customer B trying to view Customer A's order receives 403 Forbidden
  test('6. IDOR Protection: Customer B cannot view Customer A order (returns 403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/me/orders/${customerAOrderCode}`, {
      headers: {
        Authorization: `Bearer ${CUSTOMER_B_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'FORBIDDEN');
  });

  // Test 7: Non-existent order code returns 404 Not Found
  test('7. GET /api/me/orders/LUM-NONEXISTENT returns 404 Not Found', async () => {
    const res = await fetch(`${BASE_URL}/api/me/orders/LUM-NONEXISTENT`, {
      headers: {
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'NOT_FOUND');
  });

  // Test 8: Customer A requests /api/me/designs returns bespoke collection
  test('8. GET /api/me/designs returns customer bespoke 3D eyewear collection', async () => {
    const res = await fetch(`${BASE_URL}/api/me/designs`, {
      headers: {
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    if (body.data.length > 0) {
      assert.ok(body.data[0].designSpec);
      assert.ok(body.data[0].designSpec.baseModel);
    }
  });
});

