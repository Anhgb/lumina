/**
 * Lumina Eyewear — Order Advisor & Customer Care Workflow (Prompt 06)
 * 
 * Module nội bộ chịu trách nhiệm:
 * 1. Tích hợp trực tiếp với dịch vụ tra cứu đơn hàng `getOrderByCode` (từ checkout.service.js).
 * 2. Bảo vệ chống IDOR: Guest không được xem, Customer chỉ xem đơn của chính mình.
 * 3. Chuẩn hóa trạng thái đơn hàng theo MySQL Enum:
 *    'pending', 'confirmed', 'processing', 'completed', 'cancelled'.
 *    TUYỆT ĐỐI KHÔNG tự sinh ra trạng thái 'shipping'.
 * 4. Masking PII nhạy cảm (Số điện thoại, Email, Địa chỉ chi tiết).
 * 5. Tuân thủ Guardrails: AI không được tự ý sửa trạng thái đơn hàng, không tự ý xác nhận đã nhận tiền,
 *    không thực hiện hủy đơn tự động mà hướng dẫn liên hệ CSKH theo quy định.
 * 6. Xử lý lỗi ngắt kết nối Backend/Database mượt mà, không làm đứt quãng phiên chat.
 */

import { getOrderByCode } from '../services/checkout.service.js';
import { pool } from '../config/database.js';

/**
 * Danh mục trạng thái thực tế và hướng dẫn bước tiếp theo.
 * Phù hợp với schema MySQL: ENUM('pending', 'confirmed', 'processing', 'completed', 'cancelled').
 */
export const ORDER_STATUS_MAP = {
  pending: {
    status: 'pending',
    label: 'Chờ xác nhận',
    explanation: 'Đơn hàng đang chờ nhân viên Lumina Concierge kiểm tra và xác nhận thông tin đơn hàng.',
    nextStep: 'Chuyên viên CSKH Lumina sẽ liên hệ xác nhận hoặc hệ thống tự động duyệt trong vòng 15–30 phút.',
    canRequestCancel: true,
    cancelGuidance: 'Đơn hàng đang ở trạng thái Chờ xác nhận. Quý khách có thể yêu cầu hủy đơn hoặc điều chỉnh địa chỉ bằng cách liên hệ Hotline 1900-LUMINA.',
  },
  confirmed: {
    status: 'confirmed',
    label: 'Đã xác nhận',
    explanation: 'Đơn hàng đã được xác nhận thành công và thông số quang học đã được chuyển giao cho xưởng chế tác Lumina Atelier.',
    nextStep: 'Các nghệ nhân quang học bắt đầu chuẩn bị khung gọng và cắt tròng kính theo độ cận/viễn/loạn của quý khách.',
    canRequestCancel: true,
    cancelGuidance: 'Đơn hàng đã xác nhận nhưng chưa vào giai đoạn gia công tròng mắt. Quý khách có thể liên hệ ngay Hotline 1900-LUMINA để yêu cầu hủy kịp thời.',
  },
  processing: {
    status: 'processing',
    label: 'Đang chế tác',
    explanation: 'Đơn hàng đang trong quá trình gia công tinh xảo, cân chỉnh quang sai và kiểm định chất lượng tại phòng thí nghiệm Atelier.',
    nextStep: 'Sau khi kiểm định đạt chuẩn nhãn khoa (1–2 ngày làm việc), sản phẩm sẽ được đóng hộp Atelier cao cấp kèm tem niêm phong để chuyển sang đối tác vận chuyển.',
    canRequestCancel: false,
    cancelGuidance: 'Đơn hàng hiện đang trong quá trình chế tác tròng cá nhân hóa nên không thể hủy ngang. Quý khách vui lòng liên hệ hotline 1900-LUMINA để được tư vấn chính sách hỗ trợ.',
  },
  completed: {
    status: 'completed',
    label: 'Hoàn thành',
    explanation: 'Đơn hàng đã được giao thành công đến quý khách và hoàn tất toàn bộ quy trình thanh toán.',
    nextStep: 'Gói bảo hành chính hãng 12 tháng cùng đặc quyền vệ sinh sóng siêu âm trọn đời đã được kích hoạt trên hệ thống Lumina.',
    canRequestCancel: false,
    cancelGuidance: 'Đơn hàng đã hoàn tất giao hàng. Nếu sản phẩm chưa qua sử dụng và còn nguyên tem Atelier, quý khách có thể áp dụng chính sách đổi trả trong vòng 7 ngày.',
  },
  cancelled: {
    status: 'cancelled',
    label: 'Đã hủy',
    explanation: 'Đơn hàng đã được hủy trên hệ thống theo yêu cầu hoặc do không thể xác nhận thông tin thanh toán.',
    nextStep: 'Nếu quý khách đã thực hiện chuyển khoản trước, khoản tiền sẽ được hoàn trả vào tài khoản gốc trong vòng 5–7 ngày làm việc.',
    canRequestCancel: false,
    cancelGuidance: 'Đơn hàng đã hủy thành công. Quý khách có thể tạo đơn hàng mới trên website hoặc liên hệ hotline nếu cần hỗ trợ thêm.',
  },
};

/**
 * Ẩn thông tin cá nhân (PII Masking) để bảo vệ dữ liệu khách hàng.
 * @param {string} val 
 * @param {'phone'|'email'|'address'} type 
 * @returns {string}
 */
export function maskPII(val, type) {
  if (!val) return '';
  const str = String(val).trim();

  if (type === 'phone') {
    // 0987654321 -> 098***4321
    if (str.length >= 7) {
      return str.slice(0, 3) + '***' + str.slice(-4);
    }
    return str.slice(0, 2) + '***';
  }

  if (type === 'email') {
    // customer@example.com -> c***@example.com
    const parts = str.split('@');
    if (parts.length === 2) {
      const name = parts[0];
      const domain = parts[1];
      const maskedName = name.length > 2 ? name[0] + '***' + name.slice(-1) : name[0] + '***';
      return `${maskedName}@${domain}`;
    }
    return str;
  }

  if (type === 'address') {
    // Chỉ giữ lại thành phố/tỉnh nếu có, che giấu số nhà/tên đường chi tiết
    const parts = str.split(',');
    if (parts.length > 1) {
      return `Khu vực ${parts[parts.length - 1].trim()}`;
    }
    return 'Địa chỉ đã lưu bảo mật';
  }

  return str;
}

/**
 * Lấy đơn hàng an toàn qua service `getOrderByCode` kèm IDOR check.
 * 
 * @param {string} orderCode - Mã đơn (ví dụ: LUM-12345678-ABCD)
 * @param {object|null} user - Thông tin tài khoản người gửi yêu cầu
 * @returns {Promise<{ status: 'NOT_FOUND'|'AUTH_REQUIRED'|'FORBIDDEN'|'SUCCESS'|'DB_ERROR', order?: object, error?: string }>}
 */
export async function lookupOrderWithSecurity(orderCode, user) {
  // A. Nếu người dùng là Guest -> Bắt buộc yêu cầu đăng nhập
  if (!user) {
    return { status: 'AUTH_REQUIRED' };
  }

  try {
    const order = await getOrderByCode(orderCode);

    if (!order) {
      return { status: 'NOT_FOUND' };
    }

    // B. Security Check: Kiểm tra quyền sở hữu (Customer chỉ được xem đơn của mình, Admin xem tất cả)
    const isOwner = order.user_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return { status: 'FORBIDDEN' };
    }

    return {
      status: 'SUCCESS',
      order,
    };
  } catch (err) {
    console.error('[OrderAdvisor] Error during order lookup:', err.message);
    return {
      status: 'DB_ERROR',
      error: err.message,
    };
  }
}

/**
 * Định dạng phản hồi chi tiết cho khách hàng về đơn hàng.
 * 
 * @param {object} order - Bản ghi đơn hàng từ MySQL
 * @param {object} user - Thông tin người dùng
 * @returns {{ content: string, messageType: string, metadata: object }}
 */
export function formatOrderDetailsResponse(order, user) {
  const statusConfig = ORDER_STATUS_MAP[order.status] || {
    status: order.status,
    label: order.status.toUpperCase(),
    explanation: 'Đơn hàng đang được hệ thống xử lý.',
    nextStep: 'Quý khách vui lòng theo dõi cập nhật qua tin nhắn hoặc email.',
    canRequestCancel: false,
    cancelGuidance: 'Vui lòng liên hệ hotline 1900-LUMINA để biết thêm chi tiết.',
  };

  const formattedTotal = Number(order.total_amount).toLocaleString('vi-VN');
  const orderDate = new Date(order.created_at).toLocaleDateString('vi-VN');
  const maskedPhone = maskPII(order.customer_phone, 'phone');
  const city = order.shipping_city || 'Khu vực nhận hàng';

  // Thống kê sản phẩm
  let itemsSummary = '';
  if (Array.isArray(order.items) && order.items.length > 0) {
    itemsSummary = order.items.map((it) => `  • **${it.product_name}** × ${it.quantity} (${Number(it.unit_price).toLocaleString('vi-VN')}đ)`).join('\n');
  } else {
    itemsSummary = '  • Kính mắt cao cấp Lumina Atelier';
  }

  // Tình trạng thanh toán
  const paymentLabel = order.payment_status === 'paid' ? 'Đã thanh toán' : (order.payment_method === 'cod' ? 'Thanh toán COD khi nhận hàng' : 'Chờ thanh toán');

  const content = `Thông tin hành trình đơn hàng **${order.order_code}**:\n\n` +
    `✦ **Trạng thái**: **${statusConfig.label.toUpperCase()}**\n` +
    `✦ **Chi tiết trạng thái**: ${statusConfig.explanation}\n` +
    `✦ **Tiến độ tiếp theo**: ${statusConfig.nextStep}\n\n` +
    `✦ **Sản phẩm chế tác**:\n${itemsSummary}\n\n` +
    `✦ **Tổng giá trị**: **${formattedTotal}đ**\n` +
    `✦ **Thanh toán**: ${paymentLabel}\n` +
    `✦ **Người nhận**: ${order.customer_name} (SĐT: ${maskedPhone}) — Giao đến: ${city}\n` +
    `✦ **Ngày tạo**: ${orderDate}\n\n` +
    `*${statusConfig.cancelGuidance}*`;

  const quickActions = statusConfig.canRequestCancel
    ? ['Yêu cầu hỗ trợ hủy đơn', 'Chính sách bảo hành', 'Liên hệ Hotline 1900-LUMINA']
    : ['Xem sản phẩm khác', 'Chính sách đổi trả', 'Liên hệ CSKH'];

  return {
    content,
    messageType: 'order_status',
    metadata: {
      orderCode: order.order_code,
      status: order.status,
      statusLabel: statusConfig.label,
      paymentStatus: order.payment_status,
      totalAmount: order.total_amount,
      canCancel: statusConfig.canRequestCancel,
      quickActions,
    },
  };
}

/**
 * Xử lý yêu cầu hủy hoặc thay đổi đơn hàng từ khách hàng (Guardrail).
 * AI KHÔNG TỰ Ý ĐỔI DỮ LIỆU DATABASE mà chỉ hướng dẫn quy trình an toàn.
 * 
 * @param {object} options
 * @param {string} [options.orderCode]
 * @param {object} options.user
 * @returns {Promise<{ content: string, messageType: string, metadata: object }>}
 */
export async function handleCancelOrModifyRequest({ orderCode, user }) {
  if (!user) {
    return {
      content: 'Vì lý do bảo mật, quý khách vui lòng đăng nhập tài khoản Lumina để kiểm tra quyền yêu cầu thay đổi hoặc hủy đơn hàng.',
      messageType: 'auth_required',
      metadata: {
        quickActions: ['Đăng nhập tài khoản', 'Chính sách hủy đơn', 'Hotline 1900-LUMINA'],
      },
    };
  }

  if (orderCode) {
    const lookup = await lookupOrderWithSecurity(orderCode, user);
    if (lookup.status === 'SUCCESS' && lookup.order) {
      const order = lookup.order;
      const statusConfig = ORDER_STATUS_MAP[order.status];

      if (order.status === 'pending' || order.status === 'confirmed') {
        return {
          content: `Đơn hàng **${order.order_code}** hiện ở trạng thái **${statusConfig.label}** và đủ điều kiện tiếp nhận yêu cầu thay đổi hoặc hủy.\n\n` +
            `✦ **Để đảm bảo an toàn giao dịch**, hệ thống AI không tự ý thực hiện thao tác xóa hoặc hủy đơn trực tiếp trên cơ sở dữ liệu.\n` +
            `✦ Quý khách vui lòng liên hệ ngay **Hotline Concierge 1900-LUMINA** (1900-586-462) hoặc gửi email đến **concierge@lumina-eyewear.vn** kèm mã đơn **${order.order_code}**.\n\n` +
            `Đội ngũ chuyên viên sẽ hỗ trợ hủy đơn và hoàn tất thủ tục hoàn tiền (nếu có) ngay lập tức cho quý khách.`,
          messageType: 'order_cancel_guidance',
          metadata: {
            orderCode: order.order_code,
            eligible: true,
            status: order.status,
            quickActions: ['Gọi Hotline 1900-LUMINA', 'Xem lại đơn hàng', 'Chính sách đổi trả'],
          },
        };
      } else {
        return {
          content: `Rất tiếc, đơn hàng **${order.order_code}** hiện đang ở trạng thái **${statusConfig.label}**.\n\n` +
            `Theo quy định của Lumina Atelier, đơn hàng đã bước vào giai đoạn chế tác quang học cá nhân hóa hoặc đã hoàn thành nên **không thể hủy ngang** trên hệ thống.\n\n` +
            `Quý khách vui lòng liên hệ Hotline **1900-LUMINA** để được chuyên viên hướng dẫn chính sách hỗ trợ phù hợp nhất.`,
          messageType: 'order_cancel_guidance',
          metadata: {
            orderCode: order.order_code,
            eligible: false,
            status: order.status,
            quickActions: ['Liên hệ Hotline CSKH', 'Chính sách đổi trả 7 ngày', 'Xem đơn hàng'],
          },
        };
      }
    }
  }

  // Yêu cầu hủy chung chung mà chưa có mã đơn
  return {
    content: `Để kiểm tra quy định hủy hoặc thay đổi đơn hàng, quý khách vui lòng cung cấp mã đơn hàng Lumina (định dạng **LUM-XXXXXXXX-XXXX**).\n\n` +
      `✦ Các đơn hàng ở trạng thái **Chờ xác nhận (Pending)** hoặc **Đã xác nhận (Confirmed)** có thể được hỗ trợ hủy nhanh qua tổng đài.\n` +
      `✦ Đơn đang **Chế tác (Processing)** không thể hủy ngang do tròng kính đã được mài cắt riêng biệt.`,
    messageType: 'order_cancel_guidance',
    metadata: {
      quickActions: ['Tra cứu đơn gần nhất', 'Hotline 1900-LUMINA', 'Chính sách đổi trả'],
    },
  };
}

export default {
  ORDER_STATUS_MAP,
  maskPII,
  lookupOrderWithSecurity,
  formatOrderDetailsResponse,
  handleCancelOrModifyRequest,
};

