/**
 * Lumina Eyewear — Review Controllers
 */

import {
  checkReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
  getProductReviews,
  getProductRatingSummary,
  getMyReviews,
  adminGetReviews,
  adminModerateReview,
} from '../services/review.service.js';

export async function handleCreateReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId, orderId, orderItemId, rating, title, content } = req.body;
    const review = await createReview({
      userId,
      productId,
      orderId,
      orderItemId,
      rating,
      title,
      content,
    });
    res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã đánh giá sản phẩm Lumina!',
      data: review,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleCheckEligibility(req, res, next) {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const eligibility = await checkReviewEligibility(userId, productId);
    res.status(200).json({
      success: true,
      data: eligibility,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetProductReviews(req, res, next) {
  try {
    const { productId } = req.params;
    const { page, limit, sort, star } = req.query;
    const result = await getProductReviews(productId, {
      page,
      limit,
      sort,
      starFilter: star,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetProductRatingSummary(req, res, next) {
  try {
    const { productId } = req.params;
    const summary = await getProductRatingSummary(productId);
    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { rating, title, content } = req.body;
    const updated = await updateReview({
      userId,
      reviewId,
      rating,
      title,
      content,
    });
    res.status(200).json({
      success: true,
      message: 'Cập nhật đánh giá thành công.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteReview(req, res, next) {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const result = await deleteReview({ userId, reviewId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleGetMyReviews(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    const result = await getMyReviews(userId, { page, limit });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleAdminGetReviews(req, res, next) {
  try {
    const { status, productId, page, limit, search } = req.query;
    const result = await adminGetReviews({
      status,
      productId,
      page,
      limit,
      search,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleAdminModerateReview(req, res, next) {
  try {
    const adminId = req.user?.id || 'admin';
    const { reviewId } = req.params;
    const { action, reason } = req.body;
    const result = await adminModerateReview({
      adminId,
      reviewId,
      action,
      reason,
    });
    res.status(200).json({
      success: true,
      message: 'Kiểm duyệt đánh giá thành công.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

