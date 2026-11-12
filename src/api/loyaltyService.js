import { backendClient } from './apiClient';

/**
 * loyaltyService.js — Client API service for Lumina Membership & Loyalty System (Prompt 04)
 */

// ── Customer APIs ──

export async function getMyLoyaltyOverview() {
  const res = await backendClient.get('/api/me/loyalty');
  return res.data;
}

export async function getMyLoyaltyTransactions(params = {}) {
  const res = await backendClient.get('/api/me/loyalty/transactions', { params });
  return res.data;
}

export async function getPublicLoyaltyTiers() {
  const res = await backendClient.get('/api/loyalty/tiers');
  return res.data;
}

export async function previewPointsRedemption(payload) {
  const res = await backendClient.post('/api/me/loyalty/redeem-preview', payload);
  return res.data;
}

export async function redeemPoints(payload) {
  const res = await backendClient.post('/api/me/loyalty/redeem', payload);
  return res.data;
}

// ── Admin APIs ──

export async function getAdminLoyaltyAccounts(params = {}) {
  const res = await backendClient.get('/api/admin/loyalty/accounts', { params });
  return res.data;
}

export async function getAdminLoyaltyAccountDetail(userId) {
  const res = await backendClient.get(`/api/admin/loyalty/accounts/${encodeURIComponent(userId)}`);
  return res.data;
}

export async function adminAdjustPoints(userId, payload) {
  const res = await backendClient.post(`/api/admin/loyalty/accounts/${encodeURIComponent(userId)}/adjust`, payload);
  return res.data;
}

export async function getAdminLoyaltyLedger(params = {}) {
  const res = await backendClient.get('/api/admin/loyalty/ledger', { params });
  return res.data;
}

export async function adminEarnForOrder(orderCode, payload = {}) {
  const res = await backendClient.post(`/api/admin/loyalty/orders/${encodeURIComponent(orderCode)}/earn`, payload);
  return res.data;
}

export async function adminClawbackForOrder(orderCode, payload = {}) {
  const res = await backendClient.post(`/api/admin/loyalty/orders/${encodeURIComponent(orderCode)}/clawback`, payload);
  return res.data;
}

export async function getAdminLoyaltyConfig() {
  const res = await backendClient.get('/api/admin/loyalty/config');
  return res.data;
}

export default {
  getMyLoyaltyOverview,
  getMyLoyaltyTransactions,
  getPublicLoyaltyTiers,
  previewPointsRedemption,
  redeemPoints,
  getAdminLoyaltyAccounts,
  getAdminLoyaltyAccountDetail,
  adminAdjustPoints,
  getAdminLoyaltyLedger,
  adminEarnForOrder,
  adminClawbackForOrder,
  getAdminLoyaltyConfig,
};

