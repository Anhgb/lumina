import { after, suite, test } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';
import { resetRateLimits } from '../src/middleware/chatRateLimit.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const CUSTOMER_TOKEN = 'demo-jwt-customer-token-xyz123';
const OTHER_CUSTOMER_TOKEN = 'demo-jwt-customer2-token-uvw456';
const ADMIN_TOKEN = 'demo-jwt-admin-token-sec888';

const GUEST_ID_1 = `test_guest_1_${Date.now()}`;
const GUEST_ID_2 = `test_guest_2_${Date.now()}`;

suite('Lumina AI Assistant Chat System Tests', () => {
  let customerSessionCode;
  let guestSessionCode;
  let aiMessageId;

  after(async () => {
    // Cleanup any test chat sessions
    await pool.query(
      `DELETE FROM chat_sessions WHERE session_code LIKE 'CHAT-%' AND (user_id IN ('cust-lumina-01', 'cust-lumina-02') OR guest_session_id IN (?, ?))`,
      [GUEST_ID_1, GUEST_ID_2]
    );
  });

  test('1. Customer can create a new chat session', async () => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({ title: 'Tư vấn chọn kính mặt tròn' }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.sessionCode);
    assert.equal(body.data.userId, 'cust-lumina-01');
    assert.equal(body.data.title, 'Tư vấn chọn kính mặt tròn');
    customerSessionCode = body.data.sessionCode;
  });

  test('2. Guest can create a new chat session with x-guest-session-id', async () => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-guest-session-id': GUEST_ID_1,
      },
      body: JSON.stringify({ title: 'Khách vãng lai tư vấn' }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.sessionCode);
    assert.equal(body.data.guestSessionId, GUEST_ID_1);
    guestSessionCode = body.data.sessionCode;
  });

  test('3. Customer can send a message and receive an AI assistant response', async () => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${customerSessionCode}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({
        content: 'Tôi muốn tìm gọng kính titan cao cấp dáng tròn',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.userMessage);
    assert.ok(body.data.assistantMessage);
    assert.equal(body.data.userMessage.role, 'user');
    assert.equal(body.data.assistantMessage.role, 'assistant');
    assert.ok(body.data.assistantMessage.content.length > 0);
    aiMessageId = body.data.assistantMessage.id;
  });

  test('4. Customer can retrieve message history for their session', async () => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${customerSessionCode}/messages`, {
      headers: {
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data.messages));
    assert.ok(body.data.messages.length >= 2);
  });

  test('5. IDOR Protection: Customer B cannot read Customer A chat messages (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${customerSessionCode}/messages`, {
      headers: {
        Authorization: `Bearer ${OTHER_CUSTOMER_TOKEN}`,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.code, 'FORBIDDEN');
  });

  test('6. IDOR Protection: Guest B cannot read Guest A chat messages (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${guestSessionCode}/messages`, {
      headers: {
        'x-guest-session-id': GUEST_ID_2,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('7. Privacy Protection: Admin cannot read customer private chat messages by default (403)', async () => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${customerSessionCode}/messages`, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('8. Validator: Empty or whitespace message is rejected (400)', async () => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${customerSessionCode}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({ content: '   ' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('9. Validator: Content exceeding 1000 characters is rejected (400)', async () => {
    const longText = 'A'.repeat(1005);
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${customerSessionCode}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({ content: longText }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('10. Feedback: Can submit rating and feedback for AI response', async () => {
    assert.ok(aiMessageId, 'AI Message ID must exist');

    const res = await fetch(`${BASE_URL}/api/chat/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
      body: JSON.stringify({
        sessionCode: customerSessionCode,
        messageId: aiMessageId,
        rating: 'liked',
        comment: 'Tư vấn rất chính xác và phong cách thanh lịch.',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  test('11. Delete Session: Customer can delete their session and cascade messages', async () => {
    const res = await fetch(`${BASE_URL}/api/chat/sessions/${customerSessionCode}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify session no longer exists
    const checkRes = await fetch(`${BASE_URL}/api/chat/sessions/${customerSessionCode}/messages`, {
      headers: {
        Authorization: `Bearer ${CUSTOMER_TOKEN}`,
      },
    });
    assert.equal(checkRes.status, 404);
  });
});
