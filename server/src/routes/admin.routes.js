import { Router } from 'express';
import {
  handleGetStats,
  handleGetOrders,
  handleGetOrderDetails,
  handleUpdateOrderStatus,
  handleReconcileOrderPayment,
  handleGetProducts,
  handleUpdateProduct,
  handleGetRetentionAnalytics,
} from '../controllers/admin.controller.js';
import {
  getAdminCareRequests,
  getAdminCareRequestByCode,
  updateAdminCareStatus,
  addAdminCareEvent,
  confirmAdminOrderDelivery,
} from '../controllers/care.controller.js';
import {
  handleGetAdminAccounts,
  handleGetAdminAccountDetail,
  handleAdminAdjustPoints,
  handleGetAdminLedger,
  handleAdminEarnForOrder,
  handleAdminClawbackForOrder,
  handleGetAdminConfig,
} from '../controllers/loyalty.controller.js';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import { validateManualReconciliation } from '../validators/payment.validator.js';

/**
 * admin.routes.js — Dedicated, Secure Admin API Endpoints.
 * Conforms to PRD Section 6 & Prompt 8 Section 2 & 3:
 * - Every endpoint is strictly guarded by server-side authenticate + requireAdmin
 * - Blocks unauthenticated guests (401) and customer accounts (403)
 */

const router = Router();

// Apply server-side RBAC protection to ALL admin routes
router.use(authenticate, requireAdmin);

// 1. Dashboard statistics & inventory warnings
router.get('/stats', handleGetStats);

// 2. Orders list with pagination, search & status filter
router.get('/orders', handleGetOrders);

// 3. Order detail with customer info, prescription, 3D specs & snapshot
router.get('/orders/:orderCode', handleGetOrderDetails);

// 4. Update order status adhering to valid state machine transitions
router.patch('/orders/:orderCode/status', handleUpdateOrderStatus);
router.post('/orders/:orderCode/payment-reconciliation', validateManualReconciliation, handleReconcileOrderPayment);

// 5. Products catalog & inventory management in MySQL
router.get('/products', handleGetProducts);

// 6. Update product stock and price in MySQL
router.patch('/products/:id', handleUpdateProduct);

// 7. Lumina Care — After-Sales Support & Ticket Management
router.get('/care/requests', getAdminCareRequests);
router.get('/care/requests/:ticketCode', getAdminCareRequestByCode);
router.patch('/care/requests/:ticketCode/status', updateAdminCareStatus);
router.post('/care/requests/:ticketCode/events', addAdminCareEvent);

// 8. Delivery Tracking & Warranty Activation Confirmation
router.post('/orders/:orderCode/delivery', confirmAdminOrderDelivery);

// 9. Lumina Membership & Loyalty Management (Prompt 04)
router.get('/loyalty/accounts', handleGetAdminAccounts);
router.get('/loyalty/accounts/:userId', handleGetAdminAccountDetail);
router.post('/loyalty/accounts/:userId/adjust', handleAdminAdjustPoints);
router.get('/loyalty/ledger', handleGetAdminLedger);
router.post('/loyalty/orders/:orderCode/earn', handleAdminEarnForOrder);
router.post('/loyalty/orders/:orderCode/clawback', handleAdminClawbackForOrder);
router.get('/loyalty/config', handleGetAdminConfig);

// 10. Customer Retention & Analytics (Prompt 08)
router.get('/retention/analytics', handleGetRetentionAnalytics);

export default router;
