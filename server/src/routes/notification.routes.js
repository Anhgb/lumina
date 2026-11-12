import express from 'express';
import { authenticate, requireCustomer, requireAdmin } from '../middleware/authMiddleware.js';
import {
  handleGetCustomerPreferences,
  handleUpdateCustomerPreferences,
  handleGetCustomerNotifications,
  handleMarkNotificationAsRead,
  handleMarkAllAsRead,
  handleDeleteNotification,
  handleAdminGetDeliveryLogs,
  handleAdminSendMarketingCampaign,
  handleTriggerManualNotification,
} from '../controllers/notification.controller.js';

const router = express.Router();

// Customer notification endpoints
router.get(
  '/me/notifications/preferences',
  authenticate,
  requireCustomer,
  handleGetCustomerPreferences
);
router.put(
  '/me/notifications/preferences',
  authenticate,
  requireCustomer,
  handleUpdateCustomerPreferences
);
router.get(
  '/me/notifications',
  authenticate,
  requireCustomer,
  handleGetCustomerNotifications
);
router.patch(
  '/me/notifications/:id/read',
  authenticate,
  requireCustomer,
  handleMarkNotificationAsRead
);
router.post(
  '/me/notifications/read-all',
  authenticate,
  requireCustomer,
  handleMarkAllAsRead
);
router.delete(
  '/me/notifications/:id',
  authenticate,
  requireCustomer,
  handleDeleteNotification
);

// Admin notification & campaign endpoints
router.get(
  '/admin/notifications/logs',
  authenticate,
  requireAdmin,
  handleAdminGetDeliveryLogs
);
router.post(
  '/admin/notifications/campaign',
  authenticate,
  requireAdmin,
  handleAdminSendMarketingCampaign
);
router.post(
  '/admin/notifications/dispatch',
  authenticate,
  requireAdmin,
  handleTriggerManualNotification
);

export default router;

