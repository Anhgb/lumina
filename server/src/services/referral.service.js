/**
 * Lumina Eyewear — Referral Program Service
 * 
 * Implements Prompt 05 — Referral Program:
 * - Each member gets a unique referral code.
 * - Attribution strictly for new customers (cannot self-refer, cannot re-refer).
 * - Rewards are strictly gated by admin-approved rules in `loyalty_rules`.
 *   If rule is 'draft', attributions transition to 'qualified' without issuing points.
 * - Single-payout idempotency (idempotency_key = referral:order:{orderId}).
 * - Anti-fraud safeguards: self-referral rejection, single referee attribution.
 * - Integration with Lumina Membership points system.
 */

import crypto from 'crypto';
import { pool } from '../config/database.js';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler.js';

/**
 * Generate a unique random referral code (e.g. LUM-8B9X)
 */
function generateReferralCodeString() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'LUM-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get or create a referral code for a member.
 */
export async function getOrCreateReferralCode(userId) {
  if (!userId) {
    throw new BadRequestError('Thiếu thông tin người dùng.');
  }

  // 1. Check existing code
  const [existing] = await pool.query(
    `SELECT id, referrer_user_id, referral_code, is_active, total_referrals, successful_referrals, created_at
     FROM referral_codes
     WHERE referrer_user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (existing.length > 0) {
    const row = existing[0];
    return {
      id: row.id,
      referralCode: row.referral_code,
      isActive: Boolean(row.is_active),
      totalReferrals: row.total_referrals,
      successfulReferrals: row.successful_referrals,
      shareUrl: `/register?ref=${row.referral_code}`,
      createdAt: row.created_at,
    };
  }

  // 2. Generate and insert a new unique code with retry
  let attempts = 0;
  while (attempts < 5) {
    const code = generateReferralCodeString();
    try {
      const [result] = await pool.query(
        `INSERT INTO referral_codes (referrer_user_id, referral_code, is_active)
         VALUES (?, ?, 1)`,
        [userId, code]
      );
      return {
        id: result.insertId,
        referralCode: code,
        isActive: true,
        totalReferrals: 0,
        successfulReferrals: 0,
        shareUrl: `/register?ref=${code}`,
        createdAt: new Date(),
      };
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        attempts++;
        continue;
      }
      throw err;
    }
  }

  throw new Error('Không thể khởi tạo mã giới thiệu duy nhất.');
}

/**
 * Attribute a referral to a new user.
 * Anti-fraud checks:
 * 1. Code exists and is active.
 * 2. Self-referral rejected (referrer !== referee).
 * 3. Referee must not have been referred before.
 * 4. Referee must not have previous non-cancelled orders (new customer only).
 */
export async function attributeReferral({ referralCode, newUserId }) {
  if (!referralCode || !newUserId) {
    throw new BadRequestError('Mã giới thiệu và mã khách hàng là bắt buộc.');
  }

  const cleanCode = referralCode.trim().toUpperCase();

  // 1. Find referral code
  const [codes] = await pool.query(
    `SELECT * FROM referral_codes WHERE referral_code = ? AND is_active = 1 LIMIT 1`,
    [cleanCode]
  );
  if (codes.length === 0) {
    throw new NotFoundError('Mã giới thiệu không tồn tại hoặc đã bị vô hiệu hóa.');
  }

  const codeRow = codes[0];

  // 2. Anti-fraud: Cannot self-refer
  if (codeRow.referrer_user_id === newUserId) {
    throw new BadRequestError('Bạn không thể tự giới thiệu chính mình.');
  }

  // 3. Anti-fraud: Single attribution per user
  const [existingAttr] = await pool.query(
    `SELECT id, referrer_user_id FROM referral_attributions WHERE referred_user_id = ? LIMIT 1`,
    [newUserId]
  );
  if (existingAttr.length > 0) {
    throw new ConflictError('Khách hàng này đã được áp dụng mã giới thiệu trước đó.');
  }

  // 4. Anti-fraud: New customer check (cannot have existing paid/active orders)
  const [existingOrders] = await pool.query(
    `SELECT COUNT(*) AS count FROM orders WHERE user_id = ? AND status != 'cancelled'`,
    [newUserId]
  );
  if (parseInt(existingOrders[0]?.count, 10) > 0) {
    throw new BadRequestError('Chương trình giới thiệu chỉ áp dụng cho khách hàng mới chưa từng phát sinh đơn hàng.');
  }

  const idempotencyKey = `ref:attr:${newUserId}`;

  // 5. Insert attribution
  await pool.query(
    `INSERT INTO referral_attributions 
      (referral_code_id, referrer_user_id, referred_user_id, status, idempotency_key)
     VALUES (?, ?, ?, 'pending', ?)`,
    [codeRow.id, codeRow.referrer_user_id, newUserId, idempotencyKey]
  );

  // 6. Increment total referrals counter
  await pool.query(
    `UPDATE referral_codes SET total_referrals = total_referrals + 1 WHERE id = ?`,
    [codeRow.id]
  );

  return {
    success: true,
    referralCode: cleanCode,
    referrerUserId: codeRow.referrer_user_id,
    referredUserId: newUserId,
    status: 'pending',
    message: 'Áp dụng mã giới thiệu thành công. Phần thưởng sẽ được kích hoạt khi hoàn tất đơn hàng đầu tiên đủ điều kiện.',
  };
}

/**
 * Process referral qualification when an order is completed/delivered.
 * Idempotent: Can be called multiple times without duplicate rewards.
 */
export async function processQualifiedReferral(orderId) {
  const parsedOrderId = parseInt(orderId, 10);
  if (isNaN(parsedOrderId)) {
    throw new BadRequestError('Mã đơn hàng không hợp lệ.');
  }

  // 1. Check order
  const [orders] = await pool.query(
    `SELECT id, order_code, user_id, status, payment_status, total_amount FROM orders WHERE id = ?`,
    [parsedOrderId]
  );
  if (orders.length === 0) {
    throw new NotFoundError('Không tìm thấy đơn hàng.');
  }
  const order = orders[0];

  // 2. Find pending attribution for this customer
  const [attributions] = await pool.query(
    `SELECT * FROM referral_attributions WHERE referred_user_id = ? LIMIT 1`,
    [order.user_id]
  );
  if (attributions.length === 0) {
    return { qualified: false, reason: 'Khách hàng không được tạo qua mã giới thiệu.' };
  }

  const attr = attributions[0];
  if (attr.status === 'rewarded') {
    return { qualified: true, alreadyRewarded: true, message: 'Phần thưởng giới thiệu đã được trao trước đó.' };
  }

  // 3. Verify order eligibility (must be paid and delivered)
  const isPaid = order.payment_status === 'paid';
  const isDelivered =
    ['delivered', 'completed'].includes(order.status) ||
    (await (async () => {
      const [events] = await pool.query(
        `SELECT id FROM order_delivery_events WHERE order_id = ? AND delivered_at IS NOT NULL LIMIT 1`,
        [order.id]
      );
      return events.length > 0;
    })());

  if (!isPaid || !isDelivered) {
    return {
      qualified: false,
      reason: 'Đơn hàng chưa thanh toán đủ hoặc chưa được xác nhận giao hàng.',
    };
  }

  // 4. Check rule status from loyalty_rules
  const [ruleRows] = await pool.query(
    `SELECT config_value, status FROM loyalty_rules WHERE rule_code = 'rule_referral_reward' LIMIT 1`
  );

  const rule = ruleRows[0];
  const isApproved = rule && rule.status === 'approved';

  // If rule is NOT approved (e.g. draft), transition to qualified without issuing points
  if (!isApproved) {
    await pool.query(
      `UPDATE referral_attributions 
       SET status = 'qualified', qualified_at = NOW(), referred_order_id = ?
       WHERE id = ?`,
      [order.id, attr.id]
    );

    return {
      qualified: true,
      rewarded: false,
      attributionId: attr.id,
      status: 'qualified',
      reason: 'Chương trình thưởng giới thiệu hiện đang ở chế độ DRAFT (chưa được quản trị viên phê duyệt chính thức). Điểm thưởng chưa được ghi nhận vào tài khoản.',
    };
  }

  // 5. Rule IS approved: Parse config and issue points atomically
  let config = {};
  try {
    config = typeof rule.config_value === 'string' ? JSON.parse(rule.config_value) : rule.config_value;
  } catch {
    config = { referrer_points: 50, referee_points: 20 };
  }

  const referrerPoints = config.referrer_points || 50;
  const refereePoints = config.referee_points || 20;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Idempotency check with lock
    const [lockedAttr] = await connection.query(
      `SELECT status FROM referral_attributions WHERE id = ? FOR UPDATE`,
      [attr.id]
    );
    if (lockedAttr[0].status === 'rewarded') {
      await connection.rollback();
      return { qualified: true, alreadyRewarded: true };
    }

    // A. Credit Referrer
    await creditReferralPoints(
      connection,
      attr.referrer_user_id,
      referrerPoints,
      `referral:${order.id}:referrer`,
      `Thưởng giới thiệu bạn bè thành công (Mã đơn: ${order.order_code})`,
      order.order_code
    );

    // B. Credit Referee
    await creditReferralPoints(
      connection,
      attr.referred_user_id,
      refereePoints,
      `referral:${order.id}:referee`,
      `Thưởng chào mừng bạn mới từ mã giới thiệu (Mã đơn: ${order.order_code})`,
      order.order_code
    );

    // C. Record in referral_rewards
    await connection.query(
      `INSERT INTO referral_rewards 
        (attribution_id, recipient_user_id, reward_type, reward_value_type, reward_value, status, issued_at)
       VALUES 
        (?, ?, 'referrer', 'loyalty_points', ?, 'issued', NOW()),
        (?, ?, 'referee', 'loyalty_points', ?, 'issued', NOW())`,
      [
        attr.id, attr.referrer_user_id, referrerPoints,
        attr.id, attr.referred_user_id, refereePoints,
      ]
    );

    // D. Update attribution to rewarded
    await connection.query(
      `UPDATE referral_attributions 
       SET status = 'rewarded', qualified_at = NOW(), rewarded_at = NOW(), referred_order_id = ?
       WHERE id = ?`,
      [order.id, attr.id]
    );

    // E. Update successful_referrals counter
    await connection.query(
      `UPDATE referral_codes SET successful_referrals = successful_referrals + 1 WHERE id = ?`,
      [attr.referral_code_id]
    );

    await connection.commit();

    return {
      qualified: true,
      rewarded: true,
      attributionId: attr.id,
      referrerPoints,
      refereePoints,
      message: 'Trao thưởng giới thiệu thành công cho người giới thiệu và khách hàng mới.',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Helper to credit loyalty points for referral inside transaction.
 */
async function creditReferralPoints(connection, userId, points, sourceRef, reason, orderCode) {
  // Ensure loyalty account exists
  let [accRows] = await connection.query(
    `SELECT id, available_points, lifetime_points, current_tier FROM loyalty_accounts WHERE user_id = ? LIMIT 1 FOR UPDATE`,
    [userId]
  );

  let account;
  if (accRows.length === 0) {
    await connection.query(
      `INSERT INTO loyalty_accounts (user_id, available_points, lifetime_points, current_tier) VALUES (?, 0, 0, 'member')`,
      [userId]
    );
    const [newAcc] = await connection.query(
      `SELECT id, available_points, lifetime_points, current_tier FROM loyalty_accounts WHERE user_id = ? LIMIT 1 FOR UPDATE`,
      [userId]
    );
    account = newAcc[0];
  } else {
    account = accRows[0];
  }

  const newAvailable = account.available_points + points;
  const newLifetime = account.lifetime_points + points;

  // Update account balance
  await connection.query(
    `UPDATE loyalty_accounts SET available_points = ?, lifetime_points = ?, updated_at = NOW() WHERE id = ?`,
    [newAvailable, newLifetime, account.id]
  );

  // Insert ledger transaction
  await connection.query(
    `INSERT INTO loyalty_transactions 
      (account_id, user_id, transaction_type, points, balance_after, source_reference, reason, order_code)
     VALUES (?, ?, 'earn', ?, ?, ?, ?, ?)`,
    [account.id, userId, points, newAvailable, sourceRef, reason, orderCode]
  );
}

/**
 * Customer fetches their own referral dashboard stats.
 */
export async function getMyReferralStats(userId) {
  const codeData = await getOrCreateReferralCode(userId);

  // List attributions
  const [attributions] = await pool.query(
    `SELECT ra.id, ra.referred_user_id, ra.status, ra.created_at, ra.qualified_at, ra.rewarded_at,
            rr.reward_value AS points_earned
     FROM referral_attributions ra
     LEFT JOIN referral_rewards rr ON ra.id = rr.attribution_id AND rr.recipient_user_id = ?
     WHERE ra.referrer_user_id = ?
     ORDER BY ra.created_at DESC`,
    [userId, userId]
  );

  // Calculate total points earned from referrals
  const totalPointsEarned = attributions.reduce((sum, a) => sum + (parseInt(a.points_earned, 10) || 0), 0);

  // Mask referee user IDs for privacy
  const maskedAttributions = attributions.map((a) => ({
    id: a.id,
    referredUserMasked: maskUserId(a.referred_user_id),
    status: a.status,
    pointsEarned: a.points_earned || 0,
    createdAt: a.created_at,
    qualifiedAt: a.qualified_at,
    rewardedAt: a.rewarded_at,
  }));

  return {
    referralCode: codeData.referralCode,
    shareUrl: codeData.shareUrl,
    totalReferrals: codeData.totalReferrals,
    successfulReferrals: codeData.successfulReferrals,
    totalPointsEarned,
    attributions: maskedAttributions,
  };
}

function maskUserId(userId) {
  if (!userId || typeof userId !== 'string') return 'Khách hàng Lumina';
  if (userId.length <= 4) return userId;
  return `${userId.slice(0, 2)}***${userId.slice(-2)}`;
}

/**
 * Admin: List all referrals with pagination and filters.
 */
export async function adminGetReferrals({ page = 1, limit = 20, status = 'all' } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  let whereClause = '1=1';
  const params = [];

  if (status && status !== 'all') {
    whereClause += ' AND ra.status = ?';
    params.push(status);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM referral_attributions ra WHERE ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT ra.id, ra.referral_code_id, rc.referral_code, ra.referrer_user_id,
            ra.referred_user_id, ra.referred_order_id, ra.status, ra.idempotency_key,
            ra.rejection_reason, ra.created_at, ra.qualified_at, ra.rewarded_at,
            o.order_code
     FROM referral_attributions ra
     LEFT JOIN referral_codes rc ON ra.referral_code_id = rc.id
     LEFT JOIN orders o ON ra.referred_order_id = o.id
     WHERE ${whereClause}
     ORDER BY ra.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    referrals: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

/**
 * Admin: Flag or update referral attribution (for fraud investigation).
 */
export async function adminReviewReferral({ adminId, attributionId, status, rejectionReason }) {
  const parsedId = parseInt(attributionId, 10);
  if (isNaN(parsedId)) {
    throw new BadRequestError('Mã giới thiệu không hợp lệ.');
  }

  const validStatuses = ['pending', 'qualified', 'rewarded', 'rejected', 'review'];
  if (!validStatuses.includes(status)) {
    throw new BadRequestError(`Trạng thái không hợp lệ. Cho phép: ${validStatuses.join(', ')}`);
  }

  await pool.query(
    `UPDATE referral_attributions 
     SET status = ?, rejection_reason = ? 
     WHERE id = ?`,
    [status, rejectionReason || null, parsedId]
  );

  return {
    success: true,
    attributionId: parsedId,
    status,
    rejectionReason,
  };
}

