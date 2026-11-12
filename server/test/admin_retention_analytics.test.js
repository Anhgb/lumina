/**
 * Lumina Eyewear — Customer Retention Analytics & Admin Operations Test Suite (Prompt 08)
 * 
 * Kiểm thử toàn diện các tiêu chí của Prompt 08:
 * 1. RBAC Security: Chặn truy cập không xác thực (401) và chặn Customer (403).
 * 2. Admin Authentication: Cho phép Admin (200) lấy số liệu tổng hợp.
 * 3. Repeat Purchase Rate: Tính toán chính xác tỷ lệ khách mua từ 2 đơn hợp lệ trở lên.
 * 4. Second Purchase Conversion: Tính toán tỷ lệ chuyển đổi đơn thứ 2 theo cửa sổ ngày (windowDays).
 * 5. Review Rate: Tính toán tỷ lệ sản phẩm đã giao có đánh giá xác thực (Verified Purchase).
 * 6. After-sales Volume: Thống kê số lượng phiếu theo loại (Type) và trạng thái (Status).
 * 7. Resolution Time (MTTR): Tính thời gian trung bình xử lý phiếu hoàn tất (giờ/ngày).
 * 8. Loyalty Liability: Tính tổng điểm khả dụng tồn đọng và nghĩa vụ tài chính quy đổi VNĐ.
 * 9. Referral Conversion: Tính tỷ lệ chuyển đổi giới thiệu thành đơn hàng hợp lệ.
 * 10. Notification Opt-in: Đo lường tỷ lệ chấp thuận nhận thông báo theo nhóm.
 * 11. Methodological Caveat: Đảm bảo có lưu ý phương pháp luận, không phóng đại CLV.
 * 12. PII Protection: Đảm bảo phản hồi báo cáo quản trị không phơi bày dữ liệu nhạy cảm cá nhân.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/config/database.js';

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const ADMIN_TOKEN = 'demo-jwt-admin-token-sec888';
const CUSTOMER_TOKEN = 'demo-jwt-customer-token-xyz123';

const TEST_USER_REPEAT_A = 'test-retention-cust-01';
const TEST_USER_REPEAT_B = 'test-retention-cust-02';
const TEST_ORDER_CODE_1 = 'LUM-RET-ORD-01';
const TEST_ORDER_CODE_2 = 'LUM-RET-ORD-02';
const TEST_ORDER_CODE_3 = 'LUM-RET-ORD-03';
const TEST_CARE_TICKET = 'CARE-RET-TEST-01';

describe('Admin Customer Retention & Operations Analytics (Prompt 08)', () => {
  let createdOrderIds = [];

  before(async () => {
    // 1. Dọn dẹp dữ liệu test cũ nếu có
    const [existingOrders] = await pool.query(
      `SELECT id FROM orders WHERE order_code IN (?, ?, ?)`,
      [TEST_ORDER_CODE_1, TEST_ORDER_CODE_2, TEST_ORDER_CODE_3]
    );
    const existingIds = existingOrders.map((o) => o.id);
    if (existingIds.length > 0) {
      await pool.query(`DELETE FROM order_items WHERE order_id IN (?)`, [existingIds]);
      await pool.query(`DELETE FROM order_delivery_events WHERE order_id IN (?)`, [existingIds]);
      await pool.query(`DELETE FROM after_sales_requests WHERE order_id IN (?)`, [existingIds]);
      await pool.query(`DELETE FROM orders WHERE id IN (?)`, [existingIds]);
    }

    await pool.query(`DELETE FROM after_sales_requests WHERE ticket_code = ?`, [TEST_CARE_TICKET]);
    await pool.query(`DELETE FROM product_reviews WHERE user_id IN (?, ?)`, [TEST_USER_REPEAT_A, TEST_USER_REPEAT_B]);
    await pool.query(`DELETE FROM loyalty_transactions WHERE user_id IN (?, ?)`, [TEST_USER_REPEAT_A, TEST_USER_REPEAT_B]);
    await pool.query(`DELETE FROM loyalty_accounts WHERE user_id IN (?, ?)`, [TEST_USER_REPEAT_A, TEST_USER_REPEAT_B]);

    // 2. Tạo đơn thứ 1 cho User A (đã hoàn tất, 60 ngày trước)
    const [ord1] = await pool.query(
      `INSERT INTO orders (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, subtotal_amount, total_amount, status, payment_status, payment_method, created_at)
       VALUES (?, ?, 'Khách Hàng A', 'a@retention.vn', '0901234567', 'Đường A', 'TP.HCM', 2500000, 2500000, 'completed', 'paid', 'bank_transfer', DATE_SUB(NOW(), INTERVAL 60 DAY))`,
      [TEST_ORDER_CODE_1, TEST_USER_REPEAT_A]
    );
    createdOrderIds.push(ord1.insertId);

    // 3. Tạo đơn thứ 2 cho User A (đã hoàn tất, 10 ngày trước -> cách đơn 1 50 ngày, thuộc window 90 ngày)
    const [ord2] = await pool.query(
      `INSERT INTO orders (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, subtotal_amount, total_amount, status, payment_status, payment_method, created_at)
       VALUES (?, ?, 'Khách Hàng A', 'a@retention.vn', '0901234567', 'Đường A', 'TP.HCM', 1950000, 1950000, 'completed', 'paid', 'bank_transfer', DATE_SUB(NOW(), INTERVAL 10 DAY))`,
      [TEST_ORDER_CODE_2, TEST_USER_REPEAT_A]
    );
    createdOrderIds.push(ord2.insertId);

    // 4. Tạo đơn thứ 1 cho User B (chỉ có 1 đơn duy nhất)
    const [ord3] = await pool.query(
      `INSERT INTO orders (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, subtotal_amount, total_amount, status, payment_status, payment_method, created_at)
       VALUES (?, ?, 'Khách Hàng B', 'b@retention.vn', '0909876543', 'Đường B', 'Hà Nội', 3450000, 3450000, 'completed', 'paid', 'bank_transfer', DATE_SUB(NOW(), INTERVAL 20 DAY))`,
      [TEST_ORDER_CODE_3, TEST_USER_REPEAT_B]
    );
    createdOrderIds.push(ord3.insertId);

    // 5. Thêm order item & review xác minh cho đơn 1
    const [itemRes1] = await pool.query(
      `INSERT INTO order_items (order_id, product_id, product_type, product_name, quantity, unit_price, subtotal)
       VALUES (?, 'lumina-01', 'standard', 'Aura Aviator Classic', 1, 2500000, 2500000)`,
      [ord1.insertId]
    );

    await pool.query(
      `INSERT INTO product_reviews (review_code, product_id, user_id, order_id, order_item_id, rating, title, content, is_verified_purchase, status)
       VALUES ('REV-RET-01', 'lumina-01', ?, ?, ?, 5, 'Rất hài lòng', 'Kính mắt chế tác tinh xảo, giao hàng chu đáo.', 1, 'approved')`,
      [TEST_USER_REPEAT_A, ord1.insertId, itemRes1.insertId]
    );

    // 6. Thêm phiếu After-sales Lumina Care đã giải quyết (MTTR = 24 giờ)
    await pool.query(
      `INSERT INTO after_sales_requests (ticket_code, user_id, order_id, request_type, title, description, contact_phone, status, created_at, resolved_at)
       VALUES (?, ?, ?, 'warranty_claim', 'Lỗi ốc đệm ve mũi', 'Cần thay đệm ve mũi silicon', '0901234567', 'resolved', DATE_SUB(NOW(), INTERVAL 24 HOUR), NOW())`,
      [TEST_CARE_TICKET, TEST_USER_REPEAT_A, ord1.insertId]
    );

    // 7. Thêm tài khoản Loyalty cho User A (Gold, 250 điểm)
    const [loyaltyAcc] = await pool.query(
      `INSERT INTO loyalty_accounts (user_id, available_points, lifetime_points, current_tier, joined_at)
       VALUES (?, 250, 250, 'gold', NOW())`,
      [TEST_USER_REPEAT_A]
    );

    await pool.query(
      `INSERT INTO loyalty_transactions (account_id, user_id, transaction_type, points, balance_after, source_reference, reason, order_code)
       VALUES (?, ?, 'earn', 250, 250, 'TX-RET-EARN-01', 'Tích điểm đơn hàng hoàn tất', ?)`,
      [loyaltyAcc.insertId, TEST_USER_REPEAT_A, TEST_ORDER_CODE_1]
    );
  });

  after(async () => {
    // Dọn dẹp dữ liệu sau khi chạy test
    if (createdOrderIds.length > 0) {
      await pool.query(`DELETE FROM product_reviews WHERE user_id IN (?, ?)`, [TEST_USER_REPEAT_A, TEST_USER_REPEAT_B]);
      await pool.query(`DELETE FROM order_items WHERE order_id IN (?)`, [createdOrderIds]);
      await pool.query(`DELETE FROM order_delivery_events WHERE order_id IN (?)`, [createdOrderIds]);
      await pool.query(`DELETE FROM after_sales_requests WHERE order_id IN (?)`, [createdOrderIds]);
      await pool.query(`DELETE FROM orders WHERE id IN (?)`, [createdOrderIds]);
    }
    await pool.query(`DELETE FROM after_sales_requests WHERE ticket_code = ?`, [TEST_CARE_TICKET]);
    await pool.query(`DELETE FROM loyalty_transactions WHERE user_id IN (?, ?)`, [TEST_USER_REPEAT_A, TEST_USER_REPEAT_B]);
    await pool.query(`DELETE FROM loyalty_accounts WHERE user_id IN (?, ?)`, [TEST_USER_REPEAT_A, TEST_USER_REPEAT_B]);
  });

  it('1. GET /api/admin/retention/analytics without token returns 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics`);
    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });

  it('2. GET /api/admin/retention/analytics with Customer token returns 403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics`, {
      headers: { Authorization: `Bearer ${CUSTOMER_TOKEN}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.code, 'FORBIDDEN');
  });

  it('3. GET /api/admin/retention/analytics with Admin token returns 200 with full 8 metrics', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics?period=all&windowDays=90`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.ok(body.data, 'Phải có dữ liệu data');
    assert.ok(body.data.repeatPurchase, 'Phải có chỉ số repeatPurchase');
    assert.ok(body.data.secondPurchaseConversion, 'Phải có chỉ số secondPurchaseConversion');
    assert.ok(body.data.reviews, 'Phải có chỉ số reviews');
    assert.ok(body.data.afterSales, 'Phải có chỉ số afterSales');
    assert.ok(body.data.loyalty, 'Phải có chỉ số loyalty');
    assert.ok(body.data.referral, 'Phải có chỉ số referral');
    assert.ok(body.data.notifications, 'Phải có chỉ số notifications');
    assert.ok(body.data.cohortMethodologyNotice, 'Phải có lưu ý phương pháp luận');
  });

  it('4. Repeat Purchase Rate: Tính toán chính xác từ bảng orders trong MySQL', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics?period=all`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const { data } = await res.json();
    const rp = data.repeatPurchase;

    assert.ok(rp.totalCustomers >= 2, 'Tổng số khách hàng phải ít nhất là 2');
    assert.ok(rp.repeatCustomers >= 1, 'Phải có ít nhất 1 khách hàng có từ 2 đơn trở lên');
    assert.ok(rp.rate > 0 && rp.rate <= 100, 'Tỷ lệ mua lại phải nằm trong khoảng (0, 100]');
    assert.ok(rp.formula.includes('đơn hợp lệ'), 'Công thức phải thể hiện rõ ràng cơ sở tính');
  });

  it('5. Second Purchase Conversion: Tính toán chuẩn theo cửa sổ windowDays', async () => {
    // Window 90 ngày: User A có 2 đơn cách nhau 50 ngày -> converted = 1
    const res90 = await fetch(`${BASE_URL}/api/admin/retention/analytics?period=all&windowDays=90`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const data90 = (await res90.json()).data;
    assert.strictEqual(data90.secondPurchaseConversion.windowDays, 90);
    assert.ok(data90.secondPurchaseConversion.convertedCount >= 1);

    // Window 30 ngày: 50 ngày > 30 ngày -> User A không thỏa window này
    const res30 = await fetch(`${BASE_URL}/api/admin/retention/analytics?period=all&windowDays=30`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const data30 = (await res30.json()).data;
    assert.strictEqual(data30.secondPurchaseConversion.windowDays, 30);
    assert.ok(data30.secondPurchaseConversion.rate <= data90.secondPurchaseConversion.rate);
  });

  it('6. Review Rate: Phản ánh đánh giá xác thực (Verified Purchase) và phân bổ số sao', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const { data } = await res.json();
    const rev = data.reviews;

    assert.ok(rev.totalReviews >= 1);
    assert.ok(rev.verifiedReviewsCount >= 1);
    assert.ok(rev.ratingDistribution['5'] >= 1, 'Phải có ít nhất 1 đánh giá 5 sao từ User A');
    assert.ok(rev.formula.includes('Verified Purchase'), 'Phải thể hiện công thức đánh giá xác thực');
  });

  it('7. After-sales Volume: Phân bổ đúng theo request_type và status', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const { data } = await res.json();
    const af = data.afterSales;

    assert.ok(af.totalRequests >= 1);
    assert.ok(af.breakdownByType.warranty_claim >= 1, 'Phải có phiếu loại warranty_claim');
    assert.ok(af.breakdownByStatus.resolved >= 1, 'Phải có phiếu ở trạng thái resolved');
  });

  it('8. Resolution Time (MTTR): Tính thời gian trung bình xử lý phiếu có ghi chú loại trừ', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const { data } = await res.json();
    const rt = data.afterSales.resolutionTime;

    assert.ok(typeof rt.averageHours === 'number');
    assert.ok(rt.note.includes('waiting_customer'), 'Phải ghi chú loại trừ thời gian chờ khách');
  });

  it('9. Loyalty Liability: Quy đổi đúng tổng điểm tồn đọng theo tỷ lệ 1 điểm = 1.000đ', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const { data } = await res.json();
    const ly = data.loyalty;

    assert.ok(ly.outstandingPoints >= 250);
    assert.strictEqual(ly.liabilityVnd, ly.outstandingPoints * 1000, 'Nghĩa vụ VNĐ phải bằng điểm x 1.000');
    assert.ok(ly.tierDistribution.gold >= 1, 'Phải có ít nhất 1 hội viên hạng Gold');
  });

  it('10. Referral Conversion: Tính toán tỷ lệ chuyển đổi mã giới thiệu', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const { data } = await res.json();
    const ref = data.referral;

    assert.ok(typeof ref.conversionRate === 'number');
    assert.ok(ref.formula.includes('đơn hàng hoàn tất hợp lệ'));
  });

  it('11. Notification Opt-in: Tỷ lệ chấp thuận theo từng nhóm thông báo', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const { data } = await res.json();
    const notif = data.notifications;

    assert.strictEqual(notif.transactionalOptInRate, 100, 'Thông báo giao dịch bắt buộc 100%');
    assert.ok(typeof notif.careRemindersOptInRate === 'number');
    assert.ok(typeof notif.marketingOptInRate === 'number');
  });

  it('12. Methodological Caveat & PII: Không lộ PII và có tuyên bố minh bạch về CLV', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/retention/analytics`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const bodyText = await res.text();
    const parsed = JSON.parse(bodyText);

    // Kiểm tra Caveat
    assert.ok(parsed.data.cohortMethodologyNotice.includes('Không công bố chỉ số CLV'));
    assert.ok(parsed.data.cohortMethodologyNotice.includes('12-24 tháng'));

    // Kiểm tra PII: Không để lộ số điện thoại, mật khẩu, email cá nhân trong response tổng hợp
    assert.ok(!bodyText.includes('0901234567'), 'Không được phơi bày số điện thoại khách hàng');
    assert.ok(!bodyText.includes('a@retention.vn'), 'Không được phơi bày email cá nhân');
    assert.ok(!bodyText.includes('password'), 'Tuyệt đối không có trường mật khẩu');
  });
});

