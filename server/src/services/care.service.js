import crypto from 'crypto';
import { pool } from '../config/database.js';
import { getSystemConfig } from './config.service.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../middleware/errorHandler.js';
import { triggerDeliveryVerified, triggerCareRequestUpdated } from './notification.service.js';

/**
 * State machine hợp lệ cho yêu cầu After-Sales & Lumina Care.
 */
export const VALID_STATUS_TRANSITIONS = {
  submitted: ['reviewing', 'rejected', 'closed'],
  reviewing: ['waiting_customer', 'approved', 'rejected', 'in_progress', 'closed'],
  waiting_customer: ['reviewing', 'closed'],
  approved: ['in_progress', 'closed'],
  in_progress: ['resolved', 'waiting_customer', 'closed'],
  resolved: ['closed', 'reviewing'],
  rejected: ['closed'],
  closed: [],
};

export const VALID_REQUEST_TYPES = [
  'warranty_claim',
  'fit_adjustment',
  'deep_cleaning',
  'repair_service',
  'usage_consultation',
  'catalog_return',
  'other',
];

/**
 * Sinh mã Ticket Code duy nhất theo định dạng CARE-YYYYMMDD-XXXX
 */
function generateTicketCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CARE-${dateStr}-${randomHex}`;
}

/**
 * Khách hàng tạo phiếu yêu cầu Lumina Care.
 * 
 * @param {object} params
 * @param {string} params.userId
 * @param {number|string} params.orderIdOrCode
 * @param {number|null} [params.orderItemId=null]
 * @param {string} params.requestType
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} params.contactPhone
 * @returns {Promise<object>}
 */
export async function createCareRequest({
  userId,
  orderIdOrCode,
  orderItemId = null,
  requestType,
  title,
  description,
  contactPhone,
}) {
  if (!userId) {
    const error = new Error('Yêu cầu đăng nhập để gửi phiếu chăm sóc sau mua.');
    error.statusCode = error.status = 401;
    throw error;
  }

  if (!VALID_REQUEST_TYPES.includes(requestType)) {
    const error = new Error(`Loại yêu cầu '${requestType}' không hợp lệ.`);
    error.statusCode = error.status = 400;
    throw error;
  }

  if (!title || !title.trim()) {
    const error = new Error('Tiêu đề yêu cầu không được để trống.');
    error.statusCode = error.status = 400;
    throw error;
  }

  if (!description || !description.trim()) {
    const error = new Error('Mô tả chi tiết vấn đề không được để trống.');
    error.statusCode = error.status = 400;
    throw error;
  }

  if (!contactPhone || !contactPhone.trim()) {
    const error = new Error('Số điện thoại liên hệ không được để trống.');
    error.statusCode = error.status = 400;
    throw error;
  }

  // 1. Kiểm tra quyền sở hữu đơn hàng
  const [orders] = await pool.query(
    `SELECT id, order_code, user_id, status FROM orders WHERE (id = ? OR order_code = ?) LIMIT 1`,
    [orderIdOrCode, orderIdOrCode]
  );

  if (!orders || orders.length === 0) {
    const error = new Error('Không tìm thấy đơn hàng yêu cầu.');
    error.statusCode = error.status = 404;
    throw error;
  }

  const order = orders[0];
  if (order.user_id !== userId) {
    const error = new Error('Bạn không có quyền tạo yêu cầu hỗ trợ cho đơn hàng của người khác.');
    error.statusCode = error.status = 403;
    throw error;
  }

  // 2. Nếu có orderItemId, kiểm tra xem có thuộc đơn hàng không
  let validOrderItemId = null;
  if (orderItemId) {
    const [items] = await pool.query(
      `SELECT id FROM order_items WHERE id = ? AND order_id = ? LIMIT 1`,
      [orderItemId, order.id]
    );
    if (!items || items.length === 0) {
      const error = new Error('Sản phẩm chỉ định không thuộc đơn hàng này.');
      error.statusCode = error.status = 400;
      throw error;
    }
    validOrderItemId = items[0].id;
  }

  // 3. Tạo ticket trong transaction
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let ticketCode = generateTicketCode();
    // Đảm bảo không trùng mã (rất hiếm)
    let isUnique = false;
    while (!isUnique) {
      const [existing] = await conn.query(
        `SELECT id FROM after_sales_requests WHERE ticket_code = ? LIMIT 1`,
        [ticketCode]
      );
      if (existing.length === 0) {
        isUnique = true;
      } else {
        ticketCode = generateTicketCode();
      }
    }

    const [res] = await conn.query(
      `INSERT INTO after_sales_requests 
       (ticket_code, user_id, order_id, order_item_id, request_type, status, title, description, contact_phone)
       VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
      [ticketCode, userId, order.id, validOrderItemId, requestType, title.trim(), description.trim(), contactPhone.trim()]
    );

    const requestId = res.insertId;

    // Ghi event tạo ticket ban đầu
    await conn.query(
      `INSERT INTO after_sales_events 
       (request_id, actor_type, actor_id, event_type, content, is_internal_only)
       VALUES (?, 'customer', ?, 'created', ?, 0)`,
      [requestId, userId, description.trim()]
    );

    await conn.commit();

    return {
      success: true,
      requestId,
      ticketCode,
      status: 'submitted',
      message: 'Yêu cầu hỗ trợ Lumina Care đã được tiếp nhận thành công.',
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Lấy danh sách phiếu yêu cầu chăm sóc của khách hàng hiện tại.
 * 
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
export async function getCustomerCareRequests(userId) {
  if (!userId) {
    const error = new Error('Yêu cầu đăng nhập.');
    error.statusCode = error.status = 401;
    throw error;
  }

  const [rows] = await pool.query(
    `SELECT 
      r.id,
      r.ticket_code AS ticketCode,
      r.order_id AS orderId,
      o.order_code AS orderCode,
      r.order_item_id AS orderItemId,
      oi.product_name AS productName,
      r.request_type AS requestType,
      r.priority,
      r.status,
      r.title,
      r.description,
      r.contact_phone AS contactPhone,
      r.resolution_summary AS resolutionSummary,
      r.customer_rating AS customerRating,
      r.created_at AS createdAt,
      r.updated_at AS updatedAt,
      r.resolved_at AS resolvedAt,
      r.closed_at AS closedAt
     FROM after_sales_requests r
     JOIN orders o ON r.order_id = o.id
     LEFT JOIN order_items oi ON r.order_item_id = oi.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`,
    [userId]
  );

  return rows;
}

/**
 * Lấy chi tiết phiếu yêu cầu của khách hàng kèm chuỗi trao đổi công khai (bảo mật không lộ ghi chú nội bộ).
 * 
 * @param {string} userId
 * @param {string} ticketCode
 * @returns {Promise<object>}
 */
export async function getCustomerCareRequestByCode(userId, ticketCode) {
  if (!userId) {
    const error = new Error('Yêu cầu đăng nhập.');
    error.statusCode = error.status = 401;
    throw error;
  }

  const [requests] = await pool.query(
    `SELECT 
      r.id,
      r.ticket_code AS ticketCode,
      r.user_id AS userId,
      r.order_id AS orderId,
      o.order_code AS orderCode,
      o.created_at AS orderCreatedAt,
      r.order_item_id AS orderItemId,
      oi.product_name AS productName,
      r.request_type AS requestType,
      r.priority,
      r.status,
      r.title,
      r.description,
      r.contact_phone AS contactPhone,
      r.resolution_summary AS resolutionSummary,
      r.customer_rating AS customerRating,
      r.customer_feedback AS customerFeedback,
      r.created_at AS createdAt,
      r.updated_at AS updatedAt,
      r.resolved_at AS resolvedAt,
      r.closed_at AS closedAt
     FROM after_sales_requests r
     JOIN orders o ON r.order_id = o.id
     LEFT JOIN order_items oi ON r.order_item_id = oi.id
     WHERE r.ticket_code = ?
     LIMIT 1`,
    [ticketCode]
  );

  if (!requests || requests.length === 0) {
    const error = new Error('Không tìm thấy phiếu yêu cầu.');
    error.statusCode = error.status = 404;
    throw error;
  }

  const ticket = requests[0];

  // BẢO MẬT: Kiểm tra IDOR
  if (ticket.userId !== userId) {
    const error = new Error('Bạn không có quyền truy cập phiếu yêu cầu này.');
    error.statusCode = error.status = 403;
    throw error;
  }

  // Lấy các sự kiện trao đổi công khai (KHÔNG LẤY is_internal_only = 1)
  const [events] = await pool.query(
    `SELECT 
      id,
      actor_type AS actorType,
      actor_id AS actorId,
      event_type AS eventType,
      content,
      created_at AS createdAt
     FROM after_sales_events
     WHERE request_id = ? AND is_internal_only = 0
     ORDER BY created_at ASC`,
    [ticket.id]
  );

  delete ticket.userId; // Che dấu user_id nội bộ

  return {
    ...ticket,
    events,
  };
}

/**
 * Khách hàng gửi thêm tin nhắn / phản hồi vào phiếu yêu cầu đang mở.
 * 
 * @param {string} userId
 * @param {string} ticketCode
 * @param {string} content
 * @returns {Promise<object>}
 */
export async function addCustomerMessage(userId, ticketCode, content) {
  if (!content || !content.trim()) {
    const error = new Error('Nội dung phản hồi không được để trống.');
    error.statusCode = error.status = 400;
    throw error;
  }

  const [requests] = await pool.query(
    `SELECT id, user_id, status FROM after_sales_requests WHERE ticket_code = ? LIMIT 1`,
    [ticketCode]
  );

  if (!requests || requests.length === 0) {
    const error = new Error('Không tìm thấy phiếu yêu cầu.');
    error.statusCode = error.status = 404;
    throw error;
  }

  const ticket = requests[0];
  if (ticket.user_id !== userId) {
    const error = new Error('Bạn không có quyền phản hồi phiếu này.');
    error.statusCode = error.status = 403;
    throw error;
  }

  if (ticket.status === 'closed') {
    const error = new Error('Phiếu yêu cầu đã đóng, không thể gửi thêm phản hồi.');
    error.statusCode = error.status = 400;
    throw error;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO after_sales_events 
       (request_id, actor_type, actor_id, event_type, content, is_internal_only)
       VALUES (?, 'customer', ?, 'customer_message', ?, 0)`,
      [ticket.id, userId, content.trim()]
    );

    // Nếu phiếu đang chờ khách hàng bổ sung thông tin (waiting_customer), tự động chuyển về reviewing
    let newStatus = ticket.status;
    if (ticket.status === 'waiting_customer') {
      newStatus = 'reviewing';
      await conn.query(
        `UPDATE after_sales_requests SET status = 'reviewing', updated_at = NOW() WHERE id = ?`,
        [ticket.id]
      );

      await conn.query(
        `INSERT INTO after_sales_events 
         (request_id, actor_type, actor_id, event_type, content, is_internal_only)
         VALUES (?, 'system', 'system', 'status_change', 'Khách hàng đã phản hồi thông tin. Trạng thái chuyển về Đang xem xét.', 0)`,
        [ticket.id]
      );
    } else {
      await conn.query(
        `UPDATE after_sales_requests SET updated_at = NOW() WHERE id = ?`,
        [ticket.id]
      );
    }

    await conn.commit();

    // Trigger non-blocking event-driven notification (Prompt 06)
    triggerCareRequestUpdated(
      { id: ticket.id, user_id: ticket.user_id, ticket_code: ticketCode, status: newStatus },
      newStatus
    ).catch(() => {});

    return {
      success: true,
      ticketCode,
      status: newStatus,
      message: 'Đã gửi phản hồi thành công.',
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Khách hàng đánh giá chất lượng xử lý phiếu yêu cầu.
 * 
 * @param {string} userId
 * @param {string} ticketCode
 * @param {number} rating (1-5)
 * @param {string} [feedback='']
 * @returns {Promise<object>}
 */
export async function rateCareRequest(userId, ticketCode, rating, feedback = '') {
  const numRating = parseInt(rating, 10);
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    const error = new Error('Điểm đánh giá phải từ 1 đến 5 sao.');
    error.statusCode = error.status = 400;
    throw error;
  }

  const [requests] = await pool.query(
    `SELECT id, user_id, status FROM after_sales_requests WHERE ticket_code = ? LIMIT 1`,
    [ticketCode]
  );

  if (!requests || requests.length === 0) {
    const error = new Error('Không tìm thấy phiếu yêu cầu.');
    error.statusCode = error.status = 404;
    throw error;
  }

  if (requests[0].user_id !== userId) {
    const error = new Error('Bạn không có quyền đánh giá phiếu này.');
    error.statusCode = error.status = 403;
    throw error;
  }

  await pool.query(
    `UPDATE after_sales_requests 
     SET customer_rating = ?, customer_feedback = ?, updated_at = NOW() 
     WHERE id = ?`,
    [numRating, feedback ? feedback.trim() : null, requests[0].id]
  );

  return { success: true, message: 'Cảm ơn quý khách đã gửi đánh giá dịch vụ.' };
}

/**
 * Quản trị viên lấy danh sách toàn bộ phiếu yêu cầu Lumina Care có phân trang, lọc và tìm kiếm.
 * 
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.status]
 * @param {string} [params.requestType]
 * @param {string} [params.search]
 * @returns {Promise<object>}
 */
export async function getAdminCareRequests({
  page = 1,
  limit = 20,
  status,
  requestType,
  search,
} = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (p - 1) * l;

  const conditions = [];
  const queryParams = [];

  if (status) {
    conditions.push('r.status = ?');
    queryParams.push(status);
  }

  if (requestType) {
    conditions.push('r.request_type = ?');
    queryParams.push(requestType);
  }

  if (search) {
    conditions.push('(r.ticket_code LIKE ? OR o.order_code LIKE ? OR r.title LIKE ? OR r.contact_phone LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total 
     FROM after_sales_requests r
     JOIN orders o ON r.order_id = o.id
     ${whereClause}`,
    queryParams
  );

  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT 
      r.id,
      r.ticket_code AS ticketCode,
      r.user_id AS userId,
      r.order_id AS orderId,
      o.order_code AS orderCode,
      o.customer_name AS customerName,
      o.customer_email AS customerEmail,
      r.order_item_id AS orderItemId,
      oi.product_name AS productName,
      r.request_type AS requestType,
      r.priority,
      r.status,
      r.title,
      r.description,
      r.contact_phone AS contactPhone,
      r.assigned_to AS assignedTo,
      r.resolution_summary AS resolutionSummary,
      r.customer_rating AS customerRating,
      r.created_at AS createdAt,
      r.updated_at AS updatedAt,
      r.resolved_at AS resolvedAt,
      r.closed_at AS closedAt
     FROM after_sales_requests r
     JOIN orders o ON r.order_id = o.id
     LEFT JOIN order_items oi ON r.order_item_id = oi.id
     ${whereClause}
     ORDER BY 
       CASE r.priority 
         WHEN 'urgent' THEN 1 
         WHEN 'high' THEN 2 
         WHEN 'medium' THEN 3 
         WHEN 'low' THEN 4 
       END ASC,
       r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...queryParams, l, offset]
  );

  return {
    requests: rows,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
    },
  };
}

/**
 * Quản trị viên xem chi tiết phiếu yêu cầu kèm toàn bộ trao đổi (bao gồm cả ghi chú nội bộ).
 * 
 * @param {string} ticketCode
 * @returns {Promise<object>}
 */
export async function getAdminCareRequestByCode(ticketCode) {
  const [requests] = await pool.query(
    `SELECT 
      r.id,
      r.ticket_code AS ticketCode,
      r.user_id AS userId,
      r.order_id AS orderId,
      o.order_code AS orderCode,
      o.customer_name AS customerName,
      o.customer_email AS customerEmail,
      o.customer_phone AS orderPhone,
      o.created_at AS orderCreatedAt,
      r.order_item_id AS orderItemId,
      oi.product_name AS productName,
      r.request_type AS requestType,
      r.priority,
      r.status,
      r.title,
      r.description,
      r.contact_phone AS contactPhone,
      r.assigned_to AS assignedTo,
      r.resolution_summary AS resolutionSummary,
      r.customer_rating AS customerRating,
      r.customer_feedback AS customerFeedback,
      r.created_at AS createdAt,
      r.updated_at AS updatedAt,
      r.resolved_at AS resolvedAt,
      r.closed_at AS closedAt
     FROM after_sales_requests r
     JOIN orders o ON r.order_id = o.id
     LEFT JOIN order_items oi ON r.order_item_id = oi.id
     WHERE r.ticket_code = ?
     LIMIT 1`,
    [ticketCode]
  );

  if (!requests || requests.length === 0) {
    const error = new Error('Không tìm thấy phiếu yêu cầu.');
    error.statusCode = error.status = 404;
    throw error;
  }

  const ticket = requests[0];

  const [events] = await pool.query(
    `SELECT 
      id,
      actor_type AS actorType,
      actor_id AS actorId,
      event_type AS eventType,
      content,
      is_internal_only AS isInternalOnly,
      created_at AS createdAt
     FROM after_sales_events
     WHERE request_id = ?
     ORDER BY created_at ASC`,
    [ticket.id]
  );

  return {
    ...ticket,
    events,
  };
}

/**
 * Quản trị viên cập nhật trạng thái phiếu yêu cầu theo state machine và ghi nhật ký trao đổi.
 * 
 * @param {string} ticketCode
 * @param {object} params
 * @param {string} params.nextStatus
 * @param {string} params.adminId
 * @param {string} [params.assignedTo]
 * @param {string} [params.resolutionSummary]
 * @param {string} [params.note]
 * @param {boolean} [params.isInternalOnly=false]
 * @returns {Promise<object>}
 */
export async function updateAdminCareStatus(ticketCode, {
  nextStatus,
  adminId,
  assignedTo,
  resolutionSummary,
  note,
  isInternalOnly = false,
}) {
  const [requests] = await pool.query(
    `SELECT id, user_id, status, assigned_to FROM after_sales_requests WHERE ticket_code = ? LIMIT 1`,
    [ticketCode]
  );

  if (!requests || requests.length === 0) {
    const error = new Error('Không tìm thấy phiếu yêu cầu.');
    error.statusCode = error.status = 404;
    throw error;
  }

  const ticket = requests[0];
  const currentStatus = ticket.status;

  // 1. Kiểm tra State Machine
  if (nextStatus && nextStatus !== currentStatus) {
    const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(nextStatus)) {
      const error = new Error(
        `Chuyển đổi trạng thái không hợp lệ từ '${currentStatus}' sang '${nextStatus}'. Các trạng thái cho phép: [${allowedNext.join(', ')}]`
      );
      error.statusCode = error.status = 400;
      throw error;
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const targetStatus = nextStatus || currentStatus;
    const targetAssigned = assignedTo !== undefined ? assignedTo : ticket.assigned_to;

    let resolvedAtSql = '';
    let closedAtSql = '';
    const updateParams = [targetStatus, targetAssigned];

    if (targetStatus === 'resolved') {
      resolvedAtSql = ', resolved_at = NOW()';
    }
    if (targetStatus === 'closed') {
      closedAtSql = ', closed_at = NOW()';
    }

    let summarySql = '';
    if (resolutionSummary) {
      summarySql = ', resolution_summary = ?';
      updateParams.push(resolutionSummary.trim());
    }

    updateParams.push(ticket.id);

    await conn.query(
      `UPDATE after_sales_requests 
       SET status = ?, assigned_to = ? ${resolvedAtSql} ${closedAtSql} ${summarySql}, updated_at = NOW()
       WHERE id = ?`,
      updateParams
    );

    // Ghi sự kiện thay đổi trạng thái nếu có
    if (nextStatus && nextStatus !== currentStatus) {
      await conn.query(
        `INSERT INTO after_sales_events 
         (request_id, actor_type, actor_id, event_type, content, is_internal_only)
         VALUES (?, 'admin', ?, 'status_change', ?, 0)`,
        [ticket.id, adminId || 'admin', `Trạng thái phiếu đã chuyển sang: ${nextStatus}`]
      );
    }

    // Ghi tin nhắn / ghi chú đi kèm nếu có
    if (note && note.trim()) {
      const eventType = isInternalOnly ? 'internal_note' : 'admin_reply';
      await conn.query(
        `INSERT INTO after_sales_events 
         (request_id, actor_type, actor_id, event_type, content, is_internal_only)
         VALUES (?, 'admin', ?, ?, ?, ?)`,
        [ticket.id, adminId || 'admin', eventType, note.trim(), isInternalOnly ? 1 : 0]
      );
    }

    await conn.commit();

    // Trigger non-blocking event-driven notification (Prompt 06)
    triggerCareRequestUpdated(
      { id: ticket.id, user_id: ticket.user_id, ticket_code: ticketCode, status: targetStatus },
      targetStatus
    ).catch(() => {});

    return {
      success: true,
      ticketCode,
      status: targetStatus,
      message: 'Cập nhật phiếu hỗ trợ thành công.',
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Thêm ghi chú nội bộ hoặc phản hồi riêng biệt từ Admin.
 * 
 * @param {string} ticketCode
 * @param {object} params
 * @param {string} params.adminId
 * @param {string} params.content
 * @param {boolean} [params.isInternalOnly=true]
 * @returns {Promise<object>}
 */
export async function addAdminCareEvent(ticketCode, {
  adminId,
  content,
  isInternalOnly = true,
}) {
  if (!content || !content.trim()) {
    const error = new Error('Nội dung không được để trống.');
    error.statusCode = error.status = 400;
    throw error;
  }

  const [requests] = await pool.query(
    `SELECT id FROM after_sales_requests WHERE ticket_code = ? LIMIT 1`,
    [ticketCode]
  );

  if (!requests || requests.length === 0) {
    const error = new Error('Không tìm thấy phiếu yêu cầu.');
    error.statusCode = error.status = 404;
    throw error;
  }

  const ticketId = requests[0].id;
  const eventType = isInternalOnly ? 'internal_note' : 'admin_reply';

  await pool.query(
    `INSERT INTO after_sales_events 
     (request_id, actor_type, actor_id, event_type, content, is_internal_only)
     VALUES (?, 'admin', ?, ?, ?, ?)`,
    [ticketId, adminId || 'admin', eventType, content.trim(), isInternalOnly ? 1 : 0]
  );

  return { success: true, message: 'Đã lưu phản hồi thành công.' };
}

/**
 * Admin xác nhận thông tin giao hàng thực tế (Delivery Confirmation).
 * DEC-DEL-001 & DEC-DEL-002: Bắt đầu kích hoạt thời hạn bảo hành.
 * 
 * @param {object} params
 * @param {number|string} params.orderIdOrCode
 * @param {string} [params.carrierName='Lumina Express Delivery']
 * @param {string} [params.trackingCode]
 * @param {string|Date} [params.deliveredAt]
 * @param {string} params.adminId
 * @param {string} [params.proofNote]
 * @returns {Promise<object>}
 */
export async function confirmAdminOrderDelivery({
  orderIdOrCode,
  carrierName = 'Lumina Express Delivery',
  trackingCode = null,
  deliveredAt = null,
  adminId = 'admin',
  proofNote = null,
}) {
  const [orders] = await pool.query(
    `SELECT id, order_code, status FROM orders WHERE (id = ? OR order_code = ?) LIMIT 1`,
    [orderIdOrCode, orderIdOrCode]
  );

  if (!orders || orders.length === 0) {
    const error = new Error('Không tìm thấy đơn hàng.');
    error.statusCode = error.status = 404;
    throw error;
  }

  const order = orders[0];
  const actualDeliveredAt = deliveredAt ? new Date(deliveredAt) : new Date();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Lưu vào order_delivery_events
    await conn.query(
      `INSERT INTO order_delivery_events 
       (order_id, carrier_name, tracking_code, delivered_at, confirmed_by, confirmed_by_id, proof_note)
       VALUES (?, ?, ?, ?, 'admin', ?, ?)`,
      [
        order.id,
        carrierName.trim(),
        trackingCode ? trackingCode.trim() : null,
        actualDeliveredAt,
        adminId,
        proofNote ? proofNote.trim() : 'Quản trị viên cập nhật ngày giao hàng xác minh',
      ]
    );

    // 2. Cập nhật trạng thái đơn hàng nếu đơn đang chưa giao
    if (order.status !== 'completed' && order.status !== 'cancelled') {
      await conn.query(
        `UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = ?`,
        [order.id]
      );
    }

    await conn.commit();

    // Trigger non-blocking delivery verified notification (Prompt 06)
    triggerDeliveryVerified(order, carrierName).catch(() => {});

    return {
      success: true,
      orderCode: order.order_code,
      deliveredAt: actualDeliveredAt,
      message: 'Đã xác nhận giao hàng và kích hoạt đồng hồ bảo hành thành công.',
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Khách hàng bấm nút "Đã nhận hàng an toàn" trên My Lumina Portal.
 * DEC-DEL-001: Kênh xác nhận 2 chiều.
 * 
 * @param {string} userId
 * @param {number|string} orderIdOrCode
 * @param {string} [note='']
 * @returns {Promise<object>}
 */
export async function confirmCustomerReceipt(userId, orderIdOrCode, note = '') {
  if (!userId) {
    const error = new Error('Yêu cầu đăng nhập.');
    error.statusCode = error.status = 401;
    throw error;
  }

  const [orders] = await pool.query(
    `SELECT id, order_code, user_id, status FROM orders WHERE (id = ? OR order_code = ?) LIMIT 1`,
    [orderIdOrCode, orderIdOrCode]
  );

  if (!orders || orders.length === 0) {
    const error = new Error('Không tìm thấy đơn hàng.');
    error.statusCode = error.status = 404;
    throw error;
  }

  const order = orders[0];
  if (order.user_id !== userId) {
    const error = new Error('Bạn không có quyền xác nhận đơn hàng của người khác.');
    error.statusCode = error.status = 403;
    throw error;
  }

  const deliveredAt = new Date();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO order_delivery_events 
       (order_id, carrier_name, tracking_code, delivered_at, confirmed_by, confirmed_by_id, proof_note)
       VALUES (?, 'Lumina Standard Courier', NULL, ?, 'customer', ?, ?)`,
      [
        order.id,
        deliveredAt,
        userId,
        note ? note.trim() : 'Khách hàng chủ động bấm "Đã nhận hàng an toàn" trên My Lumina',
      ]
    );

    if (order.status !== 'completed' && order.status !== 'cancelled') {
      await conn.query(
        `UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = ?`,
        [order.id]
      );
    }

    await conn.commit();

    // Trigger non-blocking delivery verified notification (Prompt 06)
    triggerDeliveryVerified(order, 'Lumina Standard Courier').catch(() => {});

    return {
      success: true,
      orderCode: order.order_code,
      message: 'Cảm ơn quý khách đã xác nhận nhận hàng an toàn. Quyền lợi bảo hành đã được kích hoạt!',
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Kiểm tra trạng thái và thời hạn bảo hành thực tế của một đơn hàng / sản phẩm.
 * 
 * @param {number|string} orderIdOrCode
 * @param {number|null} [orderItemId=null]
 * @returns {Promise<object>}
 */
export async function checkWarrantyCoverage(orderIdOrCode, orderItemId = null) {
  const [orders] = await pool.query(
    `SELECT id, order_code, created_at, status FROM orders WHERE (id = ? OR order_code = ?) LIMIT 1`,
    [orderIdOrCode, orderIdOrCode]
  );

  if (!orders || orders.length === 0) {
    return { isDelivered: false, isCovered: false, reason: 'Đơn hàng không tồn tại' };
  }

  const order = orders[0];

  // Lấy sự kiện giao hàng mới nhất
  const [deliveries] = await pool.query(
    `SELECT delivered_at, carrier_name, tracking_code, confirmed_by 
     FROM order_delivery_events 
     WHERE order_id = ? 
     ORDER BY delivered_at DESC LIMIT 1`,
    [order.id]
  );

  const carePolicy = await getSystemConfig('care', 'care_policy') || {
    frame_warranty_months: 12,
    lens_coating_warranty_months: 6,
    deep_cleaning_months: 24,
  };

  if (!deliveries || deliveries.length === 0) {
    return {
      isDelivered: false,
      isCovered: false,
      reason: 'Đơn hàng chưa có dữ liệu giao hàng xác minh; quyền bảo hành sẽ kích hoạt ngay khi nhận hàng.',
      orderCode: order.order_code,
    };
  }

  const delivery = deliveries[0];
  const deliveredDate = new Date(delivery.delivered_at);
  const now = new Date();

  // Tính thời gian bảo hành gọng kính (12 tháng)
  const frameWarrantyEnd = new Date(deliveredDate);
  frameWarrantyEnd.setMonth(frameWarrantyEnd.getMonth() + (carePolicy.frame_warranty_months || 12));

  // Tính thời gian bảo hành lớp phủ tròng kính (6 tháng)
  const lensWarrantyEnd = new Date(deliveredDate);
  lensWarrantyEnd.setMonth(lensWarrantyEnd.getMonth() + (carePolicy.lens_coating_warranty_months || 6));

  // Tính thời gian bảo dưỡng ve mũi và vệ sinh (24 tháng)
  const maintenanceEnd = new Date(deliveredDate);
  maintenanceEnd.setMonth(maintenanceEnd.getMonth() + (carePolicy.deep_cleaning_months || 24));

  const isFrameCovered = now <= frameWarrantyEnd;
  const isLensCovered = now <= lensWarrantyEnd;
  const isMaintenanceCovered = now <= maintenanceEnd;

  return {
    isDelivered: true,
    deliveredAt: delivery.delivered_at,
    confirmedBy: delivery.confirmed_by,
    frameWarranty: {
      isCovered: isFrameCovered,
      durationMonths: carePolicy.frame_warranty_months || 12,
      startDate: delivery.delivered_at,
      endDate: frameWarrantyEnd.toISOString(),
      daysRemaining: Math.max(0, Math.ceil((frameWarrantyEnd - now) / (1000 * 60 * 60 * 24))),
    },
    lensWarranty: {
      isCovered: isLensCovered,
      durationMonths: carePolicy.lens_coating_warranty_months || 6,
      startDate: delivery.delivered_at,
      endDate: lensWarrantyEnd.toISOString(),
      daysRemaining: Math.max(0, Math.ceil((lensWarrantyEnd - now) / (1000 * 60 * 60 * 24))),
    },
    maintenanceService: {
      isCovered: isMaintenanceCovered,
      durationMonths: carePolicy.deep_cleaning_months || 24,
      startDate: delivery.delivered_at,
      endDate: maintenanceEnd.toISOString(),
      daysRemaining: Math.max(0, Math.ceil((maintenanceEnd - now) / (1000 * 60 * 60 * 24))),
    },
  };
}

export default {
  VALID_STATUS_TRANSITIONS,
  VALID_REQUEST_TYPES,
  createCareRequest,
  getCustomerCareRequests,
  getCustomerCareRequestByCode,
  addCustomerMessage,
  rateCareRequest,
  getAdminCareRequests,
  getAdminCareRequestByCode,
  updateAdminCareStatus,
  addAdminCareEvent,
  confirmAdminOrderDelivery,
  confirmCustomerReceipt,
  checkWarrantyCoverage,
};
