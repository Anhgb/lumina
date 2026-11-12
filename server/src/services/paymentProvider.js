import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';

function assertMockProviderAllowed() {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true') {
    throw new AppError('Mock payment chỉ khả dụng trong môi trường demo.', 503, 'PAYMENT_PROVIDER_UNAVAILABLE');
  }
}

/**
 * Safe demo provider. It only creates a pending payment instruction; it cannot
 * verify transfers, accept successful callbacks, or mark an order as paid.
 */
export const mockPaymentProvider = {
  name: 'mock',

  async initiate({ paymentCode, paymentMethod }) {
    assertMockProviderAllowed();
    return {
      provider: this.name,
      status: 'pending',
      providerTransactionId: null,
      paymentUrl: null,
      instructions:
        paymentMethod === 'banking'
          ? 'QR/chuyển khoản demo cần được Admin đối soát thủ công.'
          : 'Thanh toán COD được xác nhận sau khi Admin ghi nhận đã thu tiền.',
      reference: paymentCode,
    };
  },

  async verifyWebhook() {
    assertMockProviderAllowed();
    return { valid: false, reason: 'Mock provider không xác minh webhook hoặc giao dịch ngân hàng.' };
  },
};

export function getPaymentProvider() {
  const providerName = (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
  if (providerName !== 'mock') {
    throw new AppError('Payment provider chưa được cấu hình.', 503, 'PAYMENT_PROVIDER_UNAVAILABLE');
  }
  assertMockProviderAllowed();
  return mockPaymentProvider;
}

export function createPaymentCode() {
  return `PAY-${crypto.randomUUID()}`;
}
