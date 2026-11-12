import { backendClient } from './apiClient';

/**
 * customerService.js — Frontend API client for /api/me (My Lumina Customer Portal).
 * Conforms to Customer Retention PRD (Prompt 02).
 */

/**
 * Fetch authenticated customer's profile, statistics and membership info.
 * @returns {Promise<Object>}
 */
export async function fetchMyProfile() {
  try {
    const response = await backendClient.get('/api/me/profile');
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tải thông tin hồ sơ tài khoản.');
  }
}

/**
 * Fetch authenticated customer's order history with pagination & status filter.
 * @param {Object} options - { page, limit, status }
 * @returns {Promise<Object>}
 */
export async function fetchMyOrders({ page = 1, limit = 10, status = 'all' } = {}) {
  try {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (status && status !== 'all') params.append('status', status);

    const response = await backendClient.get(`/api/me/orders?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tải danh sách đơn hàng của bạn.');
  }
}

/**
 * Fetch details of a single order owned by the authenticated customer.
 * @param {string} orderCode
 * @returns {Promise<Object>}
 */
export async function fetchMyOrderDetails(orderCode) {
  try {
    const response = await backendClient.get(`/api/me/orders/${encodeURIComponent(orderCode)}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, `Không thể tải chi tiết đơn hàng "${orderCode}".`);
  }
}

/**
 * Fetch all 3D Bespoke designs purchased by the authenticated customer.
 * @returns {Promise<Object>}
 */
export async function fetchMyBespokeDesigns() {
  try {
    const response = await backendClient.get('/api/me/designs');
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tải bộ sưu tập thiết kế kính 3D.');
  }
}

function handleServiceError(error, defaultMessage) {
  if (error.response) {
    const errData = error.response.data || {};
    const err = new Error(errData.message || defaultMessage);
    err.status = error.response.status;
    err.code = errData.code;
    throw err;
  } else if (error.request) {
    const err = new Error(
      'Không thể kết nối đến máy chủ Backend Lumina. Vui lòng kiểm tra Node.js server.'
    );
    err.status = 503;
    throw err;
  } else {
    throw error;
  }
}

