/**
 * Lumina Eyewear — Customer Retention & Admin Operations Service
 * 
 * Triển khai PROMPT 08:
 * Cung cấp công cụ đo lường chất lượng chăm sóc và hiệu quả giữ chân khách hàng từ dữ liệu MySQL có thật.
 * 
 * 8 CHỈ SỐ CỐT LÕI:
 * 1. Repeat Purchase Rate: Tỷ lệ khách có từ 2 đơn mua hợp lệ trở lên.
 * 2. Second Purchase Conversion: Tỷ lệ khách mua lần đầu phát sinh đơn thứ hai trong khung N ngày.
 * 3. Review Rate: Tỷ lệ sản phẩm đủ điều kiện có đánh giá xác thực (Verified Purchase).
 * 4. After-sales Volume: Số lượng phiếu hỗ trợ theo loại và trạng thái.
 * 5. Resolution Time (MTTR): Thời gian giải quyết yêu cầu trung bình (giờ/ngày).
 * 6. Loyalty Liability: Tổng điểm thưởng tồn đọng và nghĩa vụ tài chính quy đổi VNĐ.
 * 7. Referral Conversion: Tỷ lệ chuyển đổi mã giới thiệu thành đơn hàng hợp lệ.
 * 8. Notification Opt-in Rate: Tỷ lệ khách hàng đồng ý nhận từng nhóm thông báo.
 * 
 * NGUYÊN TẮC:
 * - Không bịa đặt chỉ số CLV hoặc Cohort Retention dài hạn khi dữ liệu chưa đủ 12-24 tháng.
 * - Mọi phép tính đều có công thức và định nghĩa minh bạch.
 */

import { pool } from '../config/database.js';

/**
 * Lấy báo cáo thống kê Retention & Hoạt động chăm sóc khách hàng toàn diện.
 * 
 * @param {object} options
 * @param {'30d'|'90d'|'all'} [options.period='all'] - Khoảng thời gian lọc đơn hàng
 * @param {number} [options.windowDays=90] - Khung ngày xét chuyển đổi đơn thứ 2
 * @returns {Promise<object>}
 */
export async function getRetentionAnalytics({ period = 'all', windowDays = 90 } = {}) {
  const safeWindowDays = Math.max(7, Math.min(365, parseInt(windowDays, 10) || 90));

  let orderDateFilter = '';
  const orderParams = [];

  if (period === '30d') {
    orderDateFilter = ' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
  } else if (period === '90d') {
    orderDateFilter = ' AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. REPEAT PURCHASE RATE (Tỷ lệ mua lại)
  // ─────────────────────────────────────────────────────────────────────────────
  const [repeatRows] = await pool.query(
    `SELECT 
      COUNT(*) AS totalCustomers,
      COUNT(CASE WHEN order_count >= 2 THEN 1 END) AS repeatCustomers,
      COUNT(CASE WHEN order_count = 1 THEN 1 END) AS singlePurchaseCustomers,
      COALESCE(SUM(order_count), 0) AS totalValidOrders
     FROM (
       SELECT user_id, COUNT(*) AS order_count
       FROM orders
       WHERE status != 'cancelled' AND user_id IS NOT NULL AND user_id != ''
       ${orderDateFilter}
       GROUP BY user_id
     ) AS cust_summary`,
    orderParams
  );

  const totalCustomers = parseInt(repeatRows[0]?.totalCustomers, 10) || 0;
  const repeatCustomers = parseInt(repeatRows[0]?.repeatCustomers, 10) || 0;
  const singlePurchaseCustomers = parseInt(repeatRows[0]?.singlePurchaseCustomers, 10) || 0;
  const totalValidOrders = parseInt(repeatRows[0]?.totalValidOrders, 10) || 0;
  const repeatPurchaseRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 10000) / 100 : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SECOND PURCHASE CONVERSION (Chuyển đổi phát sinh đơn thứ 2 trong N ngày)
  // ─────────────────────────────────────────────────────────────────────────────
  const [secondPurchaseRows] = await pool.query(
    `WITH RankedOrders AS (
      SELECT 
        user_id,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
      FROM orders
      WHERE status != 'cancelled' AND user_id IS NOT NULL AND user_id != ''
    )
    SELECT 
      o1.user_id,
      o1.created_at AS first_order_at,
      o2.created_at AS second_order_at,
      TIMESTAMPDIFF(DAY, o1.created_at, o2.created_at) AS days_to_second
    FROM RankedOrders o1
    LEFT JOIN RankedOrders o2 ON o1.user_id = o2.user_id AND o2.rn = 2
    WHERE o1.rn = 1`
  );

  const totalFirstTimeBuyers = secondPurchaseRows.length;
  const convertedBuyers = secondPurchaseRows.filter(
    (row) => row.second_order_at && row.days_to_second !== null && row.days_to_second <= safeWindowDays
  );
  const convertedCount = convertedBuyers.length;
  const secondPurchaseConversion = totalFirstTimeBuyers > 0
    ? Math.round((convertedCount / totalFirstTimeBuyers) * 10000) / 100
    : 0;

  const totalDays = convertedBuyers.reduce((sum, b) => sum + (b.days_to_second || 0), 0);
  const avgDaysToSecondPurchase = convertedCount > 0 ? Math.round((totalDays / convertedCount) * 10) / 10 : null;

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. REVIEW RATE & RATING QUALITY (Tỷ lệ đánh giá & chất lượng trải nghiệm)
  // ─────────────────────────────────────────────────────────────────────────────
  const [reviewMetrics] = await pool.query(
    `SELECT 
      COUNT(*) AS totalReviews,
      COUNT(CASE WHEN is_verified_purchase = 1 THEN 1 END) AS verifiedReviewsCount,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approvedReviewsCount,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejectedReviewsCount,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pendingReviewsCount,
      COALESCE(AVG(rating), 0) AS averageRating
     FROM product_reviews`
  );

  const [ratingDistRows] = await pool.query(
    `SELECT rating, COUNT(*) AS count
     FROM product_reviews
     WHERE status != 'rejected'
     GROUP BY rating
     ORDER BY rating DESC`
  );

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of ratingDistRows) {
    if (ratingDistribution[r.rating] !== undefined) {
      ratingDistribution[r.rating] = parseInt(r.count, 10) || 0;
    }
  }

  const [deliveredItemsRow] = await pool.query(
    `SELECT COUNT(oi.id) AS totalDeliveredItems
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.status = 'completed'`
  );

  const totalReviews = parseInt(reviewMetrics[0]?.totalReviews, 10) || 0;
  const verifiedReviewsCount = parseInt(reviewMetrics[0]?.verifiedReviewsCount, 10) || 0;
  const totalDeliveredItems = parseInt(deliveredItemsRow[0]?.totalDeliveredItems, 10) || 0;
  const reviewRate = totalDeliveredItems > 0
    ? Math.round((verifiedReviewsCount / totalDeliveredItems) * 10000) / 100
    : 0;
  const averageRating = Math.round((parseFloat(reviewMetrics[0]?.averageRating) || 0) * 10) / 10;

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. AFTER-SALES VOLUME & RESOLUTION TIME (Khối lượng hỗ trợ & MTTR)
  // ─────────────────────────────────────────────────────────────────────────────
  const [careMetrics] = await pool.query(
    `SELECT 
      COUNT(*) AS totalRequests,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) AS resolvedCount,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS inProgressCount,
      COUNT(CASE WHEN status = 'waiting_customer' THEN 1 END) AS waitingCustomerCount,
      COUNT(CASE WHEN status = 'reviewing' THEN 1 END) AS reviewingCount,
      COUNT(CASE WHEN status = 'submitted' THEN 1 END) AS submittedCount,
      COUNT(CASE WHEN status IN ('cancelled', 'rejected') THEN 1 END) AS closedOtherCount,
      COALESCE(AVG(CASE WHEN status = 'resolved' AND resolved_at IS NOT NULL 
        THEN TIMESTAMPDIFF(SECOND, created_at, resolved_at) / 3600.0 END), 0) AS avgResolutionHours
     FROM after_sales_requests`
  );

  const [careTypeRows] = await pool.query(
    `SELECT request_type, COUNT(*) AS count
     FROM after_sales_requests
     GROUP BY request_type
     ORDER BY count DESC`
  );

  const careByType = {};
  for (const r of careTypeRows) {
    careByType[r.request_type] = parseInt(r.count, 10) || 0;
  }

  const totalCareRequests = parseInt(careMetrics[0]?.totalRequests, 10) || 0;
  const resolvedCareCount = parseInt(careMetrics[0]?.resolvedCount, 10) || 0;
  const activeCareCount =
    (parseInt(careMetrics[0]?.submittedCount, 10) || 0) +
    (parseInt(careMetrics[0]?.reviewingCount, 10) || 0) +
    (parseInt(careMetrics[0]?.waitingCustomerCount, 10) || 0) +
    (parseInt(careMetrics[0]?.inProgressCount, 10) || 0);

  const avgResolutionHours = Math.round((parseFloat(careMetrics[0]?.avgResolutionHours) || 0) * 10) / 10;
  const avgResolutionDays = Math.round((avgResolutionHours / 24) * 10) / 10;

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. LOYALTY LIABILITY & OUTSTANDING POINTS (Nghĩa vụ điểm thưởng)
  // ─────────────────────────────────────────────────────────────────────────────
  const [loyaltyMetrics] = await pool.query(
    `SELECT 
      COUNT(*) AS totalAccounts,
      COALESCE(SUM(available_points), 0) AS totalOutstandingPoints,
      COALESCE(SUM(lifetime_points), 0) AS totalLifetimePoints,
      COUNT(CASE WHEN current_tier = 'member' THEN 1 END) AS memberCount,
      COUNT(CASE WHEN current_tier = 'silver' THEN 1 END) AS silverCount,
      COUNT(CASE WHEN current_tier = 'gold' THEN 1 END) AS goldCount,
      COUNT(CASE WHEN current_tier = 'diamond' THEN 1 END) AS diamondCount
     FROM loyalty_accounts`
  );

  const [loyaltyTxMetrics] = await pool.query(
    `SELECT 
      COALESCE(SUM(CASE WHEN points > 0 THEN points ELSE 0 END), 0) AS totalPointsEarned,
      COALESCE(SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END), 0) AS totalPointsRedeemed
     FROM loyalty_transactions`
  );

  const totalOutstandingPoints = parseInt(loyaltyMetrics[0]?.totalOutstandingPoints, 10) || 0;
  const totalLifetimePoints = parseInt(loyaltyMetrics[0]?.totalLifetimePoints, 10) || 0;
  const liabilityVnd = totalOutstandingPoints * 1000;
  const totalEarnedPoints = parseInt(loyaltyTxMetrics[0]?.totalPointsEarned, 10) || 0;
  const totalRedeemedPoints = parseInt(loyaltyTxMetrics[0]?.totalPointsRedeemed, 10) || 0;
  const redemptionRate = totalEarnedPoints > 0
    ? Math.round((totalRedeemedPoints / totalEarnedPoints) * 10000) / 100
    : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. REFERRAL CONVERSION (Hiệu quả giới thiệu bạn bè)
  // ─────────────────────────────────────────────────────────────────────────────
  const [referralMetrics] = await pool.query(
    `SELECT 
      COUNT(*) AS totalAttributions,
      COUNT(CASE WHEN status IN ('qualified', 'rewarded') THEN 1 END) AS convertedCount,
      COUNT(CASE WHEN status = 'rewarded' THEN 1 END) AS rewardedCount,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pendingCount,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejectedCount
     FROM referral_attributions`
  );

  const [referralCodesCountRow] = await pool.query(`SELECT COUNT(*) AS totalCodes FROM referral_codes`);

  const totalAttributions = parseInt(referralMetrics[0]?.totalAttributions, 10) || 0;
  const convertedReferrals = parseInt(referralMetrics[0]?.convertedCount, 10) || 0;
  const rewardedReferrals = parseInt(referralMetrics[0]?.rewardedCount, 10) || 0;
  const referralConversionRate = totalAttributions > 0
    ? Math.round((convertedReferrals / totalAttributions) * 10000) / 100
    : 0;
  const totalRewardedPoints = rewardedReferrals * 50; // 50 điểm mỗi lượt giới thiệu thành công

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. NOTIFICATION PREFERENCES & ENGAGEMENT (Tỷ lệ chấp thuận thông báo)
  // ─────────────────────────────────────────────────────────────────────────────
  const [prefMetrics] = await pool.query(
    `SELECT 
      COUNT(*) AS totalProfiles,
      COUNT(CASE WHEN care_reminders_inapp = 1 OR care_reminders_email = 1 THEN 1 END) AS careOptInCount,
      COUNT(CASE WHEN marketing_inapp = 1 OR marketing_email = 1 OR marketing_sms = 1 THEN 1 END) AS marketingOptInCount
     FROM notification_preferences`
  );

  const [logMetrics] = await pool.query(
    `SELECT 
      COUNT(*) AS totalLogs,
      COUNT(CASE WHEN status = 'sent' THEN 1 END) AS sentLogs,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failedLogs
     FROM notification_delivery_logs`
  );

  const totalProfiles = parseInt(prefMetrics[0]?.totalProfiles, 10) || 0;
  const careOptInCount = parseInt(prefMetrics[0]?.careOptInCount, 10) || 0;
  const marketingOptInCount = parseInt(prefMetrics[0]?.marketingOptInCount, 10) || 0;

  const careRemindersOptInRate = totalProfiles > 0
    ? Math.round((careOptInCount / totalProfiles) * 10000) / 100
    : 100;
  const marketingOptInRate = totalProfiles > 0
    ? Math.round((marketingOptInCount / totalProfiles) * 10000) / 100
    : 0;

  const totalDeliveryAttempts = parseInt(logMetrics[0]?.totalLogs, 10) || 0;
  const sentLogs = parseInt(logMetrics[0]?.sentLogs, 10) || 0;
  const deliverySuccessRate = totalDeliveryAttempts > 0
    ? Math.round((sentLogs / totalDeliveryAttempts) * 10000) / 100
    : 100;

  // ─────────────────────────────────────────────────────────────────────────────
  // RESPONSE OBJECT HOÀN CHỈNH VỚI ĐỊNH NGHĨA MINH BẠCH
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      filterPeriod: period,
      secondPurchaseWindowDays: safeWindowDays,
    },

    // 1. Repeat Purchase Rate
    repeatPurchase: {
      rate: repeatPurchaseRate,
      rateFormatted: `${repeatPurchaseRate}%`,
      totalCustomers,
      repeatCustomers,
      singlePurchaseCustomers,
      totalValidOrders,
      formula: 'Số khách hàng có >= 2 đơn hợp lệ / Tổng số khách hàng có >= 1 đơn hợp lệ (loại bỏ đơn đã hủy)',
      definition: 'Tỷ lệ khách hàng quay lại mua sắm lần 2 trở lên trên toàn bộ tập khách hàng phát sinh đơn hàng hợp lệ.',
    },

    // 2. Second Purchase Conversion
    secondPurchaseConversion: {
      rate: secondPurchaseConversion,
      rateFormatted: `${secondPurchaseConversion}%`,
      windowDays: safeWindowDays,
      totalFirstTimeBuyers,
      convertedCount,
      avgDaysToSecondPurchase,
      avgDaysFormatted: avgDaysToSecondPurchase !== null ? `${avgDaysToSecondPurchase} ngày` : '—',
      formula: `Số khách đặt đơn thứ 2 trong vòng ${safeWindowDays} ngày kể từ đơn đầu / Tổng số khách mua lần đầu`,
      definition: 'Đo lường hiệu quả chuyển đổi từ khách hàng trải nghiệm sang khách hàng thân thiết trong khung thời gian quy định.',
    },

    // 3. Review Rate & Rating Quality
    reviews: {
      reviewRate,
      reviewRateFormatted: `${reviewRate}%`,
      totalReviews,
      verifiedReviewsCount,
      approvedReviewsCount: parseInt(reviewMetrics[0]?.approvedReviewsCount, 10) || 0,
      totalDeliveredItems,
      averageRating,
      ratingDistribution,
      formula: 'Tổng số đánh giá đã xác minh (Verified Purchase) / Tổng số sản phẩm trong các đơn hàng đã hoàn tất giao',
      definition: 'Tỷ lệ để lại phản hồi thực tế từ những khách hàng đã nhận kính thành công.',
    },

    // 4. After-sales Volume & Resolution Time
    afterSales: {
      totalRequests: totalCareRequests,
      activeCount: activeCareCount,
      resolvedCount: resolvedCareCount,
      breakdownByStatus: {
        submitted: parseInt(careMetrics[0]?.submittedCount, 10) || 0,
        reviewing: parseInt(careMetrics[0]?.reviewingCount, 10) || 0,
        waiting_customer: parseInt(careMetrics[0]?.waitingCustomerCount, 10) || 0,
        in_progress: parseInt(careMetrics[0]?.inProgressCount, 10) || 0,
        resolved: resolvedCareCount,
        closed_other: parseInt(careMetrics[0]?.closedOtherCount, 10) || 0,
      },
      breakdownByType: careByType,
      resolutionTime: {
        averageHours: avgResolutionHours,
        averageDays: avgResolutionDays,
        averageHoursFormatted: `${avgResolutionHours} giờ`,
        averageDaysFormatted: `${avgResolutionDays} ngày`,
        formula: 'Trung bình thời gian (giờ) từ thời điểm tiếp nhận đến khi xử lý hoàn tất (resolved_at - created_at) của các phiếu đã giải quyết',
        note: 'Các phiếu ở trạng thái chờ khách hàng phản hồi (waiting_customer) được theo dõi riêng biệt để không làm sai lệch chỉ số năng lực kỹ thuật.',
      },
    },

    // 5. Loyalty Liability & Outstanding Points
    loyalty: {
      totalAccounts: parseInt(loyaltyMetrics[0]?.totalAccounts, 10) || 0,
      outstandingPoints: totalOutstandingPoints,
      outstandingPointsFormatted: `${totalOutstandingPoints.toLocaleString('vi-VN')} điểm`,
      liabilityVnd,
      liabilityVndFormatted: `${liabilityVnd.toLocaleString('vi-VN')}đ`,
      lifetimePoints: totalLifetimePoints,
      redemptionRate,
      redemptionRateFormatted: `${redemptionRate}%`,
      tierDistribution: {
        member: parseInt(loyaltyMetrics[0]?.memberCount, 10) || 0,
        silver: parseInt(loyaltyMetrics[0]?.silverCount, 10) || 0,
        gold: parseInt(loyaltyMetrics[0]?.goldCount, 10) || 0,
        diamond: parseInt(loyaltyMetrics[0]?.diamondCount, 10) || 0,
      },
      formula: 'Tổng điểm thưởng khả dụng chưa đổi (outstanding points) x 1.000đ quy đổi theo quy chế hiện hành',
      definition: 'Nghĩa vụ tài chính dự phòng cho các ưu đãi tích lũy của hội viên Lumina Membership.',
    },

    // 6. Referral Conversion
    referral: {
      totalCodes: parseInt(referralCodesCountRow[0]?.totalCodes, 10) || 0,
      totalAttributions,
      convertedAttributions: convertedReferrals,
      rewardedAttributions: rewardedReferrals,
      conversionRate: referralConversionRate,
      conversionRateFormatted: `${referralConversionRate}%`,
      totalRewardedPoints,
      pendingCount: parseInt(referralMetrics[0]?.pendingCount, 10) || 0,
      formula: 'Số lượt giới thiệu chuyển đổi thành đơn hàng hoàn tất hợp lệ / Tổng số lượt gắn mã giới thiệu',
      definition: 'Đo lường mức độ lan tỏa tự nhiên của khách hàng hiện tại tới tệp khách hàng tiềm năng mới.',
    },

    // 7. Notification Opt-in Rate
    notifications: {
      totalProfiles,
      transactionalOptInRate: 100.0,
      transactionalOptInRateFormatted: '100%',
      careRemindersOptInRate,
      careRemindersOptInRateFormatted: `${careRemindersOptInRate}%`,
      marketingOptInRate,
      marketingOptInRateFormatted: `${marketingOptInRate}%`,
      deliverySuccessRate,
      deliverySuccessRateFormatted: `${deliverySuccessRate}%`,
      totalDeliveryAttempts,
      formula: 'Số người dùng đồng ý nhận kênh tương ứng / Tổng số hồ sơ cấu hình thông báo',
      definition: 'Mức độ sẵn sàng tiếp nhận thông điệp chăm sóc và tiếp thị từ Lumina Eyewear.',
    },

    // 8. Methodological Caveat
    cohortMethodologyNotice:
      'Lưu ý phương pháp luận: Lumina hiện tại áp dụng tính toán Retention & Tái mua thực tế từ dữ liệu giao dịch MySQL. Không công bố chỉ số CLV (Customer Lifetime Value) ước đoán hoặc Cohort Retention dài hạn khi chưa đủ dữ liệu tối thiểu 12-24 tháng theo chuẩn thống kê nhãn khoa.',
  };
}

export default {
  getRetentionAnalytics,
};

