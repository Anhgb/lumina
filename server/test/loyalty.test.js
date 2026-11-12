import { test, suite } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';
import {
  earnPointsForOrder,
  clawbackPointsForOrder,
  getOrCreateAccount,
} from '../src/services/loyalty.service.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const CUSTOMER_A_TOKEN = 'demo-jwt-customer-token-xyz123'; // cust-lumina-01
const CUSTOMER_B_TOKEN = 'demo-jwt-customer2-token-uvw456'; // cust-lumina-02
const ADMIN_TOKEN = 'demo-jwt-admin-token-sec888';

const TEST_ORDER_CODE = 'LUM-LOYALTY-TEST-001';
const TEST_ORDER_UNPAID = 'LUM-LOYALTY-UNPAID-001';
const TEST_ORDER_UNDELIVERED = 'LUM-LOYALTY-UNDELIV-001';

suite('Lumina Membership & Loyalty API Test Suite (Prompt 04)', () => {
  test('0. Setup: Seed test orders for loyalty tests', async () => {
    // Clean up previous test runs if any
    await pool.query(`DELETE FROM loyalty_transactions WHERE source_reference LIKE 'order:LUM-LOYALTY%' OR source_reference LIKE 'refund:LUM-LOYALTY%' OR source_reference LIKE 'manual:ADJ-%'`);
    await pool.query(`DELETE FROM loyalty_redemptions WHERE order_code LIKE 'LUM-LOYALTY%' OR order_code LIKE 'LUM-REDEEM%'`);
    await pool.query(`DELETE FROM order_delivery_events WHERE order_id IN (SELECT id FROM orders WHERE order_code LIKE 'LUM-LOYALTY%')`);
    await pool.query(`DELETE FROM orders WHERE order_code LIKE 'LUM-LOYALTY%'`);

    // Reset customer A loyalty account to clean state
    await pool.query(`DELETE FROM loyalty_transactions WHERE user_id = 'cust-lumina-01'`);
    await pool.query(`DELETE FROM loyalty_redemptions WHERE user_id = 'cust-lumina-01'`);
    await pool.query(`UPDATE loyalty_accounts SET available_points = 0, lifetime_points = 0, current_tier = 'member' WHERE user_id = 'cust-lumina-01'`);

    // 1. Fully eligible order: Paid + Delivered + 2,500,000 VND (should yield 25 points)
    const [res1] = await pool.query(
      `INSERT INTO orders 
        (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, payment_method, subtotal_amount, total_amount, payment_status, status)
       VALUES (?, 'cust-lumina-01', 'Nguyễn Minh Anh', 'minhanh.nguyen@lumina.vn', '0901234567', 'Bitexco', 'TP.HCM', 'vnpay', 2500000, 2500000, 'paid', 'confirmed')`,
      [TEST_ORDER_CODE]
    );
    const orderId1 = res1.insertId;

    // Delivery event for order 1 (delivered 10 days ago -> grace period passed)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO order_delivery_events (order_id, carrier_name, tracking_code, delivered_at, confirmed_by, confirmed_by_id)
       VALUES (?, 'GHTK', 'GHTK-LOYALTY-01', ?, 'admin', 'admin-lumina-01')`,
      [orderId1, tenDaysAgo]
    );

    // 2. Unpaid order
    await pool.query(
      `INSERT INTO orders 
        (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, payment_method, subtotal_amount, total_amount, payment_status, status)
       VALUES (?, 'cust-lumina-01', 'Nguyễn Minh Anh', 'minhanh.nguyen@lumina.vn', '0901234567', 'Bitexco', 'TP.HCM', 'cod', 1500000, 1500000, 'unpaid', 'confirmed')`,
      [TEST_ORDER_UNPAID]
    );

    // 3. Undelivered order (Paid but not yet delivered)
    await pool.query(
      `INSERT INTO orders 
        (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, payment_method, subtotal_amount, total_amount, payment_status, status)
       VALUES (?, 'cust-lumina-01', 'Nguyễn Minh Anh', 'minhanh.nguyen@lumina.vn', '0901234567', 'Bitexco', 'TP.HCM', 'vnpay', 1800000, 1800000, 'paid', 'confirmed')`,
      [TEST_ORDER_UNDELIVERED]
    );
  });

  test('1. GET /api/loyalty/tiers returns active tiers and rules', async () => {
    const res = await fetch(`${BASE_URL}/api/loyalty/tiers`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.tiers));
    assert.ok(body.data.tiers.length >= 4);

    const tierCodes = body.data.tiers.map((t) => t.tier_code);
    assert.ok(tierCodes.includes('member'));
    assert.ok(tierCodes.includes('silver'));
    assert.ok(tierCodes.includes('gold'));
    assert.ok(tierCodes.includes('diamond'));

    assert.equal(body.data.rules.earnRatePercent, 1.0);
    assert.equal(body.data.rules.redemptionRateVnd, 1000);
    assert.equal(body.data.rules.maxRedemptionPercent, 20.0);
  });

  test('2. GET /api/me/loyalty without token returns 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/me/loyalty`);
    assert.equal(res.status, 401);
  });

  test('3. GET /api/me/loyalty with Customer token returns overview & tier progress', async () => {
    const res = await fetch(`${BASE_URL}/api/me/loyalty`, {
      headers: { Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.account.userId, 'cust-lumina-01');
    assert.equal(body.data.account.currentTier, 'member');
    assert.equal(body.data.tier.code, 'member');
    assert.ok(body.data.tier.nextTier);
    assert.equal(body.data.tier.nextTier.code, 'silver');
    assert.equal(body.data.tier.nextTier.minPoints, 50);
  });

  test('4. Eligibility: Unpaid order cannot earn points', async () => {
    const result = await earnPointsForOrder(TEST_ORDER_UNPAID);
    assert.equal(result.earned, false);
    assert.equal(result.points, 0);
    assert.ok(result.reason.includes('chưa hoàn tất thanh toán'));
  });

  test('5. Eligibility: Undelivered order cannot earn points', async () => {
    const result = await earnPointsForOrder(TEST_ORDER_UNDELIVERED);
    assert.equal(result.earned, false);
    assert.equal(result.points, 0);
    assert.ok(result.reason.includes('chưa có bằng chứng giao hàng thành công'));
  });

  test('6. Idempotency: Earning points multiple times never double-credits', async () => {
    // Run 1: Should earn 25 points (2,500,000 VND / 100,000 = 25 pts)
    const run1 = await earnPointsForOrder(TEST_ORDER_CODE);
    assert.equal(run1.earned, true);
    assert.equal(run1.points, 25);
    assert.equal(run1.balanceAfter, 25);

    // Verify account balance in DB
    const account1 = await getOrCreateAccount('cust-lumina-01');
    assert.equal(account1.available_points, 25);
    assert.equal(account1.lifetime_points, 25);

    // Run 2: Same order code again -> MUST be idempotent
    const run2 = await earnPointsForOrder(TEST_ORDER_CODE);
    assert.equal(run2.earned, false);
    assert.equal(run2.alreadyCredited, true);

    // Balance in DB must remain exactly 25
    const account2 = await getOrCreateAccount('cust-lumina-01');
    assert.equal(account2.available_points, 25);
    assert.equal(account2.lifetime_points, 25);

    // Verify ledger has exactly 1 transaction for this order
    const [txRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM loyalty_transactions WHERE source_reference = ?`,
      [`order:${TEST_ORDER_CODE}`]
    );
    assert.equal(txRows[0].count, 1);
  });

  test('7. Customer views transactions and sees earned points in ledger', async () => {
    const res = await fetch(`${BASE_URL}/api/me/loyalty/transactions`, {
      headers: { Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.transactions.length >= 1);

    const firstTx = body.data.transactions[0];
    assert.equal(firstTx.type, 'earn');
    assert.equal(firstTx.points, 25);
    assert.equal(firstTx.orderCode, TEST_ORDER_CODE);
  });

  test('8. Redemption: Validates 20% order cap and minimum 10 points', async () => {
    // Attempt to redeem < 10 points
    const resMin = await fetch(`${BASE_URL}/api/me/loyalty/redeem-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
      body: JSON.stringify({ points: 5, orderAmount: 500000 }),
    });
    const bodyMin = await resMin.json();
    assert.equal(bodyMin.data.isValid, false);
    assert.ok(bodyMin.data.reasons.some((r) => r.includes('tối thiểu 10 điểm')));

    // Attempt to redeem exceeding 20% cap: 25 points = 25,000 VND discount, on 100,000 VND order (max 20k = 20 pts)
    const resCap = await fetch(`${BASE_URL}/api/me/loyalty/redeem-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
      body: JSON.stringify({ points: 25, orderAmount: 100000 }),
    });
    const bodyCap = await resCap.json();
    assert.equal(bodyCap.data.isValid, false);
    assert.ok(bodyCap.data.reasons.some((r) => r.includes('Vượt quá 20%')));

    // Valid preview: 15 points (15,000 VND) on 200,000 VND order (20% cap = 40,000 VND)
    const resValid = await fetch(`${BASE_URL}/api/me/loyalty/redeem-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
      body: JSON.stringify({ points: 15, orderAmount: 200000 }),
    });
    const bodyValid = await resValid.json();
    assert.equal(resValid.status, 200);
    assert.equal(bodyValid.data.isValid, true);
    assert.equal(bodyValid.data.discountAmount, 15000);
  });

  test('9. Redemption: Atomically deducts available_points and leaves lifetime_points intact', async () => {
    // Current available: 25. Redeem 15 points on a 200,000 order.
    const res = await fetch(`${BASE_URL}/api/me/loyalty/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
      body: JSON.stringify({ points: 15, orderAmount: 200000, orderCode: 'LUM-REDEEM-TEST-001' }),
    });
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.pointsSpent, 15);
    assert.equal(body.data.discountAmount, 15000);
    assert.equal(body.data.remainingPoints, 10);

    // Verify DB
    const account = await getOrCreateAccount('cust-lumina-01');
    assert.equal(account.available_points, 10);
    assert.equal(account.lifetime_points, 25); // Lifetime points NOT reduced on redemption!
  });

  test('10. Redemption: Fails with 400 when attempting to redeem exceeding balance', async () => {
    // Only 10 points left, trying to redeem 20 points
    const res = await fetch(`${BASE_URL}/api/me/loyalty/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
      body: JSON.stringify({ points: 20, orderAmount: 500000, orderCode: 'LUM-EXCEED-001' }),
    });
    const body = await res.json();

    assert.equal(res.status, 400);
    assert.ok(body.message.includes('không đủ'));
  });

  test('11. Refund clawback: Reverses points without negative balance', async () => {
    // Original earn was 25 points, but customer already spent 15, so only 10 points left in available
    // Clawback should deduct Math.min(10, 25) = 10, leaving 0 (never negative)
    const clawback = await clawbackPointsForOrder(TEST_ORDER_CODE, {
      reason: 'Khách hàng đổi trả kính',
      adminId: 'admin-lumina-01',
    });

    assert.equal(clawback.clawedBack, true);
    assert.equal(clawback.deductedPoints, 10);
    assert.equal(clawback.uncollectedPoints, 15); // 15 points were already spent and need cash offset!
    assert.equal(clawback.balanceAfter, 0);

    // Second clawback must be idempotent
    const clawback2 = await clawbackPointsForOrder(TEST_ORDER_CODE);
    assert.equal(clawback2.clawedBack, false);
    assert.equal(clawback2.alreadyClawedBack, true);
  });

  test('12. Admin manual adjustment requires mandatory reason and logs audit', async () => {
    // Customer cannot adjust (403)
    const resForbidden = await fetch(`${BASE_URL}/api/admin/loyalty/accounts/cust-lumina-01/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
      body: JSON.stringify({ points: 50, reason: 'Tặng điểm' }),
    });
    assert.equal(resForbidden.status, 403);

    // Admin without reason is rejected (400)
    const resNoReason = await fetch(`${BASE_URL}/api/admin/loyalty/accounts/cust-lumina-01/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ points: 50, reason: '' }),
    });
    assert.equal(resNoReason.status, 400);

    // Admin adds 60 points with valid reason -> upgrades customer to Silver tier (>= 50 pts)
    const resSuccess = await fetch(`${BASE_URL}/api/admin/loyalty/accounts/cust-lumina-01/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ points: 60, reason: 'Tặng điểm tri ân khách hàng thân thiết nhân dịp khai trương Atelier' }),
    });
    const bodySuccess = await resSuccess.json();

    assert.equal(resSuccess.status, 200);
    assert.equal(bodySuccess.success, true);
    assert.equal(bodySuccess.data.pointsAdjusted, 60);
    assert.equal(bodySuccess.data.balanceAfter, 60);
    assert.equal(bodySuccess.data.currentTier, 'silver');
  });

  test('13. Admin can list accounts, view member detail, ledger, and configuration', async () => {
    // 1. Accounts list
    const resAccounts = await fetch(`${BASE_URL}/api/admin/loyalty/accounts`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const bodyAccounts = await resAccounts.json();
    assert.equal(resAccounts.status, 200);
    assert.ok(bodyAccounts.data.accounts.length >= 1);

    // 2. Account detail
    const resDetail = await fetch(`${BASE_URL}/api/admin/loyalty/accounts/cust-lumina-01`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const bodyDetail = await resDetail.json();
    assert.equal(resDetail.status, 200);
    assert.equal(bodyDetail.data.account.userId, 'cust-lumina-01');
    assert.ok(bodyDetail.data.transactions.length >= 3);

    // 3. Global ledger
    const resLedger = await fetch(`${BASE_URL}/api/admin/loyalty/ledger`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const bodyLedger = await resLedger.json();
    assert.equal(resLedger.status, 200);
    assert.ok(bodyLedger.data.ledger.length >= 3);

    // 4. Config
    const resConfig = await fetch(`${BASE_URL}/api/admin/loyalty/config`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const bodyConfig = await resConfig.json();
    assert.equal(resConfig.status, 200);
    assert.ok(bodyConfig.data.tiers.length >= 4);
    assert.ok(bodyConfig.data.rules.length >= 2);
  });
});
