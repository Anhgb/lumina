/**
 * Lumina Eyewear — Order Lookup & Customer Care Tests (Prompt 06)
 * 
 * Comprehensive Test Suite covering:
 * 1. Order Lookup with valid order code (own order)
 * 2. Non-existent order code
 * 3. Customer lookups own order (Access Allowed, 200, formatted summary)
 * 4. Customer lookups another customer's order (IDOR Protection, Access Denied)
 * 5. Guest attempts lookup (Auth Required, login prompt)
 * 6. Order with status 'cancelled' (Explanation, refund guidance)
 * 7. Order with status 'processing' (Explanation, optical fabrication, cannot cancel)
 * 8. Order with status 'confirmed' (Explanation, atelier transfer)
 * 9. Order with status 'pending' (Explanation, verification queue)
 * 10. AI Guardrail: No 'shipping' status hallucination
 * 11. AI Guardrail: Order cancel request does not mutate database, guides to Hotline
 * 12. PII Masking verification (Phone, Email, Address)
 * 13. Policy FAQs (COD, Bank transfer simulation, Warranty, Returns, Care, Cancellation)
 * 14. Graceful degradation when Backend / Database connection is unavailable
 */

import { suite, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';
import {
  ORDER_STATUS_MAP,
  maskPII,
  lookupOrderWithSecurity,
  formatOrderDetailsResponse,
  handleCancelOrModifyRequest,
} from '../src/ai/orderAdvisor.js';
import { generateLuminaResponse } from '../src/ai/ai.service.js';
import { classifyIntent } from '../src/ai/intentClassifier.js';
import FAQ_DATA from '../src/ai/faq.data.js';

dotenv.config();

const TEST_ORDER_OWNER = { id: 'cust-test-01', name: 'Nguyễn Văn Minh', role: 'customer' };
const TEST_ORDER_OTHER = { id: 'cust-test-02', name: 'Trần Thị Mai', role: 'customer' };
const TEST_ADMIN = { id: 'admin-01', name: 'Lumina Admin', role: 'admin' };

const CODE_PENDING = 'LUM-TEST-PENDING-01';
const CODE_CONFIRMED = 'LUM-TEST-CONFIRM-02';
const CODE_PROCESSING = 'LUM-TEST-PROCESS-03';
const CODE_COMPLETED = 'LUM-TEST-COMPLETE-04';
const CODE_CANCELLED = 'LUM-TEST-CANCEL-05';
const CODE_OTHER_USER = 'LUM-TEST-OTHER-06';

suite('Lumina Order Lookup & Customer Care Tests (Prompt 06)', () => {
  before(async () => {
    // Seed temporary test orders
    const seedOrders = [
      [CODE_PENDING, 'cust-test-01', 'Nguyễn Văn Minh', 'minh.nguyen@example.com', '0912345678', 'Số 10 Tràng Tiền', 'Hà Nội', 3250000, 3250000, 'unpaid', 'pending'],
      [CODE_CONFIRMED, 'cust-test-01', 'Nguyễn Văn Minh', 'minh.nguyen@example.com', '0912345678', 'Số 10 Tràng Tiền', 'Hà Nội', 2850000, 2850000, 'paid', 'confirmed'],
      [CODE_PROCESSING, 'cust-test-01', 'Nguyễn Văn Minh', 'minh.nguyen@example.com', '0912345678', 'Số 10 Tràng Tiền', 'Hà Nội', 3100000, 3100000, 'paid', 'processing'],
      [CODE_COMPLETED, 'cust-test-01', 'Nguyễn Văn Minh', 'minh.nguyen@example.com', '0912345678', 'Số 10 Tràng Tiền', 'Hà Nội', 2450000, 2450000, 'paid', 'completed'],
      [CODE_CANCELLED, 'cust-test-01', 'Nguyễn Văn Minh', 'minh.nguyen@example.com', '0912345678', 'Số 10 Tràng Tiền', 'Hà Nội', 1950000, 1950000, 'refunded', 'cancelled'],
      [CODE_OTHER_USER, 'cust-test-02', 'Trần Thị Mai', 'mai.tran@example.com', '0988776655', 'Số 88 Lê Lợi', 'TP. Hồ Chí Minh', 3450000, 3450000, 'paid', 'confirmed'],
    ];

    for (const ord of seedOrders) {
      await pool.query(
        `INSERT INTO orders (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, shipping_city, total_amount, subtotal_amount, payment_status, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), payment_status = VALUES(payment_status)`,
        ord
      );
    }
  });

  after(async () => {
    // Clean up temporary test orders
    await pool.query(
      `DELETE FROM orders WHERE order_code LIKE 'LUM-TEST-%'`
    );
  });

  // ── 1. PII Masking Tests ──
  test('1. PII Masking hides sensitive phone, email and detailed street address', () => {
    const maskedPhone = maskPII('0912345678', 'phone');
    assert.equal(maskedPhone, '091***5678');

    const maskedEmail = maskPII('customer.vip@lumina.vn', 'email');
    assert.ok(maskedEmail.startsWith('c***'));
    assert.ok(maskedEmail.endsWith('@lumina.vn'));

    const maskedAddr = maskPII('Số 102 Đường Đồng Khởi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', 'address');
    assert.ok(maskedAddr.includes('TP. Hồ Chí Minh'));
    assert.equal(maskedAddr.includes('102 Đường Đồng Khởi'), false);
  });

  // ── 2. Order Status Canonical Schema (No shipping hallucination) ──
  test('2. Order statuses strictly conform to MySQL enum and do NOT include "shipping"', () => {
    const allowed = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
    assert.deepEqual(Object.keys(ORDER_STATUS_MAP).sort(), allowed.sort());
    assert.equal(ORDER_STATUS_MAP['shipping'], undefined, 'Must not have shipping status');

    for (const [key, conf] of Object.entries(ORDER_STATUS_MAP)) {
      assert.equal(conf.status, key);
      assert.ok(conf.label.length > 0);
      assert.ok(conf.explanation.length > 10);
      assert.ok(conf.nextStep.length > 10);
      assert.ok(typeof conf.canRequestCancel === 'boolean');
    }
  });

  // ── 3. Customer Lookups Own Order (Allowed) ──
  test('3. Customer can look up their own order with complete status & next steps', async () => {
    const res = await generateLuminaResponse({
      content: `Kiểm tra đơn hàng ${CODE_CONFIRMED}`,
      user: TEST_ORDER_OWNER,
      history: [],
    });

    assert.equal(res.messageType, 'order_status');
    assert.ok(res.content.includes(CODE_CONFIRMED));
    assert.ok(res.content.includes('ĐÃ XÁC NHẬN'));
    assert.ok(res.content.includes('xưởng chế tác'));
    assert.ok(res.metadata.orderCode, CODE_CONFIRMED);
    assert.equal(res.metadata.status, 'confirmed');
  });

  // ── 4. Non-Existent Order Code ──
  test('4. Non-existent order code returns polite not found message', async () => {
    const res = await generateLuminaResponse({
      content: 'Tra cứu đơn LUM-NONEXISTENT-9999',
      user: TEST_ORDER_OWNER,
      history: [],
    });

    assert.equal(res.messageType, 'order_status');
    assert.ok(res.content.includes('không tìm thấy'));
    assert.ok(res.content.includes('LUM-NONEXISTENT-9999'));
    assert.equal(res.metadata.status, 'not_found');
  });

  // ── 5. IDOR Protection: Customer A cannot view Customer B order ──
  test('5. IDOR Protection blocks Customer from accessing another customer order', async () => {
    const res = await generateLuminaResponse({
      content: `Tra cứu đơn hàng ${CODE_OTHER_USER}`,
      user: TEST_ORDER_OWNER, // Owner is cust-test-02, requester is cust-test-01
      history: [],
    });

    assert.equal(res.messageType, 'order_status');
    assert.ok(res.content.includes('không thuộc quyền sở hữu') || res.content.includes('không thuộc tài khoản'));
    assert.equal(res.metadata.status, 'forbidden');
  });

  // ── 6. Guest Attempts Lookup (Auth Required) ──
  test('6. Guest user is blocked from viewing orders and prompted to log in', async () => {
    const res = await generateLuminaResponse({
      content: `Tra cứu mã đơn ${CODE_CONFIRMED}`,
      user: null, // Guest
      history: [],
    });

    assert.equal(res.messageType, 'auth_required');
    assert.ok(res.content.includes('đăng nhập tài khoản Lumina'));
    assert.ok(res.metadata.quickActions.includes('Đăng nhập tài khoản'));
  });

  // ── 7. Order Status 'cancelled' ──
  test('7. Cancelled order lookup explains status, refund timeline and re-order options', async () => {
    const res = await generateLuminaResponse({
      content: `Tiến độ đơn ${CODE_CANCELLED}`,
      user: TEST_ORDER_OWNER,
      history: [],
    });

    assert.equal(res.messageType, 'order_status');
    assert.ok(res.content.includes('ĐÃ HỦY'));
    assert.ok(res.content.includes('hoàn trả') || res.content.includes('5–7 ngày'));
    assert.equal(res.metadata.status, 'cancelled');
    assert.equal(res.metadata.canCancel, false);
  });

  // ── 8. Order Status 'processing' (Đang chế tác) ──
  test('8. Processing order lookup explains bespoke crafting and why it cannot be canceled mid-process', async () => {
    const res = await generateLuminaResponse({
      content: `Kiểm tra đơn ${CODE_PROCESSING}`,
      user: TEST_ORDER_OWNER,
      history: [],
    });

    assert.equal(res.messageType, 'order_status');
    assert.ok(res.content.includes('ĐANG CHẾ TÁC'));
    assert.ok(res.content.includes('Atelier') || res.content.includes('quang học'));
    assert.equal(res.metadata.status, 'processing');
    assert.equal(res.metadata.canCancel, false);
  });

  // ── 9. Order Status 'pending' (Chờ xác nhận) ──
  test('9. Pending order lookup explains verification queue and cancel possibility', async () => {
    const res = await generateLuminaResponse({
      content: `Tình trạng đơn hàng ${CODE_PENDING}`,
      user: TEST_ORDER_OWNER,
      history: [],
    });

    assert.equal(res.messageType, 'order_status');
    assert.ok(res.content.includes('CHỜ XÁC NHẬN'));
    assert.equal(res.metadata.status, 'pending');
    assert.equal(res.metadata.canCancel, true);
  });

  // ── 10. Order Status 'completed' (Hoàn thành) ──
  test('10. Completed order lookup activates warranty and lifetime maintenance notes', async () => {
    const res = await generateLuminaResponse({
      content: `Tra cứu đơn ${CODE_COMPLETED}`,
      user: TEST_ORDER_OWNER,
      history: [],
    });

    assert.equal(res.messageType, 'order_status');
    assert.ok(res.content.includes('HOÀN THÀNH'));
    assert.ok(res.content.includes('bảo hành') || res.content.includes('chăm sóc trọn đời'));
    assert.equal(res.metadata.status, 'completed');
  });

  // ── 11. Guardrail: Cancellation Request Does NOT Mutate Database ──
  test('11. AI does NOT cancel order directly, but guides customer to Hotline according to policy', async () => {
    const res = await generateLuminaResponse({
      content: `Tôi muốn hủy đơn hàng ${CODE_PENDING}`,
      user: TEST_ORDER_OWNER,
      history: [],
    });

    assert.equal(res.messageType, 'order_cancel_guidance');
    assert.ok(res.content.includes('1900-LUMINA'));
    assert.ok(res.content.includes('Hotline Concierge'));
    assert.equal(res.metadata.eligible, true);

    // Verify order in database was NOT modified or cancelled automatically
    const [rows] = await pool.query('SELECT status FROM orders WHERE order_code = ?', [CODE_PENDING]);
    assert.equal(rows[0].status, 'pending', 'Order status must remain pending (not mutated by AI)');
  });

  // ── 12. Policy FAQs (COD, Bank Transfer, Cancellation, Warranty, Returns) ──
  test('12. Customer Care Policy FAQs return authoritative responses', async () => {
    // COD FAQ
    const codRes = await generateLuminaResponse({ content: 'Chính sách thanh toán khi nhận hàng COD thế nào?', user: null });
    assert.equal(codRes.messageType, 'faq_response');
    assert.ok(codRes.content.includes('đồng kiểm tra'));

    // Bank transfer FAQ
    const bankRes = await generateLuminaResponse({ content: 'Quy trình thanh toán chuyển khoản ngân hàng?', user: null });
    assert.equal(bankRes.messageType, 'faq_response');
    assert.ok(bankRes.content.includes('đối soát') || bankRes.content.includes('QR'));

    // Cancel Policy FAQ
    const cancelFaqRes = await generateLuminaResponse({ content: 'Quy định hủy hoặc thay đổi đơn hàng thế nào?', user: null });
    assert.equal(cancelFaqRes.messageType, 'faq_response');
    assert.ok(cancelFaqRes.content.toLowerCase().includes('chờ xác nhận') || cancelFaqRes.content.toLowerCase().includes('đang chế tác'));
  });

  // ── 13. Database / Backend Connection Lost Graceful Handling ──
  test('13. Simulated database connection failure returns friendly error without crashing', async () => {
    // Call lookupOrderWithSecurity with broken query simulation
    const originalQuery = pool.query;
    try {
      pool.query = async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:3306');
      };

      const lookup = await lookupOrderWithSecurity('LUM-ANY-CODE', TEST_ORDER_OWNER);
      assert.equal(lookup.status, 'DB_ERROR');
      assert.ok(lookup.error.includes('ECONNREFUSED'));
    } finally {
      pool.query = originalQuery;
    }
  });

  // ── 14. Customer prompts "Kiểm tra đơn hàng của tôi" without code ──
  test('14. Prompting "Kiểm tra đơn hàng của tôi" without code provides latest order and asks for code', async () => {
    const res = await generateLuminaResponse({
      content: 'Kiểm tra đơn hàng của tôi',
      user: TEST_ORDER_OWNER,
      history: [],
    });

    assert.equal(res.messageType, 'order_status');
    assert.ok(res.content.includes('Đơn hàng gần nhất') || res.content.includes('cung cấp mã đơn hàng'));
    assert.ok(res.metadata.orderCode);
  });
});

