import { after, test, describe } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const createdOrderCodes = [];
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

after(async () => {
  if (createdOrderCodes.length === 0) return;

  const placeholders = createdOrderCodes.map(() => '?').join(', ');
  const connection = await pool.getConnection();
  let snapshotPaths = [];
  try {
    await connection.beginTransaction();
    const [catalogItems] = await connection.query(
      `SELECT oi.product_id, oi.quantity
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.order_code IN (${placeholders}) AND oi.product_type = ?`,
      [...createdOrderCodes, 'catalog']
    );
    const [snapshots] = await connection.query(
      `SELECT cs.snapshot_path
       FROM custom_specs cs
       JOIN order_items oi ON oi.id = cs.order_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.order_code IN (${placeholders}) AND cs.snapshot_path IS NOT NULL`,
      createdOrderCodes
    );
    snapshotPaths = snapshots.map((row) => row.snapshot_path);

    for (const item of catalogItems) {
      await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [
        item.quantity,
        item.product_id,
      ]);
    }
    await connection.query(`DELETE FROM orders WHERE order_code IN (${placeholders})`, createdOrderCodes);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const snapshotsDir = path.resolve(SERVER_ROOT, 'uploads', 'snapshots');
  for (const snapshotPath of snapshotPaths) {
    const filePath = path.resolve(snapshotsDir, path.basename(snapshotPath));
    if (path.dirname(filePath) === snapshotsDir) {
      await fs.unlink(filePath).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
  }
});

describe('Lumina Eyewear Backend API & Checkout Test Suite', () => {

  // Test 1: Health check
  test('1. GET /api/health should return 200 and healthy status', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
    assert.strictEqual(body.database.connected, true);
  });

  // Test 2: Unauthenticated checkout is rejected
  test('2. POST /api/orders/checkout without token should return 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Test' },
        items: [],
      }),
    });
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  // Test 3: Admin role forbidden from checkout
  test('3. POST /api/orders/checkout with Admin token should return 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-jwt-admin-token-sec888',
      },
      body: JSON.stringify({
        customer: {
          name: 'Admin Test',
          email: 'admin@lumina.vn',
          phone: '0901234567',
          address: '123 Le Loi',
          city: 'TP. HCM',
        },
        items: [{ productId: 'lumina-01', quantity: 1 }],
      }),
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'FORBIDDEN');
    assert.ok(body.message.includes('Quản trị viên'));
  });

  // Test 4: Validation error on malformed payload
  test('4. POST /api/orders/checkout with missing phone/email should return 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-jwt-customer-token-xyz123',
      },
      body: JSON.stringify({
        customer: {
          name: 'N',
          email: 'invalid-email',
          phone: '',
          address: 'abc',
          city: '',
        },
        items: [],
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'BAD_REQUEST');
  });

  // Test 5: Price tampering protection (Server enforces authoritative price)
  test('5. POST /api/orders/checkout ignores client price tampering and uses MySQL price', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-jwt-customer-token-xyz123',
      },
      body: JSON.stringify({
        customer: {
          name: 'Nguyễn Minh Anh',
          email: 'minhanh.nguyen@lumina.vn',
          phone: '0901234567',
          address: 'Tầng 18, Toà nhà Bitexco, 2 Hải Triều',
          city: 'TP. Hồ Chí Minh',
        },
        items: [
          {
            productId: 'lumina-01',
            quantity: 1,
            // Tampered client price: attempts to buy for 100 VND instead of 3,250,000 VND
            price: 100,
            subtotal: 100,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    createdOrderCodes.push(body.data.orderCode);
    // Server must have computed 3,250,000 VND!
    assert.strictEqual(body.data.totalAmount, 3250000);
    assert.ok(body.data.orderCode.startsWith('LUM-'));
  });

  // Test 6: Custom 3D Bespoke eyewear checkout with snapshot saving
  test('6. POST /api/orders/checkout with 3D Bespoke design saves specs and snapshot', async () => {
    // 1x1 transparent PNG base64
    const sampleSnapshotBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-jwt-customer-token-xyz123',
      },
      body: JSON.stringify({
        customer: {
          name: 'Nguyễn Minh Anh',
          email: 'minhanh.nguyen@lumina.vn',
          phone: '0901234567',
          address: 'Tầng 18, Toà nhà Bitexco, 2 Hải Triều',
          city: 'TP. Hồ Chí Minh',
        },
        items: [
          {
            productType: 'custom',
            name: 'Lumina Bespoke 3D (Aviator)',
            quantity: 1,
            designSpec: {
              baseModel: 'aviator',
              frameColor: '#D4AF37', // +400k
              lensColor: '#1F2937',
              lensOpacity: 0.45,
              hasRhinestones: true, // +450k
              charms: ['lumina-star'], // +200k
              engravingText: 'VIP', // +150k
            },
            snapshotDataUrl: sampleSnapshotBase64,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    createdOrderCodes.push(body.data.orderCode);
    // 2450k + 400k + 450k + 200k + 150k = 3,650,000 VND
    assert.strictEqual(body.data.totalAmount, 3650000);

    // Verify record in database
    const [rows] = await pool.query(
      `SELECT cs.* FROM custom_specs cs
       JOIN order_items oi ON cs.order_item_id = oi.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.order_code = ?`,
      [body.data.orderCode]
    );

    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].base_model, 'aviator');
    assert.strictEqual(rows[0].engraving_text, 'VIP');
    assert.ok(rows[0].snapshot_path.includes('/uploads/snapshots/snap-'));
  });

  test('7. POST /api/orders/checkout accepts a Trending 2026 preset at its server price', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-jwt-customer-token-xyz123',
      },
      body: JSON.stringify({
        customer: {
          name: 'Nguyễn Minh Anh',
          email: 'minhanh.nguyen@lumina.vn',
          phone: '0901234567',
          address: 'Tầng 18, Toà nhà Bitexco, 2 Hải Triều',
          city: 'TP. Hồ Chí Minh',
        },
        items: [{
          productType: 'custom',
          productId: 'bespoke-modern-pilot',
          quantity: 1,
          designSpec: {
            baseModel: 'modern-pilot',
            frameColor: '#141413',
            lensColor: '#1F2937',
            lensOpacity: 0.45,
            hasRhinestones: false,
            charms: [],
            engravingText: '',
          },
          price: 1,
        }],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.totalAmount, 2650000);
    createdOrderCodes.push(body.data.orderCode);
  });

  test('8. POST /api/orders/checkout rejects unknown custom frame models', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-jwt-customer-token-xyz123',
      },
      body: JSON.stringify({
        customer: {
          name: 'Nguyễn Minh Anh',
          email: 'minhanh.nguyen@lumina.vn',
          phone: '0901234567',
          address: 'Tầng 18, Toà nhà Bitexco, 2 Hải Triều',
          city: 'TP. Hồ Chí Minh',
        },
        items: [{
          productType: 'custom',
          productId: 'bespoke-unknown-frame',
          quantity: 1,
          designSpec: { baseModel: 'unknown-frame', lensOpacity: 0.45, charms: [] },
        }],
      }),
    });

    assert.equal(res.status, 400);
    assert.equal((await res.json()).code, 'BAD_REQUEST');
  });

  // Test 9: Insufficient stock returns 409 Conflict
  test('9. POST /api/orders/checkout with quantity > stock should return 409 Conflict', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-jwt-customer-token-xyz123',
      },
      body: JSON.stringify({
        customer: {
          name: 'Nguyễn Minh Anh',
          email: 'minhanh.nguyen@lumina.vn',
          phone: '0901234567',
          address: 'Tầng 18, Toà nhà Bitexco, 2 Hải Triều',
          city: 'TP. Hồ Chí Minh',
        },
        items: [
          {
            productId: 'lumina-07',
            quantity: 99, // Stock is only 4
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.code, 'CONFLICT');
    assert.ok(body.message.includes('tồn kho'));
  });

  // Test 10: CYL without AXIS is rejected with 400 Bad Request
  test('10. POST /api/orders/checkout with CYL != 0 but invalid AXIS should return 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-jwt-customer-token-xyz123',
      },
      body: JSON.stringify({
        customer: {
          name: 'Nguyễn Minh Anh',
          email: 'minhanh.nguyen@lumina.vn',
          phone: '0901234567',
          address: 'Tầng 18, Toà nhà Bitexco, 2 Hải Triều',
          city: 'TP. Hồ Chí Minh',
        },
        items: [
          {
            productId: 'lumina-02',
            quantity: 1,
            prescription: {
              od: { sph: -2.0, cyl: -1.0, axis: null }, // CYL is set but AXIS is missing!
              os: { sph: -2.0, cyl: 0, axis: 0 },
              pd: 63,
            },
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'BAD_REQUEST');
    assert.ok(JSON.stringify(body).includes('AXIS') || JSON.stringify(body).includes('trục loạn'));
  });

  // Test 11: IDOR protection - Customer cannot view another Customer's order
  test('11. GET /api/orders/:orderCode should return 403 Forbidden when requested by another Customer', async () => {
    // 1. Create an order with Customer 1
    const createRes = await fetch(`${BASE_URL}/api/orders/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-jwt-customer-token-xyz123',
      },
      body: JSON.stringify({
        customer: {
          name: 'Nguyễn Minh Anh',
          email: 'minhanh.nguyen@lumina.vn',
          phone: '0901234567',
          address: 'Tầng 18, Toà nhà Bitexco, 2 Hải Triều',
          city: 'TP. Hồ Chí Minh',
        },
        items: [{ productId: 'lumina-02', quantity: 1 }],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const createBody = await createRes.json();
    const orderCode = createBody.data.orderCode;
    createdOrderCodes.push(orderCode);

    // 2. Attempt to fetch order with Customer 2 (different userId: cust-lumina-02)
    const viewResOtherCust = await fetch(`${BASE_URL}/api/orders/${orderCode}`, {
      headers: {
        Authorization: 'Bearer demo-jwt-customer2-token-uvw456',
      },
    });
    assert.strictEqual(viewResOtherCust.status, 403);
    const viewBodyOtherCust = await viewResOtherCust.json();
    assert.strictEqual(viewBodyOtherCust.code, 'FORBIDDEN');
    assert.ok(viewBodyOtherCust.message.includes('không có quyền truy cập'));

    // 3. Owner (Customer 1) can fetch successfully
    const viewResOwner = await fetch(`${BASE_URL}/api/orders/${orderCode}`, {
      headers: {
        Authorization: 'Bearer demo-jwt-customer-token-xyz123',
      },
    });
    assert.strictEqual(viewResOwner.status, 200);
    const viewBodyOwner = await viewResOwner.json();
    assert.strictEqual(viewBodyOwner.data.order_code, orderCode);

    // 4. Admin can also access for management purposes
    const viewResAdmin = await fetch(`${BASE_URL}/api/orders/${orderCode}`, {
      headers: {
        Authorization: 'Bearer demo-jwt-admin-token-sec888',
      },
    });
    assert.strictEqual(viewResAdmin.status, 200);
  });
});
