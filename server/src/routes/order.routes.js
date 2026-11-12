import { Router } from 'express';
import { handleCheckout, getOrderDetails, previewOrderPricing } from '../controllers/order.controller.js';
import { authenticate, requireCustomer } from '../middleware/authMiddleware.js';
import { validateCheckoutPayload } from '../validators/checkout.validator.js';

const router = Router();

/**
 * POST /api/orders/checkout — Official Checkout Transaction Endpoint.
 * Conforms to PRD Section 5.8 & Prompt 7 Section 5.
 */
router.post(
  '/orders/checkout',
  authenticate,
  requireCustomer,
  validateCheckoutPayload,
  handleCheckout
);

/**
 * POST /api/orders/preview — Pre-checkout Price & Stock Preview.
 */
router.post('/orders/preview', previewOrderPricing);

/**
 * GET /api/orders/:orderCode — Look up order details by code.
 */
router.get('/orders/:orderCode', authenticate, getOrderDetails);

export default router;
