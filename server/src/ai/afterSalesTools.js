/**
 * Lumina Eyewear — After-Sales Tools Architecture (Prompt 07)
 * 
 * Cung cấp các công cụ (tools) tra cứu và hỗ trợ sau mua cho Lumina AI Concierge:
 * 1. getMyOrders — Danh sách đơn hàng của khách hàng hiện tại (chống IDOR).
 * 2. getMyOrderDetails — Chi tiết đơn hàng của khách hàng (masking PII, trạng thái thật).
 * 3. getMyAfterSalesRequests — Tra cứu phiếu bảo hành / hỗ trợ Lumina Care do khách sở hữu.
 * 4. getApprovedCarePolicy — Lấy chính sách bảo hành & chăm sóc đã được duyệt từ system_configurations.
 * 5. getMyLoyaltySummary — Tra cứu tổng quan điểm thưởng, thứ hạng và quyền lợi từ Loyalty API.
 * 6. getMyLoyaltyTransactions — Lịch sử giao dịch cộng / trừ điểm thưởng.
 * 7. getMyPurchasedDesigns — Xem lại thiết kế kính 3D Bespoke / snapshot đã đặt mua.
 * 8. createAfterSalesDraft — Tạo bản nháp phiếu hỗ trợ (yêu cầu khách xác nhận trước khi gửi).
 * 
 * NGUYÊN TẮC BẢO MẬT TUYỆT ĐỐI:
 * - AI KHÔNG truy cập SQL trực tiếp. Mọi truy vấn đi qua service layer có kiểm tra quyền.
 * - AI KHÔNG có tool để tự ý phê duyệt bảo hành, hoàn tiền, cộng điểm, đổi địa chỉ, hủy đơn hoặc sửa thanh toán.
 * - Mọi dữ liệu do người dùng nhập hoặc lấy từ DB (review, ticket, ghi chú) đều được coi là UNTRUSTED DATA.
 */

import { getCustomerOrders, getCustomerOrderByCode, getCustomerBespokeDesigns } from '../services/me.service.js';
import { getCustomerCareRequests, getCustomerCareRequestByCode, VALID_REQUEST_TYPES } from '../services/care.service.js';
import { getCustomerLoyaltyOverview, getCustomerTransactions } from '../services/loyalty.service.js';
import { getSystemConfig } from '../services/config.service.js';
import { maskPII } from './orderAdvisor.js';

/**
 * Làm sạch văn bản không đáng tin cậy (Anti-Prompt-Injection).
 * Loại bỏ các mẫu lệnh can thiệp hệ thống và bọc trong khối cách ly an toàn.
 * 
 * @param {string} text 
 * @returns {string}
 */
export function sanitizeUntrustedText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|prompts|rules)/gi, '[REDACTED_COMMAND]')
    .replace(/(?:system|developer|root)\s*:\s*/gi, '[USER_DATA]: ')
    .replace(/(?:you are now|pretend to be|act as)/gi, '[FILTERED]')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * 1. Tool: getMyOrders
 * Lấy danh sách tóm tắt các đơn hàng của khách hàng hiện tại.
 * 
 * @param {object} params
 * @param {object} params.user - User object từ req.user
 * @param {number} [params.limit=5] - Giới hạn số lượng đơn
 * @returns {Promise<object>}
 */
export async function getMyOrders({ user, limit = 5 }) {
  if (!user || !user.id) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Vì lý do bảo mật, quý khách vui lòng đăng nhập tài khoản Lumina để tra cứu danh sách đơn hàng.',
    };
  }

  try {
    const result = await getCustomerOrders(user.id, { page: 1, limit, status: 'all' });
    const orders = (result.orders || []).map((o) => ({
      orderCode: o.orderCode,
      status: o.status,
      statusLabel: o.statusLabel,
      paymentStatus: o.paymentStatus,
      paymentStatusLabel: o.paymentStatusLabel,
      totalAmount: o.totalAmount,
      totalAmountFormatted: `${o.totalAmount.toLocaleString('vi-VN')}đ`,
      itemCount: o.itemCount,
      hasBespoke: Boolean(o.hasBespoke),
      isDelivered: Boolean(o.deliveryVerifiedAt),
      deliveryVerifiedAt: o.deliveryVerifiedAt,
      createdAt: o.createdAt,
    }));

    return {
      success: true,
      totalOrders: result.pagination?.totalOrders || orders.length,
      orders,
    };
  } catch (error) {
    console.error('[AfterSalesTools:getMyOrders] Error:', error.message);
    return {
      success: false,
      code: 'DB_ERROR',
      message: 'Hệ thống tra cứu đơn hàng đang tạm thời gián đoạn. Vui lòng thử lại sau giây lát.',
    };
  }
}

/**
 * 2. Tool: getMyOrderDetails
 * Lấy chi tiết đơn hàng của khách hàng theo mã đơn hàng.
 * 
 * @param {object} params
 * @param {object} params.user - User object từ req.user
 * @param {string} params.orderCode - Mã đơn hàng (LUM-...)
 * @returns {Promise<object>}
 */
export async function getMyOrderDetails({ user, orderCode }) {
  if (!user || !user.id) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Quý khách vui lòng đăng nhập để xem thông tin chi tiết đơn hàng này.',
    };
  }

  if (!orderCode) {
    return {
      success: false,
      code: 'BAD_REQUEST',
      message: 'Quý khách vui lòng cung cấp mã đơn hàng cần kiểm tra (định dạng LUM-...).',
    };
  }

  try {
    const order = await getCustomerOrderByCode(user.id, orderCode);
    if (!order) {
      return {
        success: false,
        code: 'NOT_FOUND_OR_FORBIDDEN',
        message: `Lumina không tìm thấy đơn hàng **${orderCode}** trong tài khoản của quý khách. Vui lòng kiểm tra lại mã đơn hoặc đăng nhập tài khoản đã đặt đơn này.`,
      };
    }

    // Lọc và bảo vệ thông tin PII
    const sanitizedOrder = {
      orderCode: order.orderCode,
      status: order.status,
      statusLabel: order.statusLabel,
      paymentStatus: order.paymentStatus,
      paymentStatusLabel: order.paymentStatusLabel,
      customerName: sanitizeUntrustedText(order.customerName),
      maskedPhone: maskPII(order.customerPhone, 'phone'),
      maskedEmail: maskPII(order.customerEmail, 'email'),
      shippingCity: maskPII(order.shippingAddress, 'address'),
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      shippingFee: order.shippingFee,
      totalAmount: order.totalAmount,
      totalAmountFormatted: `${order.totalAmount.toLocaleString('vi-VN')}đ`,
      voucherCode: order.voucherCode,
      createdAt: order.createdAt,
      delivery: {
        isDelivered: Boolean(order.delivery?.isDelivered),
        verifiedAt: order.delivery?.verifiedAt,
        carrierName: order.delivery?.carrierName || 'Lumina Atelier Concierge Delivery',
        trackingNumber: order.delivery?.trackingNumber,
      },
      warranty: {
        isActivated: Boolean(order.warranty?.isActivated),
        status: order.warranty?.status,
        coverageExpiresAt: order.warranty?.coverageExpiresAt,
      },
      items: (order.items || []).map((item) => ({
        id: item.id,
        productName: sanitizeUntrustedText(item.productName),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        isBespoke: Boolean(item.isBespoke),
        hasDesignSpec: Boolean(item.designSpec),
        lensType: item.lensType,
        hasPrescription: Boolean(item.prescriptionData),
      })),
    };

    return {
      success: true,
      order: sanitizedOrder,
    };
  } catch (error) {
    if (error.statusCode === 403 || error.status === 403) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: `Đơn hàng **${orderCode}** không thuộc về tài khoản này. Vì lý do bảo mật, Lumina chỉ hiển thị đơn hàng do chính quý khách đặt.`,
      };
    }
    console.error('[AfterSalesTools:getMyOrderDetails] Error:', error.message);
    return {
      success: false,
      code: 'DB_ERROR',
      message: 'Chưa thể xác minh chi tiết đơn hàng do gián đoạn kết nối. Quý khách vui lòng thử lại sau.',
    };
  }
}

/**
 * 3. Tool: getMyAfterSalesRequests
 * Tra cứu danh sách hoặc chi tiết phiếu yêu cầu hỗ trợ / bảo hành Lumina Care.
 * 
 * @param {object} params
 * @param {object} params.user
 * @param {string} [params.ticketCode]
 * @returns {Promise<object>}
 */
export async function getMyAfterSalesRequests({ user, ticketCode = null }) {
  if (!user || !user.id) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Quý khách vui lòng đăng nhập tài khoản để kiểm tra các phiếu yêu cầu Lumina Care.',
    };
  }

  try {
    if (ticketCode) {
      const ticket = await getCustomerCareRequestByCode(user.id, ticketCode);
      if (!ticket) {
        return {
          success: false,
          code: 'NOT_FOUND',
          message: `Không tìm thấy phiếu hỗ trợ nào có mã **${ticketCode}** thuộc tài khoản của bạn.`,
        };
      }

      return {
        success: true,
        ticket: {
          ticketCode: ticket.ticketCode,
          orderCode: ticket.orderCode,
          requestType: ticket.requestType,
          requestTypeLabel: ticket.requestTypeLabel,
          status: ticket.status,
          statusLabel: ticket.statusLabel,
          title: sanitizeUntrustedText(ticket.title),
          description: sanitizeUntrustedText(ticket.description),
          assignedTo: ticket.assignedTo ? 'Chuyên viên kỹ thuật Lumina' : 'Đang điều phối',
          resolutionNote: sanitizeUntrustedText(ticket.resolutionNote),
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        },
      };
    }

    const requests = await getCustomerCareRequests(user.id);
    const tickets = (requests || []).map((t) => ({
      ticketCode: t.ticketCode,
      orderCode: t.orderCode,
      requestType: t.requestType,
      requestTypeLabel: t.requestTypeLabel,
      status: t.status,
      statusLabel: t.statusLabel,
      title: sanitizeUntrustedText(t.title),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return {
      success: true,
      totalTickets: tickets.length,
      tickets,
    };
  } catch (error) {
    if (error.statusCode === 403 || error.status === 403) {
      return {
        success: false,
        code: 'FORBIDDEN',
        message: `Phiếu yêu cầu **${ticketCode}** không thuộc quyền sở hữu của bạn.`,
      };
    }
    console.error('[AfterSalesTools:getMyAfterSalesRequests] Error:', error.message);
    return {
      success: false,
      code: 'DB_ERROR',
      message: 'Chưa thể xác minh trạng thái phiếu hỗ trợ vào lúc này.',
    };
  }
}

/**
 * 4. Tool: getApprovedCarePolicy
 * Lấy chính sách bảo hành và chăm sóc khách hàng đã được phê duyệt chính thức.
 * Không yêu cầu đăng nhập (công khai cho cả Guest và Customer).
 * 
 * @returns {Promise<object>}
 */
export async function getApprovedCarePolicy() {
  try {
    const carePolicy = await getSystemConfig('care', 'care_policy');
    const deliveryPolicy = await getSystemConfig('delivery', 'delivery_policy');

    return {
      success: true,
      policy: {
        frameWarrantyMonths: carePolicy?.frame_warranty_months || 12,
        lensCoatingWarrantyMonths: carePolicy?.lens_coating_warranty_months || 6,
        deepCleaningMonths: carePolicy?.deep_cleaning_months || 24,
        nosePadAdjustmentMonths: carePolicy?.nose_pad_adjustment_months || 24,
        catalogReturnDays: carePolicy?.catalog_return_days || 7,
        bespokePolicy: carePolicy?.bespoke_policy || 'Hỗ trợ căn chỉnh, sửa chữa lỗi kỹ thuật và xử lý sản phẩm không đúng cấu hình đã xác nhận; không hoàn tiền vì đổi ý.',
        warrantyStartBasis: deliveryPolicy?.warranty_start_basis || 'verified_delivery_date',
        cleaningServices: [
          'Vệ sinh sóng siêu âm đa tần số loại bỏ bụi bẩn vi mô trong khe kẽ gọng kính.',
          'Cân chỉnh độ cân bằng và độ ôm sát của càng kính ôm sát sống mũi.',
          'Thay mới đệm ve mũi silicon y tế cao cấp miễn phí trong 24 tháng.',
        ],
      },
    };
  } catch (error) {
    console.error('[AfterSalesTools:getApprovedCarePolicy] Error:', error.message);
    return {
      success: true,
      policy: {
        frameWarrantyMonths: 12,
        lensCoatingWarrantyMonths: 6,
        deepCleaningMonths: 24,
        nosePadAdjustmentMonths: 24,
        catalogReturnDays: 7,
        bespokePolicy: 'Hỗ trợ căn chỉnh, sửa chữa lỗi kỹ thuật và xử lý sản phẩm không đúng cấu hình đã xác nhận.',
        warrantyStartBasis: 'verified_delivery_date',
      },
    };
  }
}

/**
 * 5. Tool: getMyLoyaltySummary
 * Lấy thông tin tài khoản thành viên, điểm thưởng khả dụng và quyền lợi thứ hạng.
 * 
 * @param {object} params
 * @param {object} params.user
 * @returns {Promise<object>}
 */
export async function getMyLoyaltySummary({ user }) {
  if (!user || !user.id) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Quý khách vui lòng đăng nhập để xem điểm thưởng và quyền lợi hội viên Lumina Membership.',
    };
  }

  try {
    const overview = await getCustomerLoyaltyOverview(user.id);
    const availablePoints = overview.account?.availablePoints ?? overview.pointsBalance ?? 0;
    const tierCode = overview.tier?.code || overview.account?.currentTier || overview.tier || 'member';
    const tierName = overview.tier?.name || overview.tierName || (tierCode === 'gold' ? 'Hạng Vàng (Gold)' : 'Thành Viên Lumina');
    const totalEarned = overview.account?.lifetimePoints ?? overview.totalEarned ?? 0;
    const nextTier = overview.tier?.nextTier || overview.nextTier || null;
    const nextTierPointsNeeded = overview.tier?.nextTier?.pointsNeeded ?? overview.nextTierPointsNeeded ?? 0;

    return {
      success: true,
      loyalty: {
        pointsBalance: availablePoints,
        pointsBalanceFormatted: `${availablePoints.toLocaleString('vi-VN')} điểm`,
        redemptionValueVnd: availablePoints * 1000,
        redemptionValueFormatted: `${(availablePoints * 1000).toLocaleString('vi-VN')}đ`,
        tier: tierCode,
        tierName,
        totalEarned,
        totalRedeemed: overview.totalRedeemed || 0,
        nextTier,
        nextTierPointsNeeded,
        rules: {
          earnRate: 'Mỗi 100.000đ chi tiêu = 1 điểm (1% giá trị sản phẩm)',
          redemptionRate: '1 điểm = 1.000đ trừ trực tiếp vào đơn hàng mới',
          maxDiscountPercentage: 'Tối đa 20% giá trị sản phẩm đủ điều kiện',
        },
      },
    };
  } catch (error) {
    console.error('[AfterSalesTools:getMyLoyaltySummary] Error:', error.message);
    return {
      success: false,
      code: 'DB_ERROR',
      message: 'Chưa thể tra cứu thông tin điểm thưởng thành viên vào lúc này.',
    };
  }
}

/**
 * 6. Tool: getMyLoyaltyTransactions
 * Lấy lịch sử giao dịch điểm tích lũy / quy đổi của khách hàng.
 * 
 * @param {object} params
 * @param {object} params.user
 * @param {number} [params.limit=5]
 * @returns {Promise<object>}
 */
export async function getMyLoyaltyTransactions({ user, limit = 5 }) {
  if (!user || !user.id) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Quý khách vui lòng đăng nhập để xem lịch sử tích lũy điểm thưởng.',
    };
  }

  try {
    const result = await getCustomerTransactions(user.id, { limit, offset: 0 });
    const transactions = (result.transactions || []).map((t) => ({
      code: t.sourceReference || `TX-${t.id}`,
      type: t.type || t.transactionType,
      typeLabel: (t.type || t.transactionType) === 'earn' ? 'Cộng điểm đơn hàng' : (t.type || t.transactionType) === 'redeem' ? 'Đổi điểm thanh toán' : 'Điều chỉnh',
      pointsDelta: t.points ?? t.pointsDelta ?? 0,
      pointsDeltaFormatted: `${(t.points ?? t.pointsDelta ?? 0) > 0 ? '+' : ''}${t.points ?? t.pointsDelta ?? 0} điểm`,
      balanceAfter: t.balanceAfter,
      sourceReference: t.sourceReference,
      reason: sanitizeUntrustedText(t.reason),
      createdAt: t.createdAt,
    }));

    return {
      success: true,
      total: result.total || transactions.length,
      transactions,
    };
  } catch (error) {
    console.error('[AfterSalesTools:getMyLoyaltyTransactions] Error:', error.message);
    return {
      success: false,
      code: 'DB_ERROR',
      message: 'Chưa thể tra cứu lịch sử giao dịch điểm lúc này.',
    };
  }
}

/**
 * 7. Tool: getMyPurchasedDesigns
 * Lấy danh sách kính 3D Bespoke đã đặt mua kèm bản vẽ designSpec và snapshot.
 * 
 * @param {object} params
 * @param {object} params.user
 * @returns {Promise<object>}
 */
export async function getMyPurchasedDesigns({ user }) {
  if (!user || !user.id) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Quý khách vui lòng đăng nhập để xem lại các thiết kế 3D Bespoke đã đặt chế tác.',
    };
  }

  try {
    const designs = await getCustomerBespokeDesigns(user.id);
    const sanitizedDesigns = (designs || []).map((d) => ({
      orderItemId: d.orderItemId || d.id,
      orderCode: d.orderCode,
      productName: sanitizeUntrustedText(d.productName),
      baseModel: d.designSpec?.baseModel || d.designSpec?.model || 'Aviator',
      frameColor: d.designSpec?.frameColor || '#141413',
      lensColor: d.designSpec?.lensColor,
      lensOpacity: d.designSpec?.lensOpacity,
      engravingText: sanitizeUntrustedText(d.designSpec?.engravingText || ''),
      hasRhinestones: Boolean(d.designSpec?.hasRhinestones),
      rhinestoneStyle: d.designSpec?.rhinestones?.style,
      charmsCount: d.designSpec?.charms?.length || 0,
      customPrice: d.unitPrice || d.customPrice || 0,
      customPriceFormatted: `${(d.unitPrice || d.customPrice || 0).toLocaleString('vi-VN')}đ`,
      snapshotUrl: d.snapshotPath || d.snapshotUrl,
      orderedAt: d.orderedAt,
    }));

    return {
      success: true,
      totalDesigns: sanitizedDesigns.length,
      designs: sanitizedDesigns,
    };
  } catch (error) {
    console.error('[AfterSalesTools:getMyPurchasedDesigns] Error:', error.message);
    return {
      success: false,
      code: 'DB_ERROR',
      message: 'Chưa thể tải dữ liệu thiết kế 3D đã mua lúc này.',
    };
  }
}

/**
 * 8. Tool: createAfterSalesDraft
 * Tạo bản xem trước phiếu yêu cầu hỗ trợ (Draft Preview).
 * YÊU CẦU NGƯỜI DÙNG XÁC NHẬN TRƯỚC KHI GỬI — AI không tự ý tạo phiếu thực tế vào DB.
 * 
 * @param {object} params
 * @param {object} params.user
 * @param {string} params.orderCode
 * @param {string} params.requestType
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} [params.contactPhone]
 * @returns {Promise<object>}
 */
export async function createAfterSalesDraft({
  user,
  orderCode,
  requestType,
  title,
  description,
  contactPhone = '',
}) {
  if (!user || !user.id) {
    return {
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Quý khách vui lòng đăng nhập tài khoản để tạo phiếu yêu cầu chăm sóc Lumina Care.',
    };
  }

  if (!orderCode) {
    return {
      success: false,
      code: 'BAD_REQUEST',
      message: 'Vui lòng cung cấp mã đơn hàng liên quan đến yêu cầu hỗ trợ.',
    };
  }

  if (!requestType || !VALID_REQUEST_TYPES.includes(requestType)) {
    return {
      success: false,
      code: 'BAD_REQUEST',
      message: `Loại yêu cầu không hợp lệ. Các loại hỗ trợ gồm: Bảo hành (warranty_claim), Điều chỉnh gọng (fit_adjustment), Vệ sinh sâu (deep_cleaning), Sửa chữa (repair_service), Tư vấn (usage_consultation), Đổi trả catalog (catalog_return).`,
    };
  }

  if (!title || !title.trim()) {
    return {
      success: false,
      code: 'BAD_REQUEST',
      message: 'Vui lòng cung cấp tiêu đề vắn tắt cho yêu cầu hỗ trợ.',
    };
  }

  // Xác minh đơn hàng thuộc về user
  try {
    const order = await getCustomerOrderByCode(user.id, orderCode);
    if (!order) {
      return {
        success: false,
        code: 'ORDER_NOT_FOUND',
        message: `Đơn hàng **${orderCode}** không thuộc tài khoản của quý khách.`,
      };
    }

    const typeLabels = {
      warranty_claim: 'Bảo hành / Kiểm tra lỗi kỹ thuật',
      fit_adjustment: 'Điều chỉnh độ vừa vặn / ve mũi gọng kính',
      deep_cleaning: 'Vệ sinh siêu âm & bảo dưỡng định kỳ',
      repair_service: 'Sửa chữa phụ kiện gọng kính',
      usage_consultation: 'Tư vấn bảo quản & sử dụng kính',
      catalog_return: 'Đổi trả sản phẩm Catalog (trong 7 ngày)',
      other: 'Hỗ trợ vấn đề khác',
    };

    const draftPreview = {
      isDraft: true,
      requiresUserConfirmation: true,
      orderCode: order.orderCode,
      customerName: user.name || order.customerName,
      contactPhone: contactPhone || order.customerPhone,
      requestType,
      requestTypeLabel: typeLabels[requestType] || requestType,
      title: sanitizeUntrustedText(title),
      description: sanitizeUntrustedText(description),
      submissionUrl: `/account?tab=care&order=${encodeURIComponent(order.orderCode)}`,
      actionButtonText: 'Xác nhận gửi phiếu Lumina Care',
    };

    return {
      success: true,
      draft: draftPreview,
      message: 'Đã chuẩn bị bản nháp yêu cầu hỗ trợ. Quý khách vui lòng kiểm tra thông tin xem trước và bấm xác nhận để gửi đến chuyên viên tiếp nhận.',
    };
  } catch (error) {
    console.error('[AfterSalesTools:createAfterSalesDraft] Error:', error.message);
    return {
      success: false,
      code: 'VERIFICATION_FAILED',
      message: 'Chưa thể xác minh quyền sở hữu đơn hàng để tạo bản nháp hỗ trợ.',
    };
  }
}
