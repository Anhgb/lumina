/**
 * Lumina Eyewear — Notification Controllers
 */

import {
  getUserPreferences,
  updateUserPreferences,
  getCustomerNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteCustomerNotification,
  adminGetDeliveryLogs,
  sendMarketingCampaign,
  createAndDispatchNotification,
} from '../services/notification.service.js';

export async function handleGetCustomerPreferences(req, res, next) {
  try {
    const userId = req.user.id;
    const preferences = await getUserPreferences(userId);
    res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateCustomerPreferences(req, res, next) {
  try {
    const userId = req.user.id;
    const { preferences, source, version } = req.body;
    const updated = await updateUserPreferences(userId, preferences || req.body, {
      source: source || 'account_portal',
      version: version || 'v1.0',
    });
    res.status(200).json({
      success: true,
      message: 'Cập nhật tùy chọn nhận thông báo thành công.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetCustomerNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const { page, limit, unreadOnly, category } = req.query;
    const result = await getCustomerNotifications(userId, {
      page,
      limit,
      unreadOnly: unreadOnly === 'true' || unreadOnly === '1',
      category,
    });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleMarkNotificationAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await markNotificationAsRead(userId, id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleMarkAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await markAllNotificationsAsRead(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteNotification(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await deleteCustomerNotification(userId, id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleAdminGetDeliveryLogs(req, res, next) {
  try {
    const { page, limit, channel, status } = req.query;
    const result = await adminGetDeliveryLogs({ page, limit, channel, status });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleAdminSendMarketingCampaign(req, res, next) {
  try {
    const { campaignCode, title, message, link, targetUserIds } = req.body;
    const result = await sendMarketingCampaign({
      campaignCode,
      title,
      message,
      link,
      targetUserIds,
    });
    res.status(200).json({
      success: true,
      message: 'Đã hoàn tất xử lý chiến dịch marketing theo danh sách consent.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleTriggerManualNotification(req, res, next) {
  try {
    const { userId, templateCode, category, type, title, message, data, idempotencyKey, targetChannels } = req.body;
    const result = await createAndDispatchNotification({
      userId,
      templateCode,
      category,
      type,
      title,
      message,
      data,
      idempotencyKey,
      targetChannels,
    });
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

