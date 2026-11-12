import express from 'express';
import { authenticate, requireCustomer } from '../middleware/authMiddleware.js';
import {
  handleGetCustomerOverview,
  handleGetCustomerTransactions,
  handleGetPublicTiers,
  handleRedeemPreview,
  handleRedeemPoints,
} from '../controllers/loyalty.controller.js';

export const customerLoyaltyRouter = express.Router();
export const publicLoyaltyRouter = express.Router();

// Public routes
publicLoyaltyRouter.get('/tiers', handleGetPublicTiers);

// Customer-only authenticated routes (/api/me/loyalty/*)
customerLoyaltyRouter.use(authenticate, requireCustomer);
customerLoyaltyRouter.get('/', handleGetCustomerOverview);
customerLoyaltyRouter.get('/transactions', handleGetCustomerTransactions);
customerLoyaltyRouter.post('/redeem-preview', handleRedeemPreview);
customerLoyaltyRouter.post('/redeem', handleRedeemPoints);

export default {
  customerLoyaltyRouter,
  publicLoyaltyRouter,
};
