import { processCheckout, getOrderByCode } from '../services/checkout.service.js';
import { verifyOrderPricingAndStock } from '../services/pricing.service.js';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

/**
 * order.controller.js — Order & Checkout API Handlers.
 * Conforms to Prompt 7 Section 5 & QA Audit.
 */

export async function handleCheckout(req, res, next) {
  try {
    const { customer, items, voucherCode, paymentMethod, orderNotes } = req.body;

    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent']?.slice(0, 255) || null;

    const orderConfirmation = await processCheckout({
      user: req.user,
      customer,
      items,
      voucherCode,
      paymentMethod: paymentMethod || 'cod',
      orderNotes,
      ipAddress,
      userAgent,
    });

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công. Đơn hàng của bạn đã được ghi nhận vào hệ thống.',
      data: orderConfirmation,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderDetails(req, res, next) {
  try {
    const { orderCode } = req.params;
    const order = await getOrderByCode(orderCode);

    if (!order) {
      throw new NotFoundError(`Không tìm thấy đơn hàng với mã "${orderCode}".`);
    }

    // Security Check: Enforce order ownership (Customer can only view own order; Admin can view all)
    if (req.user && req.user.role !== 'admin' && order.user_id !== req.user.id) {
      throw new ForbiddenError('Bạn không có quyền truy cập vào thông tin đơn hàng này.');
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function previewOrderPricing(req, res, next) {
  try {
    const { items, voucherCode } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          subtotalAmount: 0,
          shippingFee: 0,
          discountAmount: 0,
          totalAmount: 0,
        },
      });
    }

    const preview = await verifyOrderPricingAndStock(items, voucherCode);
    res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error) {
    next(error);
  }
}
