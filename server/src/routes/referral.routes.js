import express from 'express';
import { authenticate, requireCustomer, requireAdmin } from '../middleware/authMiddleware.js';
import {
  handleGetMyReferralStats,
  handleClaimReferralCode,
  handleAdminGetReferrals,
  handleAdminReviewReferral,
  handleProcessReferralForOrder,
} from '../controllers/referral.controller.js';

const router = express.Router();

// Customer routes
router.get('/me/referral', authenticate, requireCustomer, handleGetMyReferralStats);
router.post('/me/referral/claim', authenticate, requireCustomer, handleClaimReferralCode);

// Admin routes
router.get('/admin/referrals', authenticate, requireAdmin, handleAdminGetReferrals);
router.patch('/admin/referrals/:attributionId/review', authenticate, requireAdmin, handleAdminReviewReferral);
router.post('/admin/referrals/orders/:orderId/qualify', authenticate, requireAdmin, handleProcessReferralForOrder);

export default router;

