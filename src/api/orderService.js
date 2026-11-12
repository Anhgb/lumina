import { backendClient } from './apiClient';

/**
 * orderService.js — Frontend Order & Checkout Service communicating with Node.js/Express Backend.
 * Conforms to PRD Section 7 & Prompt 7 Section 8:
 * - Submits official checkout payload to POST /api/orders/checkout
 * - Handles server-side error mapping and health checks
 */

/**
 * Submit checkout payload to authoritative backend.
 * @param {Object} payload - { customer, items, voucherCode, paymentMethod, notes }
 * @returns {Promise<Object>} API response with { success, message, data: { orderCode, totalAmount, ... } }
 */
export async function checkoutOrder(payload) {
  try {
    const response = await backendClient.post('/api/orders/checkout', payload);
    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with an error status (400, 401, 403, 409, 500)
      const errData = error.response.data || {};
      const message = errData.message || 'Lỗi khi xử lý đơn hàng trên máy chủ.';
      const errors = errData.errors || [];
      const err = new Error(message);
      err.status = error.response.status;
      err.errors = errors;
      throw err;
    } else if (error.request) {
      // Network failure or backend server not reachable
      const err = new Error(
        'Không thể kết nối đến máy chủ Backend Lumina (Port 3000). Vui lòng kiểm tra Node.js server và kết nối MySQL trên XAMPP.'
      );
      err.status = 503;
      throw err;
    } else {
      throw error;
    }
  }
}

/**
 * Fetch detailed order information by order code.
 * @param {string} orderCode - e.g. LUM-261016-ABCD
 * @returns {Promise<Object>}
 */
export async function getOrderDetails(orderCode) {
  try {
    const response = await backendClient.get(`/api/orders/${orderCode}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      const err = new Error(error.response.data?.message || 'Không tìm thấy thông tin đơn hàng.');
      err.status = error.response.status;
      throw err;
    }
    throw error;
  }
}

/**
 * Health check ping to backend server.
 * @returns {Promise<Object>}
 */
export async function checkBackendHealth() {
  try {
    const response = await backendClient.get('/api/health');
    return response.data;
  } catch (error) {
    return {
      status: 'unreachable',
      error: error.message,
    };
  }
}
