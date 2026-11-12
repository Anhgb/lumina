import crypto from 'crypto';
import { pool } from '../config/database.js';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../middleware/errorHandler.js';
import { createPaymentCode, getPaymentProvider } from './paymentProvider.js';

function serializePayment(payment) {
  if (!payment) return null;
  return {
    paymentCode: payment.payment_code,
    orderCode: payment.order_code,
    provider: payment.provider,
    paymentMethod: payment.payment_method,
    amount: Number(payment.amount),
    currency: payment.currency,
    status: payment.status,
    providerTransactionId: payment.provider_transaction_id,
    reference: payment.reconciliation_reference,
    verificationNote: payment.verification_note,
    verifiedBy: payment.verified_by,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at,
    paidAt: payment.paid_at,
  };
}

export async function listPaymentHistory(orderId, connection = pool) {
  const [payments] = await connection.query(
    `SELECT payment_code, order_id, provider, payment_method, amount, currency,
            status, provider_transaction_id, reconciliation_reference,
            verification_note, verified_by, created_at, updated_at, paid_at
     FROM payments WHERE order_id = ? ORDER BY created_at DESC, id DESC`,
    [orderId]
  );
  return payments.map(serializePayment);
}

export async function initiatePayment({ orderCode, idempotencyKey, user }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id, order_code, user_id, payment_method, total_amount, payment_status, status
       FROM orders WHERE order_code = ? FOR UPDATE`,
      [orderCode]
    );

    if (orders.length === 0) throw new NotFoundError(`Không tìm thấy đơn hàng "${orderCode}".`);
    const order = orders[0];
    if (user.role !== 'admin' && order.user_id !== user.id) {
      throw new ForbiddenError('Bạn không có quyền thanh toán đơn hàng này.');
    }

    const scopedIdempotencyKey = `${order.order_code}:${idempotencyKey}`;
    const [sameRequest] = await connection.query(
      'SELECT * FROM payments WHERE idempotency_key = ? LIMIT 1',
      [scopedIdempotencyKey]
    );
    if (sameRequest.length > 0) {
      await connection.commit();
      return serializePayment({ ...sameRequest[0], order_code: order.order_code });
    }

    if (order.status === 'cancelled') throw new ConflictError('Đơn hàng đã bị hủy, không thể thanh toán.');
    if (order.payment_method !== 'banking') {
      throw new BadRequestError('Đơn hàng COD được thanh toán khi nhận hàng và không cần khởi tạo giao dịch online.');
    }
    if (order.payment_status === 'paid' || order.payment_status === 'refunded') {
      throw new ConflictError('Đơn hàng đã được thanh toán hoặc hoàn tiền.');
    }

    // Reuse an active attempt even when the browser has generated a new key.
    const [pendingPayments] = await connection.query(
      `SELECT * FROM payments WHERE order_id = ? AND status = 'pending'
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      [order.id]
    );
    if (pendingPayments.length > 0) {
      await connection.commit();
      return serializePayment({ ...pendingPayments[0], order_code: order.order_code });
    }

    const provider = getPaymentProvider();
    const paymentCode = createPaymentCode();
    const providerResult = await provider.initiate({
      paymentCode,
      orderCode: order.order_code,
      paymentMethod: order.payment_method,
      amount: Number(order.total_amount),
      currency: 'VND',
    });

    // The demo provider is deliberately restricted to a pending instruction.
    if (providerResult.status !== 'pending' || providerResult.providerTransactionId) {
      throw new AppError('Provider demo trả về kết quả thanh toán không hợp lệ.', 502, 'INVALID_PROVIDER_RESPONSE');
    }

    await connection.query(
      `INSERT INTO payments (
        payment_code, order_id, provider, payment_method, amount, currency, status,
        provider_transaction_id, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, 'VND', 'pending', NULL, ?)`,
      [paymentCode, order.id, provider.name, order.payment_method, order.total_amount, scopedIdempotencyKey]
    );
    await connection.query(
      `UPDATE orders SET payment_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [order.id]
    );
    const [created] = await connection.query('SELECT * FROM payments WHERE payment_code = ?', [paymentCode]);
    await connection.commit();
    return {
      ...serializePayment({ ...created[0], order_code: order.order_code }),
      paymentUrl: providerResult.paymentUrl,
      instructions: providerResult.instructions,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPaymentStatus(paymentCode, user) {
  const [rows] = await pool.query(
    `SELECT p.*, o.order_code, o.user_id
     FROM payments p JOIN orders o ON o.id = p.order_id
     WHERE p.payment_code = ? LIMIT 1`,
    [paymentCode]
  );
  if (rows.length === 0) throw new NotFoundError('Không tìm thấy giao dịch thanh toán.');
  if (user.role !== 'admin' && rows[0].user_id !== user.id) {
    throw new ForbiddenError('Bạn không có quyền xem giao dịch này.');
  }
  return serializePayment(rows[0]);
}

export async function processMockWebhook(providerName) {
  if (providerName !== 'mock') throw new NotFoundError('Payment provider chưa được cấu hình.');
  const provider = getPaymentProvider();
  const verification = await provider.verifyWebhook();
  if (!verification.valid) {
    throw new UnauthorizedError('Webhook mock không thể xác minh giao dịch ngân hàng.');
  }
  throw new AppError('Webhook mock không hỗ trợ ghi nhận thanh toán.', 501, 'WEBHOOK_UNSUPPORTED');
}

export async function reconcileOrderPayment({ orderCode, outcome, reference, note, admin }) {
  if (!['paid', 'failed'].includes(outcome)) throw new BadRequestError('Kết quả đối soát không hợp lệ.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query(
      `SELECT id, order_code, payment_method, total_amount, payment_status, status
       FROM orders WHERE order_code = ? FOR UPDATE`,
      [orderCode]
    );
    if (orders.length === 0) throw new NotFoundError(`Không tìm thấy đơn hàng "${orderCode}".`);
    const order = orders[0];
    if (order.status === 'cancelled') throw new ConflictError('Không thể đối soát thanh toán cho đơn hàng đã hủy.');
    if (order.payment_status === 'paid' || order.payment_status === 'refunded') {
      throw new ConflictError('Đơn hàng đã được thanh toán hoặc hoàn tiền; không thể ghi nhận lần nữa.');
    }
    if (order.payment_status === 'failed' && outcome === 'failed') {
      throw new ConflictError('Giao dịch đã được ghi nhận thất bại; không thể lặp lại cùng trạng thái.');
    }

    const [pending] = await connection.query(
      `SELECT id FROM payments WHERE order_id = ? AND status = 'pending'
       ORDER BY created_at DESC, id DESC LIMIT 1 FOR UPDATE`,
      [order.id]
    );
    if (pending.length > 0) {
      await connection.query(
        `UPDATE payments SET status = ?, reconciliation_reference = ?, verification_note = ?,
          verified_by = ?, paid_at = CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END,
          updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`,
        [outcome, reference, note, admin.id, outcome, pending[0].id]
      );
    } else {
      const paymentCode = createPaymentCode();
      await connection.query(
        `INSERT INTO payments (
          payment_code, order_id, provider, payment_method, amount, currency, status,
          idempotency_key, reconciliation_reference, verification_note, verified_by, paid_at
        ) VALUES (?, ?, 'manual', ?, ?, 'VND', ?, ?, ?, ?, ?, CASE WHEN ? = 'paid' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
        [
          paymentCode,
          order.id,
          order.payment_method,
          order.total_amount,
          outcome,
          `manual:${crypto.randomUUID()}`,
          reference,
          note,
          admin.id,
          outcome,
        ]
      );
    }

    await connection.query(
      'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [outcome, order.id]
    );
    const payments = await listPaymentHistory(order.id, connection);
    await connection.commit();
    return {
      orderCode: order.order_code,
      paymentStatus: outcome,
      totalAmount: Number(order.total_amount),
      payments,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
