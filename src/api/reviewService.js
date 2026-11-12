import { backendClient } from './apiClient';

/**
 * reviewService.js — Client API service for Lumina Product Reviews (Prompt 05)
 */

// ── Public APIs ──

export async function getProductReviews(productId, params = {}) {
  const res = await backendClient.get(`/api/products/${productId}/reviews`, { params });
  return res.data;
}

export async function getProductRatingSummary(productId) {
  const res = await backendClient.get(`/api/products/${productId}/reviews/summary`);
  return res.data;
}

// ── Customer APIs ──

export async function checkReviewEligibility(productId) {
  const res = await backendClient.get(`/api/products/${productId}/review-eligibility`);
  return res.data;
}

export async function createReview(payload) {
  const res = await backendClient.post('/api/reviews', payload);
  return res.data;
}

export async function updateReview(reviewId, payload) {
  const res = await backendClient.patch(`/api/reviews/${reviewId}`, payload);
  return res.data;
}

export async function deleteReview(reviewId) {
  const res = await backendClient.delete(`/api/reviews/${reviewId}`);
  return res.data;
}

export async function getMyReviews(params = {}) {
  const res = await backendClient.get('/api/me/reviews', { params });
  return res.data;
}

// ── Admin APIs ──

export async function getAdminReviews(params = {}) {
  const res = await backendClient.get('/api/admin/reviews', { params });
  return res.data;
}

export async function adminModerateReview(reviewId, payload) {
  const res = await backendClient.patch(`/api/admin/reviews/${reviewId}/moderate`, payload);
  return res.data;
}

