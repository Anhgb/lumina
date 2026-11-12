/**
 * Lumina Eyewear — Loyalty & Membership Controllers
 * 
 * Handles Customer and Admin Loyalty operations.
 */

import {
  getCustomerLoyaltyOverview,
  getCustomerTransactions,
  getActiveTiers,
  getActiveRules,
  earnPointsForOrder,
  clawbackPointsForOrder,
  redeemPoints,
  manualAdjustPoints,
  getAdminAccountsList,
  getAdminAccountDetail,
  getAdminLedger,
  getAdminLoyaltyConfig,
} from '../services/loyalty.service.js';

/**
 * GET /api/me/loyalty — Get current customer's loyalty profile, tier & benefits
 */
export async function handleGetCustomerOverview(req, res, next) {
  try {
    const userId = req.user.id;
    const overview = await getCustomerLoyaltyOverview(userId);
    res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/me/loyalty/transactions — Paginated transaction history
 */
export async function handleGetCustomerTransactions(req, res, next) {
  try {
    const userId = req.user.id;
    const { limit, offset } = req.query;
    const result = await getCustomerTransactions(userId, { limit, offset });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/loyalty/tiers — Public view of membership tiers and benefits
 */
export async function handleGetPublicTiers(req, res, next) {
  try {
    const tiers = await getActiveTiers();
    const rules = await getActiveRules();
    res.status(200).json({
      success: true,
      data: {
        tiers,
        rules: {
          earnRatePercent: rules.rule_earn_standard?.earn_rate_percent || 1.0,
          redemptionRateVnd: rules.rule_redeem_standard?.redemption_rate_vnd || 1000,
          maxRedemptionPercent: rules.rule_redeem_standard?.max_redemption_percent || 20.0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/me/loyalty/redeem-preview — Preview discount and validate rules
 */
export async function handleRedeemPreview(req, res, next) {
  try {
    const userId = req.user.id;
    const { points, orderAmount } = req.body || {};

    if (!points || points <= 0 || !orderAmount || orderAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp số điểm và giá trị đơn hàng hợp lệ.',
      });
    }

    const overview = await getCustomerLoyaltyOverview(userId);
    const available = overview.account.availablePoints;

    const discountAmount = points * 1000;
    const maxDiscountAllowed = orderAmount * 0.20;
    const maxPointsAllowed = Math.floor(maxDiscountAllowed / 1000);

    const isPointsSufficient = available >= points;
    const isWithinCap = discountAmount <= maxDiscountAllowed;
    const isMinPointsMet = points >= 10;

    const isValid = isPointsSufficient && isWithinCap && isMinPointsMet;

    res.status(200).json({
      success: true,
      data: {
        pointsRequested: points,
        discountAmount,
        availablePoints: available,
        maxPointsAllowed,
        maxDiscountAllowed,
        isValid,
        reasons: [
          !isMinPointsMet ? 'Cần tối thiểu 10 điểm để quy đổi.' : null,
          !isPointsSufficient ? `Số dư khả dụng (${available} điểm) không đủ.` : null,
          !isWithinCap ? `Vượt quá 20% giá trị đơn hàng (tối đa ${maxPointsAllowed} điểm).` : null,
        ].filter(Boolean),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/me/loyalty/redeem — Execute point redemption
 */
export async function handleRedeemPoints(req, res, next) {
  try {
    const userId = req.user.id;
    const { points, orderAmount, orderCode } = req.body || {};

    const result = await redeemPoints({
      userId,
      points: parseInt(points, 10),
      orderAmount: parseFloat(orderAmount),
      orderCode,
    });

    res.status(200).json({
      success: true,
      message: `Đổi ${result.pointsSpent} điểm thành công, giảm ${result.discountAmount.toLocaleString('vi-VN')} VNĐ.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN CONTROLLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/loyalty/accounts — List member accounts
 */
export async function handleGetAdminAccounts(req, res, next) {
  try {
    const { search, tier, limit, offset } = req.query;
    const result = await getAdminAccountsList({ search, tier, limit, offset });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/loyalty/accounts/:userId — Account detail and ledger
 */
export async function handleGetAdminAccountDetail(req, res, next) {
  try {
    const { userId } = req.params;
    const detail = await getAdminAccountDetail(userId);
    res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/loyalty/accounts/:userId/adjust — Manual point adjustment with audit
 */
export async function handleAdminAdjustPoints(req, res, next) {
  try {
    const { userId } = req.params;
    const { points, reason } = req.body || {};
    const adminId = req.user?.id || 'admin';

    const result = await manualAdjustPoints({
      userId,
      points: parseInt(points, 10),
      reason,
      adminId,
    });

    res.status(200).json({
      success: true,
      message: `Điều chỉnh ${result.pointsAdjusted > 0 ? '+' : ''}${result.pointsAdjusted} điểm thành công cho người dùng ${userId}.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/loyalty/ledger — View global immutable transaction ledger
 */
export async function handleGetAdminLedger(req, res, next) {
  try {
    const { userId, type, limit, offset } = req.query;
    const result = await getAdminLedger({ userId, type, limit, offset });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/loyalty/orders/:orderCode/earn — Manually trigger or test earn for order
 */
export async function handleAdminEarnForOrder(req, res, next) {
  try {
    const { orderCode } = req.params;
    const { bypassGracePeriod } = req.body || {};
    const adminId = req.user?.id || 'admin';

    const result = await earnPointsForOrder(orderCode, {
      bypassGracePeriod: !!bypassGracePeriod,
      adminId,
    });

    res.status(200).json({
      success: true,
      message: result.reason,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/loyalty/orders/:orderCode/clawback — Trigger clawback on refund
 */
export async function handleAdminClawbackForOrder(req, res, next) {
  try {
    const { orderCode } = req.params;
    const { reason } = req.body || {};
    const adminId = req.user?.id || 'admin';

    const result = await clawbackPointsForOrder(orderCode, {
      reason: reason || 'Admin thu hồi điểm hoàn trả đơn hàng',
      adminId,
    });

    res.status(200).json({
      success: true,
      message: result.reason,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/loyalty/config — Get loyalty tiers and rules
 */
export async function handleGetAdminConfig(req, res, next) {
  try {
    const config = await getAdminLoyaltyConfig();
    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
}

