import { backendClient } from './apiClient';

/**
 * referralService.js — Client API service for Lumina Referral Program (Prompt 05)
 */

// ── Customer APIs ──

export async function getMyReferralStats() {
  const res = await backendClient.get('/api/me/referral');
  return res.data;
}

export async function claimReferralCode(referralCode) {
  const res = await backendClient.post('/api/me/referral/claim', { referralCode });
  return res.data;
}

// ── Admin APIs ──

export async function getAdminReferrals(params = {}) {
  const res = await backendClient.get('/api/admin/referrals', { params });
  return res.data;
}

export async function adminReviewReferral(attributionId, payload) {
  const res = await backendClient.patch(`/api/admin/referrals/${attributionId}/review`, payload);
  return res.data;
}

