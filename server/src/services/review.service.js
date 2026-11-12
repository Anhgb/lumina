/**
 * Lumina Eyewear — Product Reviews Service
 * 
 * Implements Prompt 05 — Product Reviews:
 * - Only verified purchasers with completed/delivered orders can review.
 * - One review per product per order (idempotent, uq_user_product_order).
 * - Rating strictly between 1 and 5.
 * - Content required, minimum 5 characters.
 * - Customer can edit or delete their own review.
 * - Admin can moderate (approve, hide, delete, restore) with mandatory audit logging.
 * - NO fake reviews, NO paid reviews, NO star-based bonus (uniform reward if any).
 * - Real aggregate ratings and distributions computed server-side.
 */

import crypto from 'crypto';
import { pool } from '../config/database.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../middleware/errorHandler.js';

/**
 * Generate a unique review code (e.g. REV-20261112-A1B2)
 */
function generateReviewCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `REV-${dateStr}-${randomHex}`;
}

/**
 * Check if customer is eligible to review a product.
 * Returns eligible orders that include this product and any existing review.
 */
export async function checkReviewEligibility(userId, productId) {
  const parsedProductId = parseInt(productId, 10);
  if (isNaN(parsedProductId)) {
    throw new BadRequestError('Mã sản phẩm không hợp lệ.');
  }

  // 1. Find orders belonging to user containing this product that are delivered or completed
  const [eligibleOrders] = await pool.query(
    `SELECT o.id AS order_id, o.order_code, o.status, o.created_at,
            oi.id AS order_item_id, oi.product_name, oi.unit_price
     FROM orders o
     JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = ?
       AND oi.product_id = ?
       AND (
         o.status IN ('delivered', 'completed')
         OR EXISTS (
           SELECT 1 FROM order_delivery_events ode
           WHERE ode.order_id = o.id AND ode.delivered_at IS NOT NULL
         )
       )
     ORDER BY o.created_at DESC`,
    [userId, parsedProductId]
  );

  // 2. Find existing reviews by user for this product
  const [existingReviews] = await pool.query(
    `SELECT id, review_code, order_id, rating, title, content, status, created_at
     FROM product_reviews
     WHERE user_id = ? AND product_id = ? AND status != 'deleted'`,
    [userId, parsedProductId]
  );

  const reviewedOrderIds = new Set(existingReviews.map((r) => r.order_id));
  const availableOrdersToReview = eligibleOrders.filter(
    (o) => !reviewedOrderIds.has(o.order_id)
  );

  return {
    isEligible: availableOrdersToReview.length > 0,
    hasEverPurchased: eligibleOrders.length > 0,
    availableOrders: availableOrdersToReview,
    existingReviews,
  };
}

/**
 * Create a verified product review.
 */
export async function createReview({
  userId,
  productId,
  orderId,
  orderItemId = null,
  rating,
  title = '',
  content,
}) {
  const parsedProductId = parseInt(productId, 10);
  const parsedOrderId = parseInt(orderId, 10);
  const parsedRating = parseInt(rating, 10);

  if (isNaN(parsedProductId)) {
    throw new BadRequestError('Mã sản phẩm không hợp lệ.');
  }
  if (isNaN(parsedOrderId)) {
    throw new BadRequestError('Mã đơn hàng không hợp lệ.');
  }
  if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    throw new BadRequestError('Đánh giá phải từ 1 đến 5 sao.');
  }
  if (!content || typeof content !== 'string' || content.trim().length < 5) {
    throw new BadRequestError('Nội dung đánh giá cần tối thiểu 5 ký tự.');
  }

  // 1. Verify order ownership
  const [orders] = await pool.query(
    `SELECT id, order_code, user_id, status, payment_status FROM orders WHERE id = ?`,
    [parsedOrderId]
  );
  if (orders.length === 0) {
    throw new NotFoundError('Không tìm thấy đơn hàng tương ứng.');
  }
  const order = orders[0];
  if (order.user_id !== userId) {
    throw new ForbiddenError('Bạn không có quyền đánh giá đơn hàng của người khác.');
  }

  // 2. Verify order delivery status (must be delivered or completed)
  const isDelivered =
    ['delivered', 'completed'].includes(order.status) ||
    (await (async () => {
      const [events] = await pool.query(
        `SELECT id FROM order_delivery_events WHERE order_id = ? AND delivered_at IS NOT NULL LIMIT 1`,
        [order.id]
      );
      return events.length > 0;
    })());

  if (!isDelivered) {
    throw new ForbiddenError('Chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được giao thành công.');
  }

  // 3. Verify product belongs to order
  const [items] = await pool.query(
    `SELECT id, product_name FROM order_items WHERE order_id = ? AND product_id = ?`,
    [parsedOrderId, parsedProductId]
  );
  if (items.length === 0) {
    throw new BadRequestError('Sản phẩm này không nằm trong đơn hàng đã chọn.');
  }

  const selectedOrderItemId = orderItemId || items[0].id;
  const reviewCode = generateReviewCode();

  // 4. Insert review (Unique key `uq_user_product_order` prevents duplicates)
  try {
    const [result] = await pool.query(
      `INSERT INTO product_reviews 
        (review_code, product_id, user_id, order_id, order_item_id, rating, title, content, is_verified_purchase, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'approved')`,
      [
        reviewCode,
        parsedProductId,
        userId,
        parsedOrderId,
        selectedOrderItemId,
        parsedRating,
        title ? title.trim() : null,
        content.trim(),
      ]
    );

    return {
      id: result.insertId,
      reviewCode,
      productId: parsedProductId,
      userId,
      orderId: parsedOrderId,
      orderItemId: selectedOrderItemId,
      rating: parsedRating,
      title: title ? title.trim() : null,
      content: content.trim(),
      isVerifiedPurchase: true,
      status: 'approved',
      createdAt: new Date(),
    };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new ConflictError('Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi.');
    }
    throw error;
  }
}

/**
 * Customer updates their own review.
 */
export async function updateReview({ userId, reviewId, rating, title, content }) {
  const parsedReviewId = parseInt(reviewId, 10);
  if (isNaN(parsedReviewId)) {
    throw new BadRequestError('Mã đánh giá không hợp lệ.');
  }

  const [reviews] = await pool.query(
    `SELECT * FROM product_reviews WHERE id = ? AND status != 'deleted'`,
    [parsedReviewId]
  );
  if (reviews.length === 0) {
    throw new NotFoundError('Không tìm thấy đánh giá hoặc đánh giá đã bị xóa.');
  }

  const review = reviews[0];
  if (review.user_id !== userId) {
    throw new ForbiddenError('Bạn không có quyền chỉnh sửa đánh giá này.');
  }

  const updates = [];
  const params = [];

  if (rating !== undefined) {
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      throw new BadRequestError('Đánh giá phải từ 1 đến 5 sao.');
    }
    updates.push('rating = ?');
    params.push(parsedRating);
  }

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title ? title.trim() : null);
  }

  if (content !== undefined) {
    if (!content || typeof content !== 'string' || content.trim().length < 5) {
      throw new BadRequestError('Nội dung đánh giá cần tối thiểu 5 ký tự.');
    }
    updates.push('content = ?');
    params.push(content.trim());
  }

  if (updates.length === 0) {
    return review;
  }

  params.push(parsedReviewId);
  await pool.query(
    `UPDATE product_reviews SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
    params
  );

  const [updatedRows] = await pool.query(
    `SELECT * FROM product_reviews WHERE id = ?`,
    [parsedReviewId]
  );
  return updatedRows[0];
}

/**
 * Customer soft-deletes their review.
 */
export async function deleteReview({ userId, reviewId }) {
  const parsedReviewId = parseInt(reviewId, 10);
  if (isNaN(parsedReviewId)) {
    throw new BadRequestError('Mã đánh giá không hợp lệ.');
  }

  const [reviews] = await pool.query(
    `SELECT * FROM product_reviews WHERE id = ? AND status != 'deleted'`,
    [parsedReviewId]
  );
  if (reviews.length === 0) {
    throw new NotFoundError('Không tìm thấy đánh giá cần xóa.');
  }

  const review = reviews[0];
  if (review.user_id !== userId) {
    throw new ForbiddenError('Bạn không có quyền xóa đánh giá này.');
  }

  await pool.query(
    `UPDATE product_reviews SET status = 'deleted', updated_at = NOW() WHERE id = ?`,
    [parsedReviewId]
  );

  return { success: true, message: 'Đã xóa đánh giá thành công.' };
}

/**
 * Get public reviews for a product (only approved).
 */
export async function getProductReviews(
  productId,
  { page = 1, limit = 10, sort = 'latest', starFilter = null } = {}
) {
  const parsedProductId = parseInt(productId, 10);
  if (isNaN(parsedProductId)) {
    throw new BadRequestError('Mã sản phẩm không hợp lệ.');
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  let whereClause = `WHERE product_id = ? AND status = 'approved'`;
  const params = [parsedProductId];

  if (starFilter && [1, 2, 3, 4, 5].includes(parseInt(starFilter, 10))) {
    whereClause += ` AND rating = ?`;
    params.push(parseInt(starFilter, 10));
  }

  let orderBy = 'created_at DESC';
  if (sort === 'highest') {
    orderBy = 'rating DESC, created_at DESC';
  } else if (sort === 'lowest') {
    orderBy = 'rating ASC, created_at DESC';
  } else if (sort === 'helpful') {
    orderBy = 'helpful_votes DESC, created_at DESC';
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM product_reviews ${whereClause}`,
    params
  );
  const total = countRows[0].total;
  const totalPages = Math.ceil(total / safeLimit) || 1;

  const [rows] = await pool.query(
    `SELECT id, review_code, product_id, user_id, rating, title, content,
            is_verified_purchase, helpful_votes, created_at, updated_at
     FROM product_reviews
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    reviews: rows.map((r) => ({
      id: r.id,
      reviewCode: r.review_code,
      productId: r.product_id,
      userIdMasked: maskUserId(r.user_id),
      rating: r.rating,
      title: r.title,
      content: r.content,
      isVerifiedPurchase: Boolean(r.is_verified_purchase),
      helpfulVotes: r.helpful_votes,
      createdAt: r.created_at,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

/**
 * Mask user ID for public privacy (e.g. cust-lumina-01 -> c***01)
 */
function maskUserId(userId) {
  if (!userId || typeof userId !== 'string') return 'Khách hàng Lumina';
  if (userId.length <= 4) return userId;
  return `${userId.slice(0, 2)}***${userId.slice(-2)}`;
}

/**
 * Get rating summary and distribution for a product.
 */
export async function getProductRatingSummary(productId) {
  const parsedProductId = parseInt(productId, 10);
  if (isNaN(parsedProductId)) {
    throw new BadRequestError('Mã sản phẩm không hợp lệ.');
  }

  const [aggRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_reviews,
       COALESCE(AVG(rating), 0) AS average_rating,
       SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS star_5,
       SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS star_4,
       SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS star_3,
       SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS star_2,
       SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS star_1
     FROM product_reviews
     WHERE product_id = ? AND status = 'approved'`,
    [parsedProductId]
  );

  const row = aggRows[0] || {};
  const totalReviews = parseInt(row.total_reviews, 10) || 0;
  const averageRating = parseFloat(parseFloat(row.average_rating || 0).toFixed(1));

  return {
    productId: parsedProductId,
    totalReviews,
    averageRating,
    distribution: {
      5: parseInt(row.star_5, 10) || 0,
      4: parseInt(row.star_4, 10) || 0,
      3: parseInt(row.star_3, 10) || 0,
      2: parseInt(row.star_2, 10) || 0,
      1: parseInt(row.star_1, 10) || 0,
    },
  };
}

/**
 * Customer fetches all their own reviews.
 */
export async function getMyReviews(userId, { page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM product_reviews WHERE user_id = ? AND status != 'deleted'`,
    [userId]
  );
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT r.id, r.review_code, r.product_id, r.order_id, r.rating, r.title, r.content,
            r.is_verified_purchase, r.status, r.moderation_reason, r.helpful_votes,
            r.created_at, r.updated_at,
            o.order_code, oi.product_name
     FROM product_reviews r
     LEFT JOIN orders o ON r.order_id = o.id
     LEFT JOIN order_items oi ON r.order_item_id = oi.id
     WHERE r.user_id = ? AND r.status != 'deleted'
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, safeLimit, offset]
  );

  return {
    reviews: rows.map((r) => ({
      id: r.id,
      reviewCode: r.review_code,
      productId: r.product_id,
      productName: r.product_name,
      orderId: r.order_id,
      orderCode: r.order_code,
      rating: r.rating,
      title: r.title,
      content: r.content,
      isVerifiedPurchase: Boolean(r.is_verified_purchase),
      status: r.status,
      moderationReason: r.moderation_reason,
      helpfulVotes: r.helpful_votes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

/**
 * Admin: List reviews for moderation with filtering.
 */
export async function adminGetReviews({
  status = 'all',
  productId = null,
  page = 1,
  limit = 20,
  search = '',
} = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  let whereClauses = ['1=1'];
  const params = [];

  if (status && status !== 'all') {
    whereClauses.push('r.status = ?');
    params.push(status);
  }

  if (productId) {
    whereClauses.push('r.product_id = ?');
    params.push(parseInt(productId, 10));
  }

  if (search) {
    whereClauses.push('(r.review_code LIKE ? OR r.user_id LIKE ? OR r.content LIKE ? OR r.title LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM product_reviews r ${whereSql}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT r.id, r.review_code, r.product_id, r.user_id, r.order_id, r.rating,
            r.title, r.content, r.is_verified_purchase, r.status, r.moderation_reason,
            r.helpful_votes, r.created_at, r.updated_at,
            o.order_code, oi.product_name
     FROM product_reviews r
     LEFT JOIN orders o ON r.order_id = o.id
     LEFT JOIN order_items oi ON r.order_item_id = oi.id
     ${whereSql}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    reviews: rows.map((r) => ({
      id: r.id,
      reviewCode: r.review_code,
      productId: r.product_id,
      productName: r.product_name,
      userId: r.user_id,
      orderId: r.order_id,
      orderCode: r.order_code,
      rating: r.rating,
      title: r.title,
      content: r.content,
      isVerifiedPurchase: Boolean(r.is_verified_purchase),
      status: r.status,
      moderationReason: r.moderation_reason,
      helpfulVotes: r.helpful_votes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

/**
 * Admin: Moderate a review (approve, hide, delete, restore) with audit logging.
 */
export async function adminModerateReview({ adminId, reviewId, action, reason }) {
  const parsedReviewId = parseInt(reviewId, 10);
  if (isNaN(parsedReviewId)) {
    throw new BadRequestError('Mã đánh giá không hợp lệ.');
  }

  const validActions = ['approve', 'hide', 'delete', 'restore'];
  if (!validActions.includes(action)) {
    throw new BadRequestError(`Hành động kiểm duyệt không hợp lệ. Cho phép: ${validActions.join(', ')}`);
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    throw new BadRequestError('Vui lòng nhập lý do kiểm duyệt (tối thiểu 3 ký tự).');
  }

  const [reviews] = await pool.query(
    `SELECT * FROM product_reviews WHERE id = ?`,
    [parsedReviewId]
  );
  if (reviews.length === 0) {
    throw new NotFoundError('Không tìm thấy đánh giá cần kiểm duyệt.');
  }

  let newStatus;
  switch (action) {
    case 'approve':
    case 'restore':
      newStatus = 'approved';
      break;
    case 'hide':
      newStatus = 'hidden';
      break;
    case 'delete':
      newStatus = 'deleted';
      break;
    default:
      newStatus = 'pending';
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Update review status
    await connection.query(
      `UPDATE product_reviews 
       SET status = ?, moderation_reason = ?, updated_at = NOW()
       WHERE id = ?`,
      [newStatus, reason.trim(), parsedReviewId]
    );

    // 2. Insert audit event
    await connection.query(
      `INSERT INTO review_moderation_events (review_id, action, admin_id, reason)
       VALUES (?, ?, ?, ?)`,
      [parsedReviewId, action, adminId, reason.trim()]
    );

    await connection.commit();

    return {
      success: true,
      reviewId: parsedReviewId,
      action,
      newStatus,
      reason: reason.trim(),
      moderatedAt: new Date(),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

