import {
  getPaymentStatus,
  initiatePayment,
  processMockWebhook,
} from '../services/payment.service.js';

export async function handleInitiatePayment(req, res, next) {
  try {
    const payment = await initiatePayment({ ...req.body, user: req.user });
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

export async function handleGetPaymentStatus(req, res, next) {
  try {
    const payment = await getPaymentStatus(req.params.paymentCode, req.user);
    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
}

export async function handlePaymentWebhook(req, res, next) {
  try {
    await processMockWebhook(req.params.provider);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}
