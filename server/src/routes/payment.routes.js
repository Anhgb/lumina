import { Router } from 'express';
import {
  handleGetPaymentStatus,
  handleInitiatePayment,
  handlePaymentWebhook,
} from '../controllers/payment.controller.js';
import { authenticate, requireCustomer } from '../middleware/authMiddleware.js';
import { validatePaymentInitiation } from '../validators/payment.validator.js';

const router = Router();

router.post('/payments/initiate', authenticate, requireCustomer, validatePaymentInitiation, handleInitiatePayment);
router.get('/payments/:paymentCode/status', authenticate, handleGetPaymentStatus);
// The mock endpoint always rejects callbacks; it cannot certify a real transfer.
router.post('/payments/webhook/:provider', handlePaymentWebhook);

export default router;
