import { test, suite } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';
import {
  checkReviewEligibility,
  createReview,
  getProductReviews,
  getProductRatingSummary,
  adminModerateReview,
} from '../src/services/review.service.js';
import {
  getOrCreateReferralCode,
  attributeReferral,
  processQualifiedReferral,
} from '../src/services/referral.service.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const CUSTOMER_A_TOKEN = 'demo-jwt-customer-token-xyz123'; // cust-lumina-01
const CUSTOMER_B_TOKEN = 'demo-jwt-customer2-token-uvw456'; // cust-lumina-02
const ADMIN_TOKEN = 'demo-jwt-admin-token-sec888';

const TEST_PRODUCT_ID = 9999;
let testOrderIdA = null;
let testOrderIdUndelivered = null;
let testOrderIdReferral = null;
let createdReviewId = null;

suite('Lumina Product Reviews & Referral Program API Test Suite (Prompt 05)', () => {
  test('0. Setup: Seed test product, orders, and clean tables', async () => {
    // Clean up previous test entries
    await pool.query(`DELETE FROM review_moderation_events WHERE review_id IN (SELECT id FROM product_reviews WHERE product_id = ?)`, [TEST_PRODUCT_ID]);
    await pool.query(`DELETE FROM product_reviews WHERE product_id = ?`, [TEST_PRODUCT_ID]);
    await pool.query(`DELETE FROM referral_rewards WHERE recipient_user_id IN ('cust-lumina-01', 'cust-lumina-02', 'cust-lumina-ref-new')`);
    await pool.query(`DELETE FROM referral_attributions WHERE referrer_user_id = 'cust-lumina-01' OR referred_user_id IN ('cust-lumina-02', 'cust-lumina-ref-new')`);
    await pool.query(`DELETE FROM referral_codes WHERE referrer_user_id = 'cust-lumina-01'`);
    await pool.query(`DELETE FROM order_delivery_events WHERE order_id IN (SELECT id FROM orders WHERE order_code LIKE 'LUM-REV-%')`);
    await pool.query(`DELETE FROM order_items WHERE product_id = ?`, [TEST_PRODUCT_ID]);
    await pool.query(`DELETE FROM orders WHERE order_code LIKE 'LUM-REV-%'`);

    // Reset loyalty accounts for test users
    await pool.query(`UPDATE loyalty_accounts SET available_points = 0, lifetime_points = 0 WHERE user_id IN ('cust-lumina-01', 'cust-lumina-02', 'cust-lumina-ref-new')`);

    // Ensure referral rule is in draft state
    await pool.query(`UPDATE loyalty_rules SET status = 'draft' WHERE rule_code = 'rule_referral_reward'`);

    // Create 1 completed & delivered order for Customer A with TEST_PRODUCT_ID
    const [resA] = await pool.query(
      `INSERT INTO orders 
        (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, payment_method, subtotal_amount, total_amount, payment_status, status)
       VALUES ('LUM-REV-DELIV-01', 'cust-lumina-01', 'Nguyễn Minh Anh', 'minhanh@lumina.vn', '0901234567', 'Bitexco', 'TP.HCM', 'vnpay', 2500000, 2500000, 'paid', 'completed')`
    );
    testOrderIdA = resA.insertId;

    await pool.query(
      `INSERT INTO order_delivery_events (order_id, carrier_name, tracking_code, delivered_at, confirmed_by, confirmed_by_id)
       VALUES (?, 'GHTK', 'GHTK-REV-01', NOW(), 'admin', 'admin-01')`,
      [testOrderIdA]
    );

    await pool.query(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
       VALUES (?, ?, 'Kính Celestial Aviator Test', 1, 2500000, 2500000)`,
      [testOrderIdA, TEST_PRODUCT_ID]
    );

    // Create 1 undelivered processing order for Customer A
    const [resUndeliv] = await pool.query(
      `INSERT INTO orders 
        (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, payment_method, subtotal_amount, total_amount, payment_status, status)
       VALUES ('LUM-REV-UNDELIV-01', 'cust-lumina-01', 'Nguyễn Minh Anh', 'minhanh@lumina.vn', '0901234567', 'Bitexco', 'TP.HCM', 'cod', 1500000, 1500000, 'unpaid', 'processing')`
    );
    testOrderIdUndelivered = resUndeliv.insertId;

    await pool.query(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
       VALUES (?, ?, 'Kính Celestial Aviator Test', 1, 1500000, 1500000)`,
      [testOrderIdUndelivered, TEST_PRODUCT_ID]
    );

    assert.ok(testOrderIdA, 'Delivered order created');
    assert.ok(testOrderIdUndelivered, 'Undelivered order created');
  });

  test('1. Non-buyer / Wrong owner cannot review product (403/400)', async () => {
    // Customer B tries to review using Customer A's order -> 403 Forbidden
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_B_TOKEN}`,
      },
      body: JSON.stringify({
        productId: TEST_PRODUCT_ID,
        orderId: testOrderIdA,
        rating: 5,
        title: 'Kính rất đẹp',
        content: 'Chất lượng gọng hoàn hảo tuyệt đối.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403, 'Should forbid reviewing orders owned by another customer');
    assert.strictEqual(body.success, false);
  });

  test('2. Customer cannot review product with undelivered order (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({
        productId: TEST_PRODUCT_ID,
        orderId: testOrderIdUndelivered,
        rating: 5,
        title: 'Chưa nhận được',
        content: 'Đơn hàng vẫn đang xử lý chưa giao.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 403, 'Should reject review for undelivered order');
    assert.strictEqual(body.success, false);
  });

  test('3. Verified buyer can submit review with verified purchase badge (201)', async () => {
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({
        productId: TEST_PRODUCT_ID,
        orderId: testOrderIdA,
        rating: 5,
        title: 'Trải nghiệm đỉnh cao Lumina',
        content: 'Gọng kính titanium nhẹ êm, đóng gói bao bì Atelier cực kỳ tinh xảo!',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201, 'Should create review successfully');
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isVerifiedPurchase, true);
    assert.strictEqual(body.data.rating, 5);
    assert.strictEqual(body.data.status, 'approved');
    createdReviewId = body.data.id;
  });

  test('4. Duplicate review for same product and order is rejected (409 Conflict)', async () => {
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({
        productId: TEST_PRODUCT_ID,
        orderId: testOrderIdA,
        rating: 4,
        title: 'Gửi lần 2',
        content: 'Thử gửi lặp lại cho cùng đơn hàng.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 409, 'Should return 409 for duplicate review');
    assert.strictEqual(body.success, false);
  });

  test('5. Rating must be 1-5 and content >= 5 characters (400 Bad Request)', async () => {
    // Rating 6
    const res1 = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({
        productId: TEST_PRODUCT_ID,
        orderId: testOrderIdA,
        rating: 6,
        content: 'Đánh giá 6 sao không hợp lệ',
      }),
    });
    assert.strictEqual(res1.status, 400);

    // Content too short (< 5 chars)
    const res2 = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({
        productId: TEST_PRODUCT_ID,
        orderId: testOrderIdA,
        rating: 5,
        content: 'Tốt',
      }),
    });
    assert.strictEqual(res2.status, 400);
  });

  test('6. Public product reviews and rating summary return real calculated values', async () => {
    // Reviews list
    const res1 = await fetch(`${BASE_URL}/api/products/${TEST_PRODUCT_ID}/reviews`);
    const body1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(body1.success, true);
    assert.strictEqual(body1.data.reviews.length, 1);
    assert.strictEqual(body1.data.reviews[0].rating, 5);
    assert.strictEqual(body1.data.reviews[0].isVerifiedPurchase, true);

    // Summary
    const res2 = await fetch(`${BASE_URL}/api/products/${TEST_PRODUCT_ID}/reviews/summary`);
    const body2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(body2.success, true);
    assert.strictEqual(body2.data.totalReviews, 1);
    assert.strictEqual(body2.data.averageRating, 5);
    assert.strictEqual(body2.data.distribution[5], 1);
    assert.strictEqual(body2.data.distribution[4], 0);
  });

  test('7. Admin can moderate (hide) review with reason and audit log is created', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/reviews/${createdReviewId}/moderate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        action: 'hide',
        reason: 'Nghi vấn spam hoặc ngôn từ vi phạm quy tắc cộng đồng.',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.newStatus, 'hidden');

    // Verify audit log in review_moderation_events
    const [events] = await pool.query(
      `SELECT * FROM review_moderation_events WHERE review_id = ?`,
      [createdReviewId]
    );
    assert.strictEqual(events.length, 1, 'Audit log event must exist');
    assert.strictEqual(events[0].action, 'hide');
  });

  test('8. Hidden review is excluded from public API but visible to admin', async () => {
    // Public API
    const resPub = await fetch(`${BASE_URL}/api/products/${TEST_PRODUCT_ID}/reviews`);
    const bodyPub = await resPub.json();
    assert.strictEqual(bodyPub.data.reviews.length, 0, 'Hidden review must not appear in public listing');

    // Admin API
    const resAdmin = await fetch(`${BASE_URL}/api/admin/reviews?productId=${TEST_PRODUCT_ID}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const bodyAdmin = await resAdmin.json();
    assert.strictEqual(bodyAdmin.data.reviews.length, 1, 'Admin must see all reviews including hidden');
    assert.strictEqual(bodyAdmin.data.reviews[0].status, 'hidden');
  });

  test('9. Self-referral is rejected (400 Bad Request)', async () => {
    // 1. Get referral code for Customer A
    const resCode = await fetch(`${BASE_URL}/api/me/referral`, {
      headers: { Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
    });
    const bodyCode = await resCode.json();
    assert.strictEqual(resCode.status, 200);
    const myCode = bodyCode.data.referralCode;
    assert.ok(myCode.startsWith('LUM-'), 'Referral code must have prefix LUM-');

    // 2. Customer A attempts to claim their own code
    const resClaim = await fetch(`${BASE_URL}/api/me/referral/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({ referralCode: myCode }),
    });
    const bodyClaim = await resClaim.json();
    assert.strictEqual(resClaim.status, 400, 'Self-referral must be rejected');
    assert.strictEqual(bodyClaim.success, false);
  });

  test('10. Referral reward not issued when rule is in DRAFT status', async () => {
    // 1. Customer A gets code
    const codeData = await getOrCreateReferralCode('cust-lumina-01');

    // 2. Attribute to a new customer user (cust-lumina-ref-new)
    const attrResult = await attributeReferral({
      referralCode: codeData.referralCode,
      newUserId: 'cust-lumina-ref-new',
    });
    assert.strictEqual(attrResult.success, true);
    assert.strictEqual(attrResult.status, 'pending');

    // 3. Create qualifying paid & completed order with delivery event for cust-lumina-ref-new
    const [resOrder] = await pool.query(
      `INSERT INTO orders 
        (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, payment_method, subtotal_amount, total_amount, payment_status, status)
       VALUES ('LUM-REV-REFER-01', 'cust-lumina-ref-new', 'Trần Thu Hà', 'thuha@lumina.vn', '0912345678', 'Landmark 81', 'TP.HCM', 'vnpay', 3000000, 3000000, 'paid', 'completed')`
    );
    testOrderIdReferral = resOrder.insertId;

    await pool.query(
      `INSERT INTO order_delivery_events (order_id, carrier_name, tracking_code, delivered_at, confirmed_by, confirmed_by_id)
       VALUES (?, 'GHTK', 'GHTK-REV-REF-01', NOW(), 'admin', 'admin-01')`,
      [testOrderIdReferral]
    );

    // 4. Process referral qualification while rule is DRAFT
    const qualResult = await processQualifiedReferral(testOrderIdReferral);
    assert.strictEqual(qualResult.qualified, true);
    assert.strictEqual(qualResult.rewarded, false, 'Rewards must NOT be issued while rule is in DRAFT');

    // Verify points were NOT credited
    const [acc] = await pool.query(`SELECT available_points FROM loyalty_accounts WHERE user_id = 'cust-lumina-01'`);
    assert.strictEqual(acc[0]?.available_points || 0, 0, 'Referrer points should still be 0');
  });

  test('11. Referral reward issued once approved + Idempotency prevents double reward', async () => {
    // 1. Admin approves the referral rule
    await pool.query(
      `UPDATE loyalty_rules 
       SET status = 'approved', approved_by = 'Lumina Executive' 
       WHERE rule_code = 'rule_referral_reward'`
    );

    // 2. Re-process referral for the same order -> should now issue points
    const rewardResult = await processQualifiedReferral(testOrderIdReferral);
    assert.strictEqual(rewardResult.qualified, true);
    assert.strictEqual(rewardResult.rewarded, true);
    assert.strictEqual(rewardResult.referrerPoints, 50);
    assert.strictEqual(rewardResult.refereePoints, 20);

    // 3. Verify points in loyalty_accounts and ledger
    const [referrerAcc] = await pool.query(
      `SELECT available_points FROM loyalty_accounts WHERE user_id = 'cust-lumina-01'`
    );
    assert.strictEqual(referrerAcc[0].available_points, 50, 'Referrer must receive 50 points');

    const [refereeAcc] = await pool.query(
      `SELECT available_points FROM loyalty_accounts WHERE user_id = 'cust-lumina-ref-new'`
    );
    assert.strictEqual(refereeAcc[0].available_points, 20, 'Referee must receive 20 points');

    // 4. Idempotency test: Re-run processQualifiedReferral on the same order
    const repeatResult = await processQualifiedReferral(testOrderIdReferral);
    assert.strictEqual(repeatResult.alreadyRewarded, true, 'Repeat qualification must be detected as already rewarded');

    // Check balances remain unchanged (no double payout)
    const [recheckAcc] = await pool.query(
      `SELECT available_points FROM loyalty_accounts WHERE user_id = 'cust-lumina-01'`
    );
    assert.strictEqual(recheckAcc[0].available_points, 50, 'Referrer points must not double');
  });

  test('12. Cleanup: Teardown test artifacts', async () => {
    await pool.query(`DELETE FROM review_moderation_events WHERE review_id IN (SELECT id FROM product_reviews WHERE product_id = ?)`, [TEST_PRODUCT_ID]);
    await pool.query(`DELETE FROM product_reviews WHERE product_id = ?`, [TEST_PRODUCT_ID]);
    await pool.query(`DELETE FROM referral_rewards WHERE attribution_id IN (SELECT id FROM referral_attributions WHERE referrer_user_id = 'cust-lumina-01')`);
    await pool.query(`DELETE FROM referral_attributions WHERE referrer_user_id = 'cust-lumina-01'`);
    await pool.query(`DELETE FROM referral_codes WHERE referrer_user_id = 'cust-lumina-01'`);
    await pool.query(`DELETE FROM order_delivery_events WHERE order_id IN (SELECT id FROM orders WHERE order_code LIKE 'LUM-REV-%')`);
    await pool.query(`DELETE FROM order_items WHERE product_id = ?`, [TEST_PRODUCT_ID]);
    await pool.query(`DELETE FROM orders WHERE order_code LIKE 'LUM-REV-%'`);
    await pool.query(`DELETE FROM loyalty_transactions WHERE user_id IN ('cust-lumina-01', 'cust-lumina-ref-new') AND source_reference LIKE 'referral:%'`);
    await pool.query(`UPDATE loyalty_rules SET status = 'draft' WHERE rule_code = 'rule_referral_reward'`);
  });
});
