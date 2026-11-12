import { backendClient } from './apiClient';

/**
 * careService.js — Frontend API service for Lumina Care & After-Sales Support.
 * Conforms to Customer Retention PRD (Prompt 03).
 */

function handleServiceError(error, defaultMsg) {
  if (error.response?.data?.message) {
    throw new Error(error.response.data.message);
  }
  throw new Error(defaultMsg || 'Đã có lỗi xảy ra trong quá trình xử lý.');
}

// ── Customer Operations ──

/**
 * Lấy danh sách phiếu yêu cầu chăm sóc của khách hàng.
 */
export async function fetchMyCareRequests() {
  try {
    const response = await backendClient.get('/api/care/requests');
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tải danh sách phiếu Lumina Care.');
  }
}

/**
 * Lấy chi tiết phiếu chăm sóc kèm lịch sử trao đổi.
 */
export async function fetchMyCareRequestDetail(ticketCode) {
  try {
    const response = await backendClient.get(`/api/care/requests/${encodeURIComponent(ticketCode)}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, `Không thể tải chi tiết phiếu "${ticketCode}".`);
  }
}

/**
 * Tạo phiếu yêu cầu Lumina Care mới.
 */
export async function createCareRequest(payload) {
  try {
    const response = await backendClient.post('/api/care/requests', payload);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tạo phiếu yêu cầu chăm sóc.');
  }
}

/**
 * Khách hàng gửi phản hồi bổ sung vào ticket.
 */
export async function sendCustomerCareMessage(ticketCode, content) {
  try {
    const response = await backendClient.post(`/api/care/requests/${encodeURIComponent(ticketCode)}/messages`, { content });
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể gửi phản hồi.');
  }
}

/**
 * Khách hàng đánh giá chất lượng xử lý ticket.
 */
export async function rateCareRequest(ticketCode, { rating, feedback }) {
  try {
    const response = await backendClient.post(`/api/care/requests/${encodeURIComponent(ticketCode)}/rate`, { rating, feedback });
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể gửi đánh giá.');
  }
}

/**
 * Khách hàng bấm nút "Đã nhận hàng an toàn".
 */
export async function confirmCustomerReceipt(orderCode, note = '') {
  try {
    const response = await backendClient.post(`/api/care/orders/${encodeURIComponent(orderCode)}/confirm-receipt`, { note });
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể xác nhận nhận hàng.');
  }
}

/**
 * Tra cứu thời hạn bảo hành thực tế của đơn hàng.
 */
export async function checkWarrantyCoverage(orderCode, orderItemId = null) {
  try {
    const query = orderItemId ? `?orderItemId=${orderItemId}` : '';
    const response = await backendClient.get(`/api/care/orders/${encodeURIComponent(orderCode)}/warranty${query}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tra cứu hạn bảo hành.');
  }
}

// ── Admin Operations ──

/**
 * Quản trị viên lấy danh sách ticket với bộ lọc.
 */
export async function fetchAdminCareRequests({ page = 1, limit = 20, status = '', requestType = '', search = '' } = {}) {
  try {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (status && status !== 'all') params.append('status', status);
    if (requestType && requestType !== 'all') params.append('requestType', requestType);
    if (search) params.append('search', search);

    const response = await backendClient.get(`/api/admin/care/requests?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể tải danh sách phiếu hỗ trợ Admin.');
  }
}

/**
 * Quản trị viên xem chi tiết ticket (kèm ghi chú nội bộ).
 */
export async function fetchAdminCareDetail(ticketCode) {
  try {
    const response = await backendClient.get(`/api/admin/care/requests/${encodeURIComponent(ticketCode)}`);
    return response.data;
  } catch (error) {
    handleServiceError(error, `Không thể tải chi tiết ticket "${ticketCode}".`);
  }
}

/**
 * Quản trị viên cập nhật trạng thái ticket.
 */
export async function updateAdminCareStatus(ticketCode, payload) {
  try {
    const response = await backendClient.patch(`/api/admin/care/requests/${encodeURIComponent(ticketCode)}/status`, payload);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể cập nhật trạng thái ticket.');
  }
}

/**
 * Quản trị viên thêm ghi chú nội bộ hoặc phản hồi riêng.
 */
export async function addAdminCareEvent(ticketCode, payload) {
  try {
    const response = await backendClient.post(`/api/admin/care/requests/${encodeURIComponent(ticketCode)}/events`, payload);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể thêm ghi chú/phản hồi.');
  }
}

/**
 * Quản trị viên xác nhận giao hàng và cập nhật vận đơn.
 */
export async function confirmAdminOrderDelivery(orderCode, payload) {
  try {
    const response = await backendClient.post(`/api/admin/orders/${encodeURIComponent(orderCode)}/delivery`, payload);
    return response.data;
  } catch (error) {
    handleServiceError(error, 'Không thể xác nhận giao hàng.');
  }
}

export default {
  fetchMyCareRequests,
  fetchMyCareRequestDetail,
  createCareRequest,
  sendCustomerCareMessage,
  rateCareRequest,
  confirmCustomerReceipt,
  checkWarrantyCoverage,
  fetchAdminCareRequests,
  fetchAdminCareDetail,
  updateAdminCareStatus,
  addAdminCareEvent,
  confirmAdminOrderDelivery,
};

