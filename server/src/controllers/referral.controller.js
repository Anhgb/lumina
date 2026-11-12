/**
 * Lumina Eyewear — Referral Program Controllers
 */

import {
  getOrCreateReferralCode,
  attributeReferral,
  processQualifiedReferral,
  getMyReferralStats,
  adminGetReferrals,
  adminReviewReferral,
} from '../services/referral.service.js';

export async function handleGetMyReferralStats(req, res, next) {
  try {
    const userId = req.user.id;
    const stats = await getMyReferralStats(userId);
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleClaimReferralCode(req, res, next) {
  try {
    const userId = req.user.id;
    const { referralCode } = req.body;
    const result = await attributeReferral({
      referralCode,
      newUserId: userId,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleAdminGetReferrals(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const result = await adminGetReferrals({ page, limit, status });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleAdminReviewReferral(req, res, next) {
  try {
    const adminId = req.user?.id || 'admin';
    const { attributionId } = req.params;
    const { status, rejectionReason } = req.body;
    const result = await adminReviewReferral({
      adminId,
      attributionId,
      status,
      rejectionReason,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleProcessReferralForOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const result = await processQualifiedReferral(orderId);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

