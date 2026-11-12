import { after, suite, test } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';
import { getPaymentProvider } from '../src/services/paymentProvider.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const CUSTOMER_TOKEN = 'demo-jwt-customer-token-xyz123';
const OTHER_CUSTOMER_TOKEN = 'demo-jwt-customer2-token-uvw456';
const ADMIN_TOKEN = 'demo-jwt-admin-token-sec888';
const testRunId = Date.now();
const orderCodes = [`LUM-PAY-${testRunId}`, `LUM-COD-${testRunId}`, `LUM-FAIL-${testRunId}`];
let bankingPaymentCode;

async function createOrder(orderCode, paymentMethod) {
  await pool.query(
    `INSERT INTO orders (
      order_code, user_id, customer_name, customer_email, customer_phone,
      shipping_address, shipping_city, payment_method, subtotal_amount, total_amount,
      payment_status, status
    ) VALUES (?, 'cust-lumina-01', 'Payment Test', 'payment.test@lumina.vn', '0900000000',
      '123 Test Street', 'TP. Hồ Chí Minh', ?, 123456, 123456, 'unpaid', 'confirmed')`,
    [orderCode, paymentMethod]
  );
}

after(async () => {
  for (const orderCode of orderCodes) {
    await pool.query(
      `DELETE p FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.order_code = ?`,
      [orderCode]
    );
    await pool.query('DELETE FROM orders WHERE order_code = ?', [orderCode]);
  }
  await pool.end();
});

suite('Payment Management API', () => {
  test('guest cannot initiate and owner initiates with server amount and pending state', async () => {
    await createOrder(orderCodes[0], 'banking');

    const guest = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderCode: orderCodes[0], idempotencyKey: 'guest-request-01' }),
    });
    assert.equal(guest.status, 401);

    const created = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({
        orderCode: orderCodes[0],
        idempotencyKey: 'payment-request-01',
        amount: 1,
        payment_status: 'paid',
      }),
    });
    assert.equal(created.status, 200);
    const body = await created.json();
    assert.equal(body.data.status, 'pending');
    assert.equal(body.data.amount, 123456);
    assert.ok(body.data.paymentCode.startsWith('PAY-'));
    bankingPaymentCode = body.data.paymentCode;

    const [rows] = await pool.query(
      'SELECT payment_status, total_amount FROM orders WHERE order_code = ?',
      [orderCodes[0]]
    );
    assert.equal(rows[0].payment_status, 'pending');
    assert.equal(Number(rows[0].total_amount), 123456);
  });

  test('idempotency returns the same attempt and another customer cannot read it', async () => {
    const repeated = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({ orderCode: orderCodes[0], idempotencyKey: 'payment-request-01' }),
    });
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).data.paymentCode, bankingPaymentCode);

    const [count] = await pool.query('SELECT COUNT(*) AS attempts FROM payments WHERE order_id = (SELECT id FROM orders WHERE order_code = ?)', [orderCodes[0]]);
    assert.equal(Number(count[0].attempts), 1);

    const forbidden = await fetch(`${BASE_URL}/api/payments/${bankingPaymentCode}/status`, {
      headers: { Authorization: `Bearer ${OTHER_CUSTOMER_TOKEN}` },
    });
    assert.equal(forbidden.status, 403);

    const forgedDemoToken = await fetch(`${BASE_URL}/api/payments/${bankingPaymentCode}/status`, {
      headers: { Authorization: 'Bearer demo-jwt-customer-forged' },
    });
    assert.equal(forgedDemoToken.status, 401);

    const owner = await fetch(`${BASE_URL}/api/payments/${bankingPaymentCode}/status`, {
      headers: { Authorization: `Bearer ${CUSTOMER_TOKEN}` },
    });
    assert.equal(owner.status, 200);
    assert.equal((await owner.json()).data.status, 'pending');
  });

  test('mock webhook cannot claim a bank transfer succeeded', async () => {
    const response = await fetch(`${BASE_URL}/api/payments/webhook/mock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentCode: bankingPaymentCode, status: 'paid', amount: 123456 }),
    });
    assert.equal(response.status, 401);
  });

  test('Admin can record one manual reconciliation with evidence; duplicate paid is rejected', async () => {
    const response = await fetch(`${BASE_URL}/api/admin/orders/${orderCodes[0]}/payment-reconciliation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ outcome: 'paid', reference: 'BANK-REF-20261026', note: 'Đã đối chiếu tiền vào tài khoản.' }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.paymentStatus, 'paid');

    const duplicate = await fetch(`${BASE_URL}/api/admin/orders/${orderCodes[0]}/payment-reconciliation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ outcome: 'paid', reference: 'BANK-REF-SECOND', note: 'Đối soát lặp.' }),
    });
    assert.equal(duplicate.status, 409);

    const [rows] = await pool.query('SELECT payment_status, status FROM orders WHERE order_code = ?', [orderCodes[0]]);
    assert.equal(rows[0].payment_status, 'paid');
    assert.equal(rows[0].status, 'confirmed');
  });

  test('COD stays unpaid until Admin records cash collection; Customer cannot reconcile', async () => {
    await createOrder(orderCodes[1], 'cod');
    const [before] = await pool.query('SELECT payment_status FROM orders WHERE order_code = ?', [orderCodes[1]]);
    assert.equal(before[0].payment_status, 'unpaid');

    const customerAttempt = await fetch(`${BASE_URL}/api/admin/orders/${orderCodes[1]}/payment-reconciliation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({ outcome: 'paid', reference: 'COD-REF-1234', note: 'Đã thu tiền COD.' }),
    });
    assert.equal(customerAttempt.status, 403);

    const initiate = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({ orderCode: orderCodes[1], idempotencyKey: 'cod-request-0001' }),
    });
    assert.equal(initiate.status, 400);

    const collected = await fetch(`${BASE_URL}/api/admin/orders/${orderCodes[1]}/payment-reconciliation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ outcome: 'paid', reference: 'COD-REF-1234', note: 'Nhân viên xác nhận đã thu COD.' }),
    });
    assert.equal(collected.status, 200);
    assert.equal((await collected.json()).data.paymentStatus, 'paid');
  });

  test('failed attempts stay unpaid and an explicit retry creates a new pending attempt', async () => {
    await createOrder(orderCodes[2], 'banking');
    const initial = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({ orderCode: orderCodes[2], idempotencyKey: 'failed-attempt-0001' }),
    });
    assert.equal(initial.status, 200);
    const initialBody = await initial.json();

    const failed = await fetch(`${BASE_URL}/api/admin/orders/${orderCodes[2]}/payment-reconciliation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ outcome: 'failed', note: 'Không thấy tiền vào tài khoản.' }),
    });
    assert.equal(failed.status, 200);
    assert.equal((await failed.json()).data.paymentStatus, 'failed');

    const retry = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({ orderCode: orderCodes[2], idempotencyKey: 'failed-retry-0002' }),
    });
    assert.equal(retry.status, 200);
    const retryBody = await retry.json();
    assert.equal(retryBody.data.status, 'pending');
    assert.notEqual(retryBody.data.paymentCode, initialBody.data.paymentCode);

    const [orders] = await pool.query('SELECT payment_status FROM orders WHERE order_code = ?', [orderCodes[2]]);
    assert.equal(orders[0].payment_status, 'pending');
    const [attempts] = await pool.query(
      'SELECT status FROM payments WHERE order_id = (SELECT id FROM orders WHERE order_code = ?) ORDER BY id',
      [orderCodes[2]]
    );
    assert.deepEqual(attempts.map((attempt) => attempt.status), ['failed', 'pending']);
  });

  test('mock provider is unavailable outside demo and in production', () => {
    const previousDemoMode = process.env.DEMO_MODE;
    const previousNodeEnv = process.env.NODE_ENV;
    try {
      process.env.DEMO_MODE = 'false';
      assert.throws(() => getPaymentProvider(), { code: 'PAYMENT_PROVIDER_UNAVAILABLE' });
      process.env.DEMO_MODE = 'true';
      process.env.NODE_ENV = 'production';
      assert.throws(() => getPaymentProvider(), { code: 'PAYMENT_PROVIDER_UNAVAILABLE' });
    } finally {
      if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
      else process.env.DEMO_MODE = previousDemoMode;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
