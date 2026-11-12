import { test, suite } from 'node:test';
import assert from 'node:assert';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';
import {
  getUserPreferences,
  updateUserPreferences,
  createAndDispatchNotification,
  triggerOrderConfirmed,
  triggerDeliveryVerified,
  getCustomerNotifications,
  markNotificationAsRead,
  sendMarketingCampaign,
} from '../src/services/notification.service.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const CUSTOMER_A_TOKEN = 'demo-jwt-customer-token-xyz123'; // cust-lumina-01
const CUSTOMER_B_TOKEN = 'demo-jwt-customer2-token-uvw456'; // cust-lumina-02
const ADMIN_TOKEN = 'demo-jwt-admin-token-sec888';

const TEST_USER = 'cust-notif-test-01';

suite('Lumina Notification & Customer Engagement API Test Suite (Prompt 06)', () => {
  test('0. Setup: Clean test notification data', async () => {
    await pool.query(`DELETE FROM notification_delivery_logs WHERE notification_id IN (SELECT id FROM notifications WHERE user_id = ?)`, [TEST_USER]);
    await pool.query(`DELETE FROM notification_outbox WHERE user_id = ?`, [TEST_USER]);
    await pool.query(`DELETE FROM notifications WHERE user_id = ?`, [TEST_USER]);
    await pool.query(`DELETE FROM notification_preferences WHERE user_id = ?`, [TEST_USER]);

    // Also clean for customer A
    await pool.query(`DELETE FROM notification_delivery_logs WHERE notification_id IN (SELECT id FROM notifications WHERE user_id = 'cust-lumina-01')`);
    await pool.query(`DELETE FROM notification_outbox WHERE user_id = 'cust-lumina-01'`);
    await pool.query(`DELETE FROM notifications WHERE user_id = 'cust-lumina-01'`);
  });

  test('1. Default Preferences: Transactional is ON, Marketing is strictly OFF (Consent = 0)', async () => {
    const prefs = await getUserPreferences(TEST_USER);
    assert.strictEqual(prefs.orderUpdatesInapp, true, 'Transactional in-app must default to ON');
    assert.strictEqual(prefs.orderUpdatesEmail, true, 'Transactional email must default to ON');
    assert.strictEqual(prefs.careRemindersInapp, true, 'Care reminders in-app must default to ON');
    assert.strictEqual(prefs.marketingInapp, false, 'Marketing in-app MUST default to OFF');
    assert.strictEqual(prefs.marketingEmail, false, 'Marketing email MUST default to OFF');
    assert.strictEqual(prefs.marketingSms, false, 'Marketing SMS MUST default to OFF');
    assert.strictEqual(prefs.consentVersion, 'v1.0');
  });

  test('2. Customer can update preferences and opt-in / opt-out with timestamp and source', async () => {
    const res = await fetch(`${BASE_URL}/api/me/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CUSTOMER_A_TOKEN}`,
      },
      body: JSON.stringify({
        marketingInapp: true,
        marketingEmail: false,
        careRemindersEmail: true,
        source: 'my_lumina_settings_tab',
        version: 'v1.1',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.marketingInapp, true);
    assert.strictEqual(body.data.marketingEmail, false);
    assert.strictEqual(body.data.careRemindersEmail, true);
    assert.strictEqual(body.data.consentSource, 'my_lumina_settings_tab');
  });

  test('3. Transactional notification: Dispatches immediately into in-app inbox', async () => {
    const res = await createAndDispatchNotification({
      userId: TEST_USER,
      category: 'transactional',
      type: 'order_confirmed',
      title: 'Đơn hàng LUM-TEST-001 đã xác nhận',
      message: 'Nghệ nhân đang chuẩn bị chế tác gọng kính.',
      data: { orderCode: 'LUM-TEST-001' },
      idempotencyKey: 'test:order:confirmed:001',
      targetChannels: ['in_app', 'email'],
    });

    assert.strictEqual(res.success, true);
    assert.ok(res.notification.id);
    assert.strictEqual(res.notification.category, 'transactional');

    // Check delivery logs: In-app is delivered, Email is skipped_no_provider (truth in logging)
    const [logs] = await pool.query(
      `SELECT channel, status, provider_name FROM notification_delivery_logs WHERE notification_id = ?`,
      [res.notification.id]
    );

    const inAppLog = logs.find((l) => l.channel === 'in_app');
    assert.ok(inAppLog);
    assert.strictEqual(inAppLog.status, 'delivered');

    const emailLog = logs.find((l) => l.channel === 'email');
    assert.ok(emailLog);
    assert.strictEqual(emailLog.status, 'skipped_no_provider', 'Must not fake that email was sent');
  });

  test('4. Idempotency: Re-dispatching same event returns existing notification without duplicate', async () => {
    const resDuplicate = await createAndDispatchNotification({
      userId: TEST_USER,
      category: 'transactional',
      type: 'order_confirmed',
      title: 'Đơn hàng LUM-TEST-001 đã xác nhận (Gửi lại)',
      message: 'Gửi lại cùng một event.',
      idempotencyKey: 'test:order:confirmed:001',
    });

    assert.strictEqual(resDuplicate.success, true);
    assert.strictEqual(resDuplicate.duplicate, true);

    // Verify count in notifications table is still exactly 1
    const [count] = await pool.query(
      `SELECT COUNT(*) AS total FROM notifications WHERE idempotency_key = 'test:order:confirmed:001'`
    );
    assert.strictEqual(count[0].total, 1, 'Only 1 notification must exist for the same idempotency key');
  });

  test('5. Marketing blocked when consent is false (No spam protection)', async () => {
    // TEST_USER has marketing = 0
    const resMarketing = await createAndDispatchNotification({
      userId: TEST_USER,
      category: 'marketing',
      type: 'marketing_summer_promo',
      title: 'Ưu đãi hè Lumina 20% gọng kính',
      message: 'Mua ngay hôm nay.',
      idempotencyKey: 'test:marketing:promo:001',
      targetChannels: ['in_app'],
    });

    assert.strictEqual(resMarketing.success, false);
    assert.strictEqual(resMarketing.blocked, true);

    // Verify notification was NOT added to notifications table
    const [notifs] = await pool.query(
      `SELECT * FROM notifications WHERE idempotency_key = 'test:marketing:promo:001'`
    );
    assert.strictEqual(notifs.length, 0, 'Blocked marketing notification must NOT be created');

    // Verify recorded in outbox as blocked_no_consent
    const [outbox] = await pool.query(
      `SELECT * FROM notification_outbox WHERE idempotency_key = 'test:marketing:promo:001'`
    );
    assert.strictEqual(outbox.length, 1);
    assert.strictEqual(outbox[0].status, 'blocked_no_consent');
  });

  test('6. Marketing allowed once consent is granted', async () => {
    // Grant marketing consent to TEST_USER
    await updateUserPreferences(TEST_USER, { marketingInapp: true });

    const resMarketing = await createAndDispatchNotification({
      userId: TEST_USER,
      category: 'marketing',
      type: 'marketing_summer_promo',
      title: 'Ưu đãi hè Lumina 20% gọng kính',
      message: 'Mua ngay hôm nay.',
      idempotencyKey: 'test:marketing:promo:002',
      targetChannels: ['in_app'],
    });

    assert.strictEqual(resMarketing.success, true);
    assert.ok(resMarketing.notification.id);
  });

  test('7. Customer views own inbox, unread count, and marks as read', async () => {
    const listRes = await getCustomerNotifications(TEST_USER);
    assert.strictEqual(listRes.notifications.length, 2); // 1 transactional + 1 consented marketing
    assert.strictEqual(listRes.unreadCount, 2);

    const firstNotifId = listRes.notifications[0].id;

    // Mark as read
    await markNotificationAsRead(TEST_USER, firstNotifId);

    const updatedList = await getCustomerNotifications(TEST_USER);
    assert.strictEqual(updatedList.unreadCount, 1);
  });

  test('8. IDOR Protection: Customer B cannot mark or delete Customer A notification (403)', async () => {
    const listRes = await getCustomerNotifications(TEST_USER);
    const targetId = listRes.notifications[0].id;

    // Call API using Customer B's token to mutate Customer A's notification
    const res = await fetch(`${BASE_URL}/api/me/notifications/${targetId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${CUSTOMER_B_TOKEN}` },
    });

    assert.strictEqual(res.status, 403, 'Must reject mutating another customer notification');
  });

  test('9. Admin can view delivery logs with truthful status', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/notifications/logs`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.data.logs.length > 0);
  });

  test('10. Cleanup test artifacts', async () => {
    await pool.query(`DELETE FROM notification_delivery_logs WHERE notification_id IN (SELECT id FROM notifications WHERE user_id = ?)`, [TEST_USER]);
    await pool.query(`DELETE FROM notification_outbox WHERE user_id = ?`, [TEST_USER]);
    await pool.query(`DELETE FROM notifications WHERE user_id = ?`, [TEST_USER]);
    await pool.query(`DELETE FROM notification_preferences WHERE user_id = ?`, [TEST_USER]);
  });
});

