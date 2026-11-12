import {
  getAdminStats,
  getAdminOrders,
  getAdminOrderDetails,
  updateOrderStatus,
  getAdminProducts,
  updateAdminProduct,
} from '../services/admin.service.js';
import { reconcileOrderPayment } from '../services/payment.service.js';
import { getRetentionAnalytics } from '../services/retention.service.js';

/**
 * admin.controller.js — Admin Dashboard API Controllers.
 * Conforms to PRD Section 6 & Prompt 8.
 */

export async function handleGetStats(req, res, next) {
  try {
    const stats = await getAdminStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetOrders(req, res, next) {
  try {
    const { page, limit, status, search } = req.query;
    const result = await getAdminOrders({ page, limit, status, search });
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetOrderDetails(req, res, next) {
  try {
    const { orderCode } = req.params;
    const order = await getAdminOrderDetails(orderCode);
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateOrderStatus(req, res, next) {
  try {
    const { orderCode } = req.params;
    const { status } = req.body;
    const result = await updateOrderStatus(orderCode, status);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleReconcileOrderPayment(req, res, next) {
  try {
    const result = await reconcileOrderPayment({
      orderCode: req.params.orderCode,
      ...req.body,
      admin: req.user,
    });
    res.status(200).json({
      success: true,
      message: result.paymentStatus === 'paid' ? 'Đã ghi nhận đối soát thanh toán.' : 'Đã ghi nhận giao dịch thất bại.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetProducts(req, res, next) {
  try {
    const { category, search, lowStock } = req.query;
    const products = await getAdminProducts({ category, search, lowStock });
    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { stock, price, is_active } = req.body;
    const result = await updateAdminProduct(id, { stock, price, is_active });
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetRetentionAnalytics(req, res, next) {
  try {
    const { period, windowDays } = req.query;
    const analytics = await getRetentionAnalytics({ period, windowDays });
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
}
