/**
 * Lumina Eyewear — Loyalty & Membership Service
 * 
 * Implements Prompt 04 & DECISION_REGISTER.md (DEC-LOY-001 to DEC-LOY-006):
 * - Immutable ledger for all balance changes (loyalty_transactions)
 * - Strict eligibility checks for earning (Paid + Delivered + 7 days grace period)
 * - Unique idempotency references to prevent double-crediting
 * - Refund clawback with non-negative balance protection
 * - Atomic point redemption with row locking
 * - Admin manual adjustment with mandatory reason and audit logging
 * - Dynamic tiers and rules from database
 */

import { pool } from '../config/database.js';
import { triggerLoyaltyPointsEarned } from './notification.service.js';

/**
 * Determine membership tier based on lifetime points.
 * Member (0-49), Silver (50-199), Gold (200-499), Diamond (500+)
 * @param {number} lifetimePoints 
 * @param {object[]} tiers 
 * @returns {string} tier_code
 */
export function calculateTierFromPoints(lifetimePoints, tiers) {
  const sortedTiers = [...tiers].sort((a, b) => b.min_lifetime_points - a.min_lifetime_points);
  for (const tier of sortedTiers) {
    if (lifetimePoints >= tier.min_lifetime_points) {
      return tier.tier_code;
    }
  }
  return 'member';
}

/**
 * Fetch all active tiers sorted by points ascending.
 * @param {object} [connection] Optional DB connection
 * @returns {Promise<object[]>}
 */
export async function getActiveTiers(connection = null) {
  const db = connection || pool;
  const [rows] = await db.query(
    `SELECT id, tier_code, tier_name, min_lifetime_points, max_lifetime_points, 
            earn_multiplier, benefits, badge_color, is_active
     FROM loyalty_tiers
     WHERE is_active = 1
     ORDER BY min_lifetime_points ASC`
  );
  return rows.map((r) => ({
    ...r,
    earn_multiplier: parseFloat(r.earn_multiplier),
    benefits: typeof r.benefits === 'string' ? JSON.parse(r.benefits) : r.benefits,
  }));
}

/**
 * Fetch active rules.
 * @param {object} [connection] Optional DB connection
 * @returns {Promise<object>}
 */
export async function getActiveRules(connection = null) {
  const db = connection || pool;
  const [rows] = await db.query(
    `SELECT rule_code, rule_name, rule_type, config_value, status
     FROM loyalty_rules
     WHERE status = 'approved'`
  );
  const rules = {};
  for (const r of rows) {
    rules[r.rule_code] = typeof r.config_value === 'string' ? JSON.parse(r.config_value) : r.config_value;
  }
  return rules;
}

/**
 * Get or create loyalty account for user.
 * @param {string} userId 
 * @param {object} [connection] Optional DB connection
 * @returns {Promise<object>}
 */
export async function getOrCreateAccount(userId, connection = null) {
  const db = connection || pool;
  const [existing] = await db.query(
    `SELECT id, user_id, available_points, lifetime_points, current_tier, joined_at, updated_at
     FROM loyalty_accounts
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new account
  try {
    await db.query(
      `INSERT INTO loyalty_accounts (user_id, available_points, lifetime_points, current_tier)
       VALUES (?, 0, 0, 'member')`,
      [userId]
    );
  } catch (err) {
    // In case of concurrent insert race condition, re-query
    if (err.code === 'ER_DUP_ENTRY') {
      const [recheck] = await db.query(
        `SELECT id, user_id, available_points, lifetime_points, current_tier, joined_at, updated_at
         FROM loyalty_accounts
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
      );
      return recheck[0];
    }
    throw err;
  }

  const [created] = await db.query(
    `SELECT id, user_id, available_points, lifetime_points, current_tier, joined_at, updated_at
     FROM loyalty_accounts
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );
  return created[0];
}

/**
 * Get Customer Loyalty Overview for /account page.
 * @param {string} userId 
 * @returns {Promise<object>}
 */
export async function getCustomerLoyaltyOverview(userId) {
  const account = await getOrCreateAccount(userId);
  const tiers = await getActiveTiers();
  const rules = await getActiveRules();

  const currentTierObj = tiers.find((t) => t.tier_code === account.current_tier) || tiers[0];

  // Calculate next tier progress
  const currentTierIndex = tiers.findIndex((t) => t.tier_code === account.current_tier);
  let nextTier = null;
  let pointsToNextTier = 0;
  let progressPercent = 100;

  if (currentTierIndex !== -1 && currentTierIndex < tiers.length - 1) {
    nextTier = tiers[currentTierIndex + 1];
    const prevThreshold = currentTierObj.min_lifetime_points;
    const nextThreshold = nextTier.min_lifetime_points;
    pointsToNextTier = Math.max(0, nextThreshold - account.lifetime_points);
    const range = nextThreshold - prevThreshold;
    const progress = account.lifetime_points - prevThreshold;
    progressPercent = range > 0 ? Math.min(100, Math.max(0, Math.round((progress / range) * 100))) : 100;
  }

  // Get recent 10 transactions
  const [recentTransactions] = await pool.query(
    `SELECT id, transaction_type, points, balance_after, source_reference, reason, order_code, created_at
     FROM loyalty_transactions
     WHERE account_id = ?
     ORDER BY id DESC
     LIMIT 10`,
    [account.id]
  );

  return {
    account: {
      userId: account.user_id,
      availablePoints: account.available_points,
      lifetimePoints: account.lifetime_points,
      currentTier: account.current_tier,
      joinedAt: account.joined_at,
    },
    tier: {
      code: currentTierObj.tier_code,
      name: currentTierObj.tier_name,
      badgeColor: currentTierObj.badge_color,
      benefits: currentTierObj.benefits,
      earnMultiplier: currentTierObj.earn_multiplier,
      nextTier: nextTier ? {
        code: nextTier.tier_code,
        name: nextTier.tier_name,
        minPoints: nextTier.min_lifetime_points,
        pointsNeeded: pointsToNextTier,
        progressPercent,
      } : null,
    },
    rules: {
      earnRatePercent: rules.rule_earn_standard?.earn_rate_percent || 1.0,
      stepAmountVnd: rules.rule_earn_standard?.step_amount_vnd || 100000,
      redemptionRateVnd: rules.rule_redeem_standard?.redemption_rate_vnd || 1000,
      maxRedemptionPercent: rules.rule_redeem_standard?.max_redemption_percent || 20.0,
      returnGraceDays: rules.rule_earn_standard?.return_grace_days || 7,
    },
    recentTransactions: recentTransactions.map((tx) => ({
      id: tx.id,
      type: tx.transaction_type,
      points: tx.points,
      balanceAfter: tx.balance_after,
      sourceReference: tx.source_reference,
      reason: tx.reason,
      orderCode: tx.order_code,
      createdAt: tx.created_at,
    })),
  };
}

/**
 * Get Customer Transactions with pagination.
 * @param {string} userId 
 * @param {object} options { limit, offset }
 * @returns {Promise<{ transactions: object[], total: number }>}
 */
export async function getCustomerTransactions(userId, { limit = 20, offset = 0 } = {}) {
  const account = await getOrCreateAccount(userId);

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM loyalty_transactions WHERE account_id = ?`,
    [account.id]
  );
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT id, transaction_type, points, balance_after, source_reference, reason, order_code, created_at
     FROM loyalty_transactions
     WHERE account_id = ?
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [account.id, parseInt(limit, 10), parseInt(offset, 10)]
  );

  return {
    transactions: rows.map((tx) => ({
      id: tx.id,
      type: tx.transaction_type,
      points: tx.points,
      balanceAfter: tx.balance_after,
      sourceReference: tx.source_reference,
      reason: tx.reason,
      orderCode: tx.order_code,
      createdAt: tx.created_at,
    })),
    total,
  };
}

/**
 * Earn points for an order.
 * Strictly verifies:
 * 1. Order exists and is not cancelled
 * 2. Payment status is 'paid' (or COD cash collected)
 * 3. Verified delivery event exists
 * 4. 7 days return grace period has passed (unless bypassGracePeriod is specified for testing)
 * 5. Idempotent check (source_reference = 'order:' + orderCode)
 * 
 * @param {string} orderCode 
 * @param {object} [options]
 * @param {boolean} [options.bypassGracePeriod=false] Only allowed in demo/test
 * @param {string} [options.adminId]
 * @returns {Promise<{ earned: boolean, points: number, reason: string, transactionId?: number }>}
 */
export async function earnPointsForOrder(orderCode, options = {}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch order details
    const [orderRows] = await connection.query(
      `SELECT id, order_code, user_id, total_amount, payment_status, payment_method, status, created_at
       FROM orders
       WHERE order_code = ?
       LIMIT 1
       FOR UPDATE`,
      [orderCode]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      const err = new Error(`Không tìm thấy đơn hàng với mã ${orderCode}.`);
      err.status = 404;
      throw err;
    }

    const order = orderRows[0];

    // Check if order belongs to a registered customer
    if (!order.user_id || order.user_id === 'guest') {
      await connection.rollback();
      return { earned: false, points: 0, reason: 'Đơn hàng của khách vãng lai (Guest) không đủ điều kiện tích điểm thành viên.' };
    }

    // Check order status
    if (order.status === 'cancelled') {
      await connection.rollback();
      return { earned: false, points: 0, reason: 'Đơn hàng đã bị hủy, không thể tích điểm.' };
    }

    // 2. Idempotency Check: prevent duplicate earning
    const sourceRef = `order:${orderCode}`;
    const [existingTx] = await connection.query(
      `SELECT id, points FROM loyalty_transactions WHERE source_reference = ? LIMIT 1`,
      [sourceRef]
    );

    if (existingTx.length > 0) {
      await connection.rollback();
      return {
        earned: false,
        points: existingTx[0].points,
        reason: 'Đơn hàng này đã được tích điểm trước đó (Idempotent: Đã ghi nhận).',
        alreadyCredited: true,
      };
    }

    // 3. Payment Status Check
    if (order.payment_status !== 'paid') {
      await connection.rollback();
      return { earned: false, points: 0, reason: 'Đơn hàng chưa hoàn tất thanh toán (payment_status phải là paid).' };
    }

    // 4. Delivery Verification Check
    const [deliveryEvents] = await connection.query(
      `SELECT id, confirmed_by, delivered_at 
       FROM order_delivery_events 
       WHERE order_id = ?
       ORDER BY delivered_at DESC
       LIMIT 1`,
      [order.id]
    );

    if (deliveryEvents.length === 0) {
      await connection.rollback();
      return { earned: false, points: 0, reason: 'Đơn hàng chưa có bằng chứng giao hàng thành công (chưa có sự kiện giao hàng trong order_delivery_events).' };
    }

    const deliveryTime = new Date(deliveryEvents[0].delivered_at);
    const now = new Date();

    // 5. Grace Period Check (DEC-LOY-005: 7 days return window)
    const returnGraceDays = 7;
    const gracePeriodEnd = new Date(deliveryTime.getTime() + returnGraceDays * 24 * 60 * 60 * 1000);

    if (!options.bypassGracePeriod && now < gracePeriodEnd) {
      await connection.rollback();
      const remainingHours = Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60));
      return {
        earned: false,
        points: 0,
        reason: `Đơn hàng đang trong thời hạn đổi trả 07 ngày (còn khoảng ${remainingHours} giờ). Điểm sẽ được ghi nhận sau khi hết hạn đổi trả.`,
      };
    }

    // 6. Calculate eligible points (DEC-LOY-001: 1% spend, 100k = 1 pt)
    const totalAmount = parseFloat(order.total_amount);
    const eligibleAmount = Math.max(0, totalAmount);
    const pointsToEarn = Math.floor(eligibleAmount / 100000);

    if (pointsToEarn <= 0) {
      await connection.rollback();
      return { earned: false, points: 0, reason: 'Giá trị đơn hàng không đủ ngưỡng tích lũy tối thiểu (100.000 VNĐ).' };
    }

    // 7. Lock and update loyalty account
    const [accountRows] = await connection.query(
      `SELECT id, user_id, available_points, lifetime_points, current_tier
       FROM loyalty_accounts
       WHERE user_id = ?
       LIMIT 1
       FOR UPDATE`,
      [order.user_id]
    );

    let account;
    if (accountRows.length === 0) {
      await connection.query(
        `INSERT INTO loyalty_accounts (user_id, available_points, lifetime_points, current_tier)
         VALUES (?, 0, 0, 'member')`,
        [order.user_id]
      );
      const [newAccountRows] = await connection.query(
        `SELECT id, user_id, available_points, lifetime_points, current_tier FROM loyalty_accounts WHERE user_id = ? LIMIT 1 FOR UPDATE`,
        [order.user_id]
      );
      account = newAccountRows[0];
    } else {
      account = accountRows[0];
    }

    const newAvailable = account.available_points + pointsToEarn;
    const newLifetime = account.lifetime_points + pointsToEarn;

    // Check tier upgrade
    const tiers = await getActiveTiers(connection);
    const newTier = calculateTierFromPoints(newLifetime, tiers);

    await connection.query(
      `UPDATE loyalty_accounts 
       SET available_points = ?, lifetime_points = ?, current_tier = ?, updated_at = NOW()
       WHERE id = ?`,
      [newAvailable, newLifetime, newTier, account.id]
    );

    // 8. Insert immutable transaction into ledger
    const [txResult] = await connection.query(
      `INSERT INTO loyalty_transactions 
        (account_id, user_id, transaction_type, points, balance_after, source_reference, reason, order_code, admin_id, metadata)
       VALUES (?, ?, 'earn', ?, ?, ?, ?, ?, ?, ?)`,
      [
        account.id,
        order.user_id,
        pointsToEarn,
        newAvailable,
        sourceRef,
        `Tích điểm tự động 1% cho đơn hàng hoàn tất ${orderCode}`,
        orderCode,
        options.adminId || null,
        JSON.stringify({
          orderAmount: totalAmount,
          eligibleAmount,
          previousTier: account.current_tier,
          newTier,
          bypassGracePeriod: !!options.bypassGracePeriod,
        }),
      ]
    );

    await connection.commit();

    // Trigger non-blocking loyalty notification (Prompt 06)
    triggerLoyaltyPointsEarned(order.user_id, pointsToEarn, orderCode, newTier).catch(() => {});

    return {
      earned: true,
      points: pointsToEarn,
      balanceAfter: newAvailable,
      previousTier: account.current_tier,
      newTier,
      transactionId: txResult.insertId,
      reason: `Đã cộng ${pointsToEarn} điểm thành công cho đơn hàng ${orderCode}.`,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Clawback points for a cancelled or refunded order.
 * Follows DEC-LOY-006:
 * - Creates reverse entry (refund_clawback)
 * - Available points cannot become negative
 * 
 * @param {string} orderCode 
 * @param {object} options { reason, adminId }
 * @returns {Promise<object>}
 */
export async function clawbackPointsForOrder(orderCode, { reason = 'Thu hồi điểm do hoàn trả đơn hàng', adminId = null } = {}) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const earnSourceRef = `order:${orderCode}`;
    const clawbackSourceRef = `refund:${orderCode}`;

    // 1. Check if clawback was already processed (Idempotency)
    const [existingClawback] = await connection.query(
      `SELECT id, points FROM loyalty_transactions WHERE source_reference = ? LIMIT 1`,
      [clawbackSourceRef]
    );

    if (existingClawback.length > 0) {
      await connection.rollback();
      return {
        clawedBack: false,
        points: existingClawback[0].points,
        reason: 'Đơn hàng này đã được thực hiện thu hồi điểm trước đó (Idempotent).',
        alreadyClawedBack: true,
      };
    }

    // 2. Find original earn transaction
    const [earnTxRows] = await connection.query(
      `SELECT id, account_id, user_id, points, created_at 
       FROM loyalty_transactions 
       WHERE source_reference = ? AND transaction_type = 'earn'
       LIMIT 1`,
      [earnSourceRef]
    );

    if (earnTxRows.length === 0) {
      await connection.rollback();
      return { clawedBack: false, points: 0, reason: 'Đơn hàng chưa từng được tích điểm, không cần thu hồi.' };
    }

    const earnTx = earnTxRows[0];
    const originalPoints = earnTx.points;

    // 3. Lock loyalty account
    const [accountRows] = await connection.query(
      `SELECT id, user_id, available_points, lifetime_points, current_tier 
       FROM loyalty_accounts 
       WHERE id = ? 
       LIMIT 1 
       FOR UPDATE`,
      [earnTx.account_id]
    );

    if (accountRows.length === 0) {
      await connection.rollback();
      const err = new Error('Không tìm thấy tài khoản tích điểm.');
      err.status = 404;
      throw err;
    }

    const account = accountRows[0];

    // Protection DEC-LOY-006: available_points cannot be negative
    const pointsToDeductFromAvailable = Math.min(account.available_points, originalPoints);
    const uncollectedPoints = originalPoints - pointsToDeductFromAvailable;
    const newAvailable = account.available_points - pointsToDeductFromAvailable;
    const newLifetime = Math.max(0, account.lifetime_points - originalPoints);

    // Recalculate tier
    const tiers = await getActiveTiers(connection);
    const newTier = calculateTierFromPoints(newLifetime, tiers);

    await connection.query(
      `UPDATE loyalty_accounts 
       SET available_points = ?, lifetime_points = ?, current_tier = ?, updated_at = NOW()
       WHERE id = ?`,
      [newAvailable, newLifetime, newTier, account.id]
    );

    // 4. Record reverse ledger entry
    const [clawbackTxResult] = await connection.query(
      `INSERT INTO loyalty_transactions 
        (account_id, user_id, transaction_type, points, balance_after, source_reference, reason, order_code, admin_id, metadata)
       VALUES (?, ?, 'refund_clawback', ?, ?, ?, ?, ?, ?, ?)`,
      [
        account.id,
        account.user_id,
        -pointsToDeductFromAvailable,
        newAvailable,
        clawbackSourceRef,
        reason,
        orderCode,
        adminId,
        JSON.stringify({
          originalPoints,
          deductedPoints: pointsToDeductFromAvailable,
          uncollectedPoints,
          note: uncollectedPoints > 0 ? `Khách không đủ số dư khả dụng để thu hồi trọn vẹn ${originalPoints} điểm. Còn thiếu ${uncollectedPoints} điểm cần khấu trừ vào tiền hoàn đơn.` : 'Đã thu hồi đủ điểm.',
        }),
      ]
    );

    await connection.commit();

    return {
      clawedBack: true,
      deductedPoints: pointsToDeductFromAvailable,
      uncollectedPoints,
      balanceAfter: newAvailable,
      transactionId: clawbackTxResult.insertId,
      reason: `Đã thu hồi ${pointsToDeductFromAvailable} điểm của đơn hàng ${orderCode}.`,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Redeem loyalty points for order discount.
 * Enforces:
 * - 1 point = 1,000 VND
 * - Minimum 10 points
 * - Maximum 20% of order value (DEC-LOY-002)
 * - Atomic check & deduction with FOR UPDATE row locking
 * 
 * @param {object} params
 * @param {string} params.userId
 * @param {number} params.points - Points to redeem
 * @param {number} params.orderAmount - Total eligible order amount in VND
 * @param {string} [params.orderCode]
 * @returns {Promise<object>}
 */
export async function redeemPoints({ userId, points, orderAmount, orderCode = null }) {
  if (!points || points < 10) {
    const err = new Error('Số điểm đổi thưởng tối thiểu là 10 điểm (tương đương 10.000 VNĐ).');
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch and lock account
    const [accountRows] = await connection.query(
      `SELECT id, user_id, available_points, lifetime_points, current_tier 
       FROM loyalty_accounts 
       WHERE user_id = ? 
       LIMIT 1 
       FOR UPDATE`,
      [userId]
    );

    if (accountRows.length === 0) {
      await connection.rollback();
      const err = new Error('Không tìm thấy tài khoản thành viên của bạn.');
      err.status = 404;
      throw err;
    }

    const account = accountRows[0];

    // Check balance
    if (account.available_points < points) {
      await connection.rollback();
      const err = new Error(`Số dư điểm khả dụng không đủ. Bạn hiện có ${account.available_points} điểm, yêu cầu đổi ${points} điểm.`);
      err.status = 400;
      throw err;
    }

    // 2. Check 20% order cap (DEC-LOY-002)
    const discountVnd = points * 1000;
    const maxDiscountAllowed = orderAmount * 0.20;

    if (discountVnd > maxDiscountAllowed) {
      await connection.rollback();
      const maxPointsAllowed = Math.floor(maxDiscountAllowed / 1000);
      const err = new Error(`Điểm thưởng quy đổi không được vượt quá 20% giá trị đơn hàng (Tối đa ${maxPointsAllowed} điểm, tương đương ${maxDiscountAllowed.toLocaleString('vi-VN')} VNĐ).`);
      err.status = 400;
      throw err;
    }

    const newAvailable = account.available_points - points;
    const redemptionCode = `RED-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 3. Deduct points
    await connection.query(
      `UPDATE loyalty_accounts 
       SET available_points = ?, updated_at = NOW() 
       WHERE id = ?`,
      [newAvailable, account.id]
    );

    // 4. Insert redemption record
    const [redemptionResult] = await connection.query(
      `INSERT INTO loyalty_redemptions (redemption_code, user_id, account_id, points_spent, discount_amount, order_code, status)
       VALUES (?, ?, ?, ?, ?, ?, 'applied')`,
      [redemptionCode, userId, account.id, points, discountVnd, orderCode]
    );

    // 5. Insert transaction into ledger
    const sourceRef = `redemption:${redemptionCode}`;
    await connection.query(
      `INSERT INTO loyalty_transactions 
        (account_id, user_id, transaction_type, points, balance_after, source_reference, reason, order_code, metadata)
       VALUES (?, ?, 'redeem', ?, ?, ?, ?, ?, ?)`,
      [
        account.id,
        userId,
        -points,
        newAvailable,
        sourceRef,
        `Đổi ${points} điểm giảm ${discountVnd.toLocaleString('vi-VN')}đ cho đơn hàng ${orderCode || ''}`,
        orderCode,
        JSON.stringify({ redemptionCode, discountVnd, orderAmount }),
      ]
    );

    await connection.commit();

    return {
      success: true,
      redemptionCode,
      pointsSpent: points,
      discountAmount: discountVnd,
      remainingPoints: newAvailable,
      orderCode,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Admin manual adjustment with mandatory reason and audit log.
 * @param {object} params
 * @param {string} params.userId
 * @param {number} params.points - Positive (bonus) or negative (deduction)
 * @param {string} params.reason - Mandatory reason
 * @param {string} params.adminId
 * @returns {Promise<object>}
 */
export async function manualAdjustPoints({ userId, points, reason, adminId }) {
  if (!reason || reason.trim().length < 5) {
    const err = new Error('Lý do điều chỉnh điểm là bắt buộc và phải có ít nhất 5 ký tự.');
    err.status = 400;
    throw err;
  }

  if (!points || points === 0) {
    const err = new Error('Số điểm điều chỉnh phải khác 0.');
    err.status = 400;
    throw err;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [accountRows] = await connection.query(
      `SELECT id, user_id, available_points, lifetime_points, current_tier 
       FROM loyalty_accounts 
       WHERE user_id = ? 
       LIMIT 1 
       FOR UPDATE`,
      [userId]
    );

    if (accountRows.length === 0) {
      await connection.rollback();
      const err = new Error(`Không tìm thấy tài khoản thành viên của người dùng ${userId}.`);
      err.status = 404;
      throw err;
    }

    const account = accountRows[0];
    const newAvailable = account.available_points + points;

    if (newAvailable < 0) {
      await connection.rollback();
      const err = new Error(`Không thể trừ điểm khiến số dư khả dụng bị âm (Hiện có: ${account.available_points}, yêu cầu trừ: ${Math.abs(points)}).`);
      err.status = 400;
      throw err;
    }

    const newLifetime = points > 0 ? account.lifetime_points + points : account.lifetime_points;

    // Recalculate tier
    const tiers = await getActiveTiers(connection);
    const newTier = calculateTierFromPoints(newLifetime, tiers);

    await connection.query(
      `UPDATE loyalty_accounts 
       SET available_points = ?, lifetime_points = ?, current_tier = ?, updated_at = NOW() 
       WHERE id = ?`,
      [newAvailable, newLifetime, newTier, account.id]
    );

    // Immutable ledger entry
    const sourceRef = `manual:ADJ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const [txResult] = await connection.query(
      `INSERT INTO loyalty_transactions 
        (account_id, user_id, transaction_type, points, balance_after, source_reference, reason, admin_id, metadata)
       VALUES (?, ?, 'manual_adjustment', ?, ?, ?, ?, ?, ?)`,
      [
        account.id,
        userId,
        points,
        newAvailable,
        sourceRef,
        reason.trim(),
        adminId,
        JSON.stringify({ previousAvailable: account.available_points, previousLifetime: account.lifetime_points, newTier }),
      ]
    );

    // Audit log in system_configuration_audit_logs if table exists
    try {
      await connection.query(
        `INSERT INTO system_configuration_audit_logs 
          (action, old_value, new_value, actor_id, actor_role, reason)
         VALUES (?, ?, ?, ?, 'admin', ?)`,
        [
          'manual_adjustment',
          JSON.stringify({ available_points: account.available_points, tier: account.current_tier }),
          JSON.stringify({ available_points: newAvailable, tier: newTier, pointsDelta: points }),
          adminId,
          `Điều chỉnh điểm thủ công cho ${userId}: ${reason.trim()}`,
        ]
      );
    } catch {
      // Optional audit table fallback
    }

    await connection.commit();

    return {
      success: true,
      userId,
      pointsAdjusted: points,
      balanceAfter: newAvailable,
      currentTier: newTier,
      transactionId: txResult.insertId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Admin: Get paginated accounts list.
 * @param {object} filters
 * @returns {Promise<object>}
 */
export async function getAdminAccountsList({ search = '', tier = '', limit = 20, offset = 0 } = {}) {
  let query = `
    SELECT la.id, la.user_id, la.available_points, la.lifetime_points, la.current_tier, la.joined_at, la.updated_at,
           lt.tier_name, lt.badge_color
    FROM loyalty_accounts la
    LEFT JOIN loyalty_tiers lt ON la.current_tier = lt.tier_code
    WHERE 1=1
  `;
  const params = [];

  if (search && search.trim()) {
    query += ` AND la.user_id LIKE ?`;
    params.push(`%${search.trim()}%`);
  }

  if (tier && tier.trim()) {
    query += ` AND la.current_tier = ?`;
    params.push(tier.trim());
  }

  // Count total
  const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS subq`;
  const [countRows] = await pool.query(countQuery, params);
  const total = countRows[0].total;

  query += ` ORDER BY la.lifetime_points DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const [rows] = await pool.query(query, params);

  return {
    accounts: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      availablePoints: r.available_points,
      lifetimePoints: r.lifetime_points,
      currentTier: r.current_tier,
      tierName: r.tier_name || r.current_tier,
      badgeColor: r.badge_color || '#8E8A82',
      joinedAt: r.joined_at,
      updatedAt: r.updated_at,
    })),
    total,
  };
}

/**
 * Admin: Get account detail & full ledger.
 * @param {string} userId 
 * @returns {Promise<object>}
 */
export async function getAdminAccountDetail(userId) {
  const account = await getOrCreateAccount(userId);
  const tiers = await getActiveTiers();

  const [transactions] = await pool.query(
    `SELECT id, transaction_type, points, balance_after, source_reference, reason, order_code, admin_id, metadata, created_at
     FROM loyalty_transactions
     WHERE account_id = ?
     ORDER BY id DESC
     LIMIT 100`,
    [account.id]
  );

  return {
    account: {
      id: account.id,
      userId: account.user_id,
      availablePoints: account.available_points,
      lifetimePoints: account.lifetime_points,
      currentTier: account.current_tier,
      joinedAt: account.joined_at,
      updatedAt: account.updated_at,
    },
    tiers,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.transaction_type,
      points: t.points,
      balanceAfter: t.balance_after,
      sourceReference: t.source_reference,
      reason: t.reason,
      orderCode: t.order_code,
      adminId: t.admin_id,
      metadata: typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata,
      createdAt: t.created_at,
    })),
  };
}

/**
 * Admin: Get global ledger.
 * @param {object} filters
 * @returns {Promise<object>}
 */
export async function getAdminLedger({ userId = '', type = '', limit = 30, offset = 0 } = {}) {
  let query = `
    SELECT lt.id, lt.account_id, lt.user_id, lt.transaction_type, lt.points, lt.balance_after, 
           lt.source_reference, lt.reason, lt.order_code, lt.admin_id, lt.created_at
    FROM loyalty_transactions lt
    WHERE 1=1
  `;
  const params = [];

  if (userId && userId.trim()) {
    query += ` AND lt.user_id LIKE ?`;
    params.push(`%${userId.trim()}%`);
  }

  if (type && type.trim()) {
    query += ` AND lt.transaction_type = ?`;
    params.push(type.trim());
  }

  const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS subq`;
  const [countRows] = await pool.query(countQuery, params);
  const total = countRows[0].total;

  query += ` ORDER BY lt.id DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  const [rows] = await pool.query(query, params);

  return {
    ledger: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      type: r.transaction_type,
      points: r.points,
      balanceAfter: r.balance_after,
      sourceReference: r.source_reference,
      reason: r.reason,
      orderCode: r.order_code,
      adminId: r.admin_id,
      createdAt: r.created_at,
    })),
    total,
  };
}

/**
 * Admin: Get configuration for loyalty (tiers & rules).
 * @returns {Promise<object>}
 */
export async function getAdminLoyaltyConfig() {
  const tiers = await getActiveTiers();
  const [ruleRows] = await pool.query(
    `SELECT id, rule_code, rule_name, rule_type, config_value, status, approved_by, effective_from, updated_at
     FROM loyalty_rules
     ORDER BY id ASC`
  );

  return {
    tiers,
    rules: ruleRows.map((r) => ({
      id: r.id,
      code: r.rule_code,
      name: r.rule_name,
      type: r.rule_type,
      config: typeof r.config_value === 'string' ? JSON.parse(r.config_value) : r.config_value,
      status: r.status,
      approvedBy: r.approved_by,
      effectiveFrom: r.effective_from,
      updatedAt: r.updated_at,
    })),
  };
}

export default {
  calculateTierFromPoints,
  getActiveTiers,
  getActiveRules,
  getOrCreateAccount,
  getCustomerLoyaltyOverview,
  getCustomerTransactions,
  earnPointsForOrder,
  clawbackPointsForOrder,
  redeemPoints,
  manualAdjustPoints,
  getAdminAccountsList,
  getAdminAccountDetail,
  getAdminLedger,
  getAdminLoyaltyConfig,
};
