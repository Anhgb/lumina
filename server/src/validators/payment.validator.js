import { BadRequestError } from '../middleware/errorHandler.js';

export function validatePaymentInitiation(req, res, next) {
  const { orderCode, idempotencyKey } = req.body || {};
  if (typeof orderCode !== 'string' || orderCode.trim().length < 5 || orderCode.length > 50) {
    return next(new BadRequestError('Mã đơn hàng không hợp lệ.'));
  }
  if (
    typeof idempotencyKey !== 'string' ||
    idempotencyKey.trim().length < 8 ||
    idempotencyKey.length > 64
  ) {
    return next(new BadRequestError('Khóa idempotency phải dài từ 8 đến 64 ký tự.'));
  }
  req.body.orderCode = orderCode.trim();
  req.body.idempotencyKey = idempotencyKey.trim();
  next();
}

export function validateManualReconciliation(req, res, next) {
  const { outcome, reference, note } = req.body || {};
  if (!['paid', 'failed'].includes(outcome)) {
    return next(new BadRequestError('Kết quả đối soát phải là paid hoặc failed.'));
  }
  if (typeof note !== 'string' || note.trim().length < 5 || note.length > 500) {
    return next(new BadRequestError('Ghi chú đối soát phải có từ 5 đến 500 ký tự.'));
  }
  if (
    outcome === 'paid' &&
    (typeof reference !== 'string' || reference.trim().length < 4 || reference.length > 128)
  ) {
    return next(new BadRequestError('Cần mã tham chiếu giao dịch hợp lệ để xác nhận đã thanh toán.'));
  }
  req.body.reference = typeof reference === 'string' ? reference.trim() : null;
  req.body.note = note.trim();
  next();
}
