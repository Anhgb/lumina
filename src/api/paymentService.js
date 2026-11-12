import { backendClient } from './apiClient';

export async function initiatePayment({ orderCode, idempotencyKey }) {
  try {
    const response = await backendClient.post('/api/payments/initiate', { orderCode, idempotencyKey });
    return response.data;
  } catch (error) {
    throw mapPaymentError(error, 'Không thể khởi tạo thanh toán.');
  }
}

export async function getPaymentStatus(paymentCode) {
  try {
    const response = await backendClient.get(`/api/payments/${encodeURIComponent(paymentCode)}/status`);
    return response.data;
  } catch (error) {
    throw mapPaymentError(error, 'Không thể tải trạng thái thanh toán.');
  }
}

function mapPaymentError(error, fallback) {
  if (error.response) {
    const mapped = new Error(error.response.data?.message || fallback);
    mapped.status = error.response.status;
    mapped.code = error.response.data?.code;
    return mapped;
  }
  if (error.request) {
    const mapped = new Error('Không kết nối được máy chủ thanh toán. Đơn hàng đã tạo vẫn được lưu; hãy thử tải trạng thái lại.');
    mapped.status = 503;
    return mapped;
  }
  return error;
}
