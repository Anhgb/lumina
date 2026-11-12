import { backendClient } from './apiClient';

/**
 * notificationService.js — Client API service for Lumina Notification & Engagement (Prompt 06)
 */

// ── Customer Preferences & Consent ──

export async function getMyNotificationPreferences() {
  const res = await backendClient.get('/api/me/notifications/preferences');
  return res.data;
}

export async function updateMyNotificationPreferences(preferences, meta = {}) {
  const res = await backendClient.put('/api/me/notifications/preferences', {
    preferences,
    ...meta,
  });
  return res.data;
}

// ── Customer Inbox & Actions ──

export async function getMyNotifications(params = {}) {
  const res = await backendClient.get('/api/me/notifications', { params });
  return res.data;
}

export async function markNotificationAsRead(id) {
  const res = await backendClient.patch(`/api/me/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsAsRead() {
  const res = await backendClient.post('/api/me/notifications/read-all');
  return res.data;
}

export async function deleteNotification(id) {
  const res = await backendClient.delete(`/api/me/notifications/${id}`);
  return res.data;
}

// ── Admin Logs & Marketing Campaigns ──

export async function getAdminNotificationLogs(params = {}) {
  const res = await backendClient.get('/api/admin/notifications/logs', { params });
  return res.data;
}

export async function sendAdminMarketingCampaign(payload) {
  const res = await backendClient.post('/api/admin/notifications/campaign', payload);
  return res.data;
}

