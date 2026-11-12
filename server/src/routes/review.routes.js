import express from 'express';
import { authenticate, requireCustomer, requireAdmin } from '../middleware/authMiddleware.js';
import {
  handleCreateReview,
  handleCheckEligibility,
  handleGetProductReviews,
  handleGetProductRatingSummary,
  handleUpdateReview,
  handleDeleteReview,
  handleGetMyReviews,
  handleAdminGetReviews,
  handleAdminModerateReview,
} from '../controllers/review.controller.js';

const router = express.Router();

// Public routes
router.get('/products/:productId/reviews', handleGetProductReviews);
router.get('/products/:productId/reviews/summary', handleGetProductRatingSummary);

// Customer routes
router.get(
  '/products/:productId/review-eligibility',
  authenticate,
  requireCustomer,
  handleCheckEligibility
);
router.post('/reviews', authenticate, requireCustomer, handleCreateReview);
router.patch('/reviews/:reviewId', authenticate, requireCustomer, handleUpdateReview);
router.delete('/reviews/:reviewId', authenticate, requireCustomer, handleDeleteReview);
router.get('/me/reviews', authenticate, requireCustomer, handleGetMyReviews);

// Admin routes
router.get('/admin/reviews', authenticate, requireAdmin, handleAdminGetReviews);
router.patch('/admin/reviews/:reviewId/moderate', authenticate, requireAdmin, handleAdminModerateReview);

export default router;

