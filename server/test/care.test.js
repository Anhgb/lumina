import { test, suite } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const CUSTOMER_A_TOKEN = 'demo-jwt-customer-token-xyz123'; // cust-lumina-01
const CUSTOMER_B_TOKEN = 'demo-jwt-customer2-token-uvw456'; // cust-lumina-02
const ADMIN_TOKEN = 'demo-jwt-admin-token-sec888';

suite('Lumina Care & Delivery API Test Suite (Prompt 03)', () => {
  let customerAOrderId = null;
  let customerAOrderCode = null;
  let customerBOrderId = null;
  let testTicketCode = null;

  test('0. Setup: Ensure test orders for Customer A and Customer B', async () => {
    // Find or create Customer A order
    const [rowsA] = await pool.query(
      'SELECT id, order_code FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      ['cust-lumina-01']
    );

    if (rowsA.length > 0) {
      customerAOrderId = rowsA[0].id;
      customerAOrderCode = rowsA[0].order_code;
    } else {
      customerAOrderCode = `LUM-CARE-A-${Date.now()}`;
      const [res] = await pool.query(
        `INSERT INTO orders (
          order_code, user_id, customer_name, customer_email, customer_phone,
          shipping_address, shipping_city, subtotal_amount, total_amount, payment_method, status
        ) VALUES (?, 'cust-lumina-01', 'Nguyễn Minh Anh', 'minhanh.nguyen@lumina.vn', '0901234567', '123 Lê Lợi', 'Hồ Chí Minh', 2000000, 2000000, 'cod', 'confirmed')`,
        [customerAOrderCode]
      );
      customerAOrderId = res.insertId;
    }

    // Find or create Customer B order
    const [rowsB] = await pool.query(
      'SELECT id, order_code FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      ['cust-lumina-02']
    );

    if (rowsB.length > 0) {
      customerBOrderId = rowsB[0].id;
    } else {
      const orderCodeB = `LUM-CARE-B-${Date.now()}`;
      const [res] = await pool.query(
        `INSERT INTO orders (
          order_code, user_id, customer_name, customer_email, customer_phone,
          shipping_address, shipping_city, subtotal_amount, total_amount, payment_method, status
        ) VALUES (?, 'cust-lumina-02', 'Trần Bảo Ngọc', 'baongoc.tran@lumina.vn', '0909876543', '456 Hai Bà Trưng', 'Hà Nội', 1800000, 1800000, 'cod', 'confirmed')`,
        [orderCodeB]
      );
      customerBOrderId = res.insertId;
    }

    assert.ok(customerAOrderId, 'Customer A order ID must exist');
    assert.ok(customerBOrderId, 'Customer B order ID must exist');
  });

  test('1. Guest cannot create care request (401 Unauthorized)', async () => {
    const res = await fetch(`${BASE_URL}/api/care/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderCode: customerAOrderCode,
        requestType: 'warranty_claim',
        title: 'Gãy bản lề',
        description: 'Kính bị gãy khớp nối khi đang sử dụng',
        contactPhone: '0901234567',
      }),
    });

    assert.strictEqual(res.status, 401, 'Guest must receive 401');
  });

  test('2. IDOR Prevention: Customer B cannot create care request for Customer A order (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/care/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_B_TOKEN}`,
      },
      body: JSON.stringify({
        orderCode: customerAOrderCode, // Customer A's order
        requestType: 'warranty_claim',
        title: 'Cần sửa gọng',
        description: 'Vấn đề bản lề',
        contactPhone: '0909876543',
      }),
    });

    assert.strictEqual(res.status, 403, 'Cross-user order access must be forbidden with 403');
  });

  test('3. Customer A successfully creates care request', async () => {
    const res = await fetch(`${BASE_URL}/api/care/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({
        orderCode: customerAOrderCode,
        requestType: 'warranty_claim',
        title: 'Bản lề gọng bị lỏng ốc và lệch khớp',
        description: 'Kính mua được 2 tuần bị lung lay bản lề bên phải cần kỹ thuật kiểm tra và siết lại.',
        contactPhone: '0901234567',
      }),
    });

    assert.strictEqual(res.status, 201, 'Care request creation should return 201');
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.ticketCode.startsWith('CARE-'), 'Ticket code should match CARE- prefix');
    assert.strictEqual(json.data.status, 'submitted');
    testTicketCode = json.data.ticketCode;
  });

  test('4. Customer A lists care requests and sees their ticket', async () => {
    const res = await fetch(`${BASE_URL}/api/care/requests`, {
      headers: { Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data), 'Data should be an array');
    const found = json.data.some(r => r.ticketCode === testTicketCode);
    assert.ok(found, 'Customer A must see their newly created ticket');
  });

  test('5. IDOR Prevention: Customer B cannot view Customer A ticket detail (403 Forbidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/care/requests/${testTicketCode}`, {
      headers: { Authorization: `Bearer ${CUSTOMER_B_TOKEN}` },
    });

    assert.strictEqual(res.status, 403, 'Customer B cannot view Customer A ticket');
  });

  test('6. Admin can view ticket detail and add internal note', async () => {
    // Admin reads ticket
    const res = await fetch(`${BASE_URL}/api/admin/care/requests/${testTicketCode}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.ticketCode, testTicketCode);

    // Admin adds an internal note
    const noteRes = await fetch(`${BASE_URL}/api/admin/care/requests/${testTicketCode}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        content: 'Ghi chú kỹ thuật bí mật nội bộ: Khung gọng cần linh kiện bản lề titanium mã TH-04.',
        isInternalOnly: true,
      }),
    });

    assert.strictEqual(noteRes.status, 200);
  });

  test('7. Internal Note Privacy: Customer A must NEVER see isInternalOnly note', async () => {
    const res = await fetch(`${BASE_URL}/api/care/requests/${testTicketCode}`, {
      headers: { Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const internalEvents = json.data.events.filter(e => e.content.includes('Ghi chú kỹ thuật bí mật nội bộ'));
    assert.strictEqual(internalEvents.length, 0, 'Customer must NOT receive internal notes');
  });

  test('8. State Machine: Invalid transition from submitted to in_progress returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/care/requests/${testTicketCode}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        nextStatus: 'in_progress', // Invalid: submitted cannot go directly to in_progress
      }),
    });

    assert.strictEqual(res.status, 400, 'Invalid transition must be rejected with 400');
  });

  test('9. State Machine: Valid transition submitted -> reviewing -> waiting_customer -> reviewing -> resolved', async () => {
    // 1. submitted -> reviewing
    let res = await fetch(`${BASE_URL}/api/admin/care/requests/${testTicketCode}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ nextStatus: 'reviewing', assignedTo: 'Tech Lead Hùng' }),
    });
    assert.strictEqual(res.status, 200);

    // 2. reviewing -> waiting_customer
    res = await fetch(`${BASE_URL}/api/admin/care/requests/${testTicketCode}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        nextStatus: 'waiting_customer',
        note: 'Kính chào quý khách, quý khách vui lòng chụp ảnh rõ vị trí khớp nối bị lỏng.',
        isInternalOnly: false,
      }),
    });
    assert.strictEqual(res.status, 200);

    // 3. Customer replies -> automatically switches from waiting_customer to reviewing
    const replyRes = await fetch(`${BASE_URL}/api/care/requests/${testTicketCode}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({ content: 'Dạ em đã mang kính qua showroom 212 Lê Lợi rồi ạ.' }),
    });
    assert.strictEqual(replyRes.status, 200);
    const replyJson = await replyRes.json();
    assert.strictEqual(replyJson.data.status, 'reviewing', 'Status should auto-revert to reviewing');

    // 4. reviewing -> approved -> in_progress -> resolved
    await fetch(`${BASE_URL}/api/admin/care/requests/${testTicketCode}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ nextStatus: 'approved' }),
    });

    await fetch(`${BASE_URL}/api/admin/care/requests/${testTicketCode}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ nextStatus: 'in_progress' }),
    });

    const resolveRes = await fetch(`${BASE_URL}/api/admin/care/requests/${testTicketCode}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        nextStatus: 'resolved',
        resolutionSummary: 'Đã siết lại ốc titanium và cân chỉnh ve mũi êm ái.',
        note: 'Sản phẩm đã xử lý xong và sẵn sàng bàn giao.',
      }),
    });
    assert.strictEqual(resolveRes.status, 200);
  });

  test('10. Customer rates the resolved care request (1-5 stars)', async () => {
    const res = await fetch(`${BASE_URL}/api/care/requests/${testTicketCode}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({
        rating: 5,
        feedback: 'Kỹ thuật viên Lumina hỗ trợ rất tận tình, kính đeo êm trở lại!',
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
  });

  test('11. Delivery Confirmation: Admin records delivery event', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/orders/${customerAOrderCode}/delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        carrierName: 'ViettelPost Express',
        trackingCode: 'VP-12345678-VN',
        deliveredAt: new Date().toISOString(),
        proofNote: 'Đã ký nhận đầy đủ kèm biên bản bàn giao hộp Atelier',
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
  });

  test('12. Warranty Coverage check returns active coverage with 12m frame & 6m lens', async () => {
    const res = await fetch(`${BASE_URL}/api/care/orders/${customerAOrderCode}/warranty`, {
      headers: { Authorization: `Bearer ${CUSTOMER_A_TOKEN}` },
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.isDelivered, true);
    assert.strictEqual(json.data.frameWarranty.durationMonths, 12);
    assert.strictEqual(json.data.lensWarranty.durationMonths, 6);
    assert.strictEqual(json.data.maintenanceService.durationMonths, 24);
    assert.strictEqual(json.data.frameWarranty.isCovered, true);
  });
});

