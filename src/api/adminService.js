import { backendClient } from './apiClient';

/**
 * adminService.js — Frontend Admin API Service communicating with Backend.
 * Conforms to PRD Section 6 & Prompt 8:
 * - Fetches real-time MySQL statistics, order lists, and 3D custom eyewear specs
 * - Updates order statuses adhering to server-enforced state transitions
 * - Manages catalog inventory and pricing in MySQL
 */

/**
 * Fetch aggregated statistics directly from MySQL
 */
export async function fetchAdminStats() {
  try {
    const response = await backendClient.get('/api/admin/stats');
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tải thống kê quản trị từ máy chủ.');
  }
}

/**
 * Fetch paginated orders with optional status filter and search term
 */
export async function fetchAdminOrders({ page = 1, limit = 10, status = 'all', search = '' } = {}) {
  try {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (status && status !== 'all') params.append('status', status);
    if (search && search.trim()) params.append('search', search.trim());

    const response = await backendClient.get(`/api/admin/orders?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tải danh sách đơn hàng từ máy chủ.');
  }
}

/**
 * Fetch full order detail by orderCode (including 3D bespoke specs & snapshot)
 */
export async function fetchAdminOrderDetails(orderCode) {
  try {
    const response = await backendClient.get(`/api/admin/orders/${orderCode}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, `Không thể tải chi tiết đơn hàng "${orderCode}".`);
  }
}

/**
 * Update order status
 */
export async function updateAdminOrderStatus(orderCode, newStatus) {
  try {
    const response = await backendClient.patch(`/api/admin/orders/${orderCode}/status`, {
      status: newStatus,
    });
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể cập nhật trạng thái đơn hàng.');
  }
}

export async function reconcileAdminPayment(orderCode, reconciliation) {
  try {
    const response = await backendClient.post(
      `/api/admin/orders/${encodeURIComponent(orderCode)}/payment-reconciliation`,
      reconciliation
    );
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể ghi nhận đối soát thanh toán.');
  }
}

/**
 * Fetch products list from MySQL for Admin inventory view
 */
export async function fetchAdminProducts({ category = 'all', search = '', lowStock = false } = {}) {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (search && search.trim()) params.append('search', search.trim());
    if (lowStock) params.append('lowStock', 'true');

    const response = await backendClient.get(`/api/admin/products?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tải danh sách tồn kho từ máy chủ.');
  }
}

/**
 * Update product stock or price in MySQL
 */
export async function updateAdminProduct(productId, updates = {}) {
  try {
    const response = await backendClient.patch(`/api/admin/products/${productId}`, updates);
    return response.data;
  } catch (error) {
    handleServiceError(error, `Không thể cập nhật sản phẩm "${productId}".`);
  }
}

/**
 * Fetch Customer Retention & Operations Analytics (Prompt 08)
 */
export async function fetchAdminRetentionAnalytics({ period = 'all', windowDays = 90 } = {}) {
  try {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (windowDays) params.append('windowDays', windowDays.toString());

    const response = await backendClient.get(`/api/admin/retention/analytics?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tải số liệu Retention & Chăm sóc khách hàng.');
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
      'Không thể kết nối đến máy chủ Backend Lumina (Port 3000). Vui lòng kiểm tra Node.js server và XAMPP MySQL.'
    );
    err.status = 503;
    throw err;
  } else {
    throw error;
  }
}
