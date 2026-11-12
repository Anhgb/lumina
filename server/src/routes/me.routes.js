import { Router } from 'express';
import {
  handleGetProfile,
  handleGetOrders,
  handleGetOrderDetails,
  handleGetDesigns,
} from '../controllers/me.controller.js';
import { authenticate, requireCustomer } from '../middleware/authMiddleware.js';

/**
 * me.routes.js — Dedicated, Secure Endpoints for Authenticated Customers.
 * Conforms to Customer Retention PRD (Prompt 02):
 * - Guarded strictly by authenticate + requireCustomer
 * - Blocks unauthenticated guests (401) and admins (403)
 * - Zero IDOR: extracts userId strictly from server-side req.user.id
 */

const router = Router();

// Apply server-side RBAC protection to ALL /api/me routes
router.use(authenticate, requireCustomer);

// 1. Customer profile, metrics and loyalty tier overview
router.get('/profile', handleGetProfile);

// 2. Paginated order history of the authenticated customer
router.get('/orders', handleGetOrders);

// 3. Detailed order lookup by orderCode (ownership enforced)
router.get('/orders/:orderCode', handleGetOrderDetails);

// 4. Saved / purchased 3D Bespoke designs collection
router.get('/designs', handleGetDesigns);

export default router;

