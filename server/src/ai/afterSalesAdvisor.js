/**
 * Lumina Eyewear — After-Sales Concierge Advisor (Prompt 07)
 * 
 * Bộ xử lý nghiệp vụ tư vấn & chăm sóc sau mua hàng cho Lumina AI Concierge:
 * 1. handleAfterSalesCare — Hướng dẫn tạo phiếu Lumina Care & tra cứu phiếu bảo hành.
 * 2. handleAfterSalesLoyalty — Giải thích điểm tích lũy, hạng thành viên & lịch sử đổi điểm.
 * 3. handleReviewAndReferralGuidance — Hướng dẫn đánh giá xác thực & chương trình giới thiệu bạn bè.
 * 4. handlePurchasedDesignInquiry — Tra cứu và giải thích chi tiết thiết kế 3D Bespoke đã đặt.
 * 5. handleHumanHandover — Chuyển tiếp tới chuyên viên CSKH khi cần quyết định của nhân sự.
 * 6. handleEyewearCareTips — Hướng dẫn bảo quản kính mắt theo chính sách đã được phê duyệt.
 */

import {
  getMyOrders,
  getMyOrderDetails,
  getMyAfterSalesRequests,
  getApprovedCarePolicy,
  getMyLoyaltySummary,
  getMyLoyaltyTransactions,
  getMyPurchasedDesigns,
  createAfterSalesDraft,
} from './afterSalesTools.js';

/**
 * Xử lý yêu cầu về Lumina Care & Bảo hành sau mua.
 */
export async function handleAfterSalesCare({ user, extractedEntities, content }) {
  const ticketCode = extractedEntities?.ticketCode || null;
  const orderCode = extractedEntities?.orderCode || null;
  const isDraftRequest = content.toLowerCase().includes('tạo phiếu') ||
                         content.toLowerCase().includes('tạo yêu cầu') ||
                         content.toLowerCase().includes('gửi yêu cầu');

  // 1. Trường hợp Guest (Chưa đăng nhập)
  if (!user) {
    const policyData = await getApprovedCarePolicy();
    const p = policyData.policy;

    return {
      content: `Dạ, để bảo vệ quyền riêng tư và tra cứu chính xác phiếu hỗ trợ hoặc tạo yêu cầu **Lumina Care**, quý khách vui lòng đăng nhập tài khoản mua hàng.\n\n` +
        `✦ **Chính sách Lumina Care đã được duyệt chính thức**:\n` +
        `  • **Bảo hành gọng kính**: ${p.frameWarrantyMonths} tháng đối với lỗi kỹ thuật và vật liệu.\n` +
        `  • **Bảo hành lớp phủ tròng**: ${p.lensCoatingWarrantyMonths} tháng cho tính năng chống chói, chống trầy xước.\n` +
        `  • **Đặc quyền bảo dưỡng**: ${p.deepCleaningMonths} tháng vệ sinh siêu âm và cân chỉnh ve mũi miễn phí.\n` +
        `  • **Đổi trả Catalog**: ${p.catalogReturnDays} ngày đối với sản phẩm nguyên vẹn tem niêm phong Atelier.\n` +
        `  • **Kính 3D Bespoke**: ${p.bespokePolicy}\n\n` +
        `*Quý khách có thể đăng nhập để kiểm tra phiếu đã gửi hoặc tạo yêu cầu mới.*`,
      messageType: 'auth_required',
      metadata: {
        pageLink: '/login',
        quickActions: ['Đăng nhập tài khoản', 'Chính sách bảo hành', 'Bảo quản kính', 'Hotline 1900-LUMINA'],
      },
    };
  }

  // 2. Tra cứu mã phiếu cụ thể (CARE-...)
  if (ticketCode) {
    const result = await getMyAfterSalesRequests({ user, ticketCode });
    if (!result.success) {
      return {
        content: result.message,
        messageType: 'care_ticket_status',
        metadata: {
          ticketCode,
          status: result.code,
          quickActions: ['Tất cả phiếu của tôi', 'Tạo yêu cầu mới', 'Hotline 1900-LUMINA'],
        },
      };
    }

    const t = result.ticket;
    return {
      content: `Thông tin phiếu chăm sóc **${t.ticketCode}** của quý khách:\n\n` +
        `✦ **Mã đơn hàng liên kết**: [${t.orderCode}](/orders)\n` +
        `✦ **Loại yêu cầu**: ${t.requestTypeLabel}\n` +
        `✦ **Trạng thái xử lý**: **${t.statusLabel}**\n` +
        `✦ **Tiêu đề**: ${t.title}\n` +
        `✦ **Nội dung mô tả**: ${t.description}\n` +
        `✦ **Phụ trách**: ${t.assignedTo}\n` +
        (t.resolutionNote ? `✦ **Ghi chú xử lý từ Lumina**: ${t.resolutionNote}\n` : '') +
        `\n*Chuyên viên kỹ thuật Lumina sẽ liên hệ và cập nhật tiến độ trực tiếp trên hệ thống.*`,
      messageType: 'care_ticket_status',
      metadata: {
        ticket: t,
        pageLink: `/account?tab=care&ticket=${encodeURIComponent(t.ticketCode)}`,
        quickActions: ['Xem trên trang Lumina Care', 'Tạo phiếu mới', 'Liên hệ chuyên viên'],
      },
    };
  }

  // 3. Khách muốn tạo phiếu mới / tạo bản nháp
  if (isDraftRequest && orderCode) {
    const draftRes = await createAfterSalesDraft({
      user,
      orderCode,
      requestType: extractedEntities?.requestType || 'warranty_claim',
      title: 'Yêu cầu kiểm tra & bảo hành kính',
      description: 'Khách hàng gửi yêu cầu hỗ trợ sau mua qua trợ lý Lumina Concierge.',
      contactPhone: user.phone || '',
    });

    if (draftRes.success) {
      const d = draftRes.draft;
      return {
        content: `Dạ, tôi đã soạn sẵn **bản xem trước yêu cầu Lumina Care** cho đơn hàng **${d.orderCode}**:\n\n` +
          `✦ **Khách hàng**: ${d.customerName}\n` +
          `✦ **Loại hỗ trợ**: ${d.requestTypeLabel}\n` +
          `✦ **Tiêu đề dự kiến**: ${d.title}\n` +
          `✦ **Đơn hàng**: [${d.orderCode}](/orders)\n\n` +
          `⚠️ *Để đảm bảo tính xác thực, AI không tự ý gửi phiếu vào hệ thống. Quý khách vui lòng bấm nút xác nhận bên dưới để hoàn tất việc gửi phiếu tới bộ phận kỹ thuật.*`,
        messageType: 'care_draft_preview',
        metadata: {
          draft: d,
          pageLink: d.submissionUrl,
          requiresConfirmation: true,
          actionButton: {
            label: 'Xác nhận gửi phiếu Lumina Care',
            url: d.submissionUrl,
          },
          quickActions: ['Xác nhận gửi phiếu', 'Chỉnh sửa nội dung', 'Kiểm tra đơn hàng'],
        },
      };
    }
  }

  // 4. Danh sách các phiếu hiện tại của khách
  const listRes = await getMyAfterSalesRequests({ user });
  if (listRes.success && listRes.tickets?.length > 0) {
    const ticketItems = listRes.tickets.slice(0, 3).map((t) =>
      `✦ **${t.ticketCode}** — ${t.requestTypeLabel} (Đơn [${t.orderCode}](/orders))\n` +
      `  • Trạng thái: **${t.statusLabel}** | Tạo ngày: ${new Date(t.createdAt).toLocaleDateString('vi-VN')}`
    ).join('\n\n');

    return {
      content: `Dạ chào quý khách! Dưới đây là các phiếu hỗ trợ **Lumina Care** gần nhất của bạn:\n\n${ticketItems}\n\n` +
        `Quý khách có thể bấm vào [**Trang Lumina Care**](/account?tab=care) để theo dõi tiến trình chi tiết hoặc trao đổi thêm với kỹ thuật viên.`,
      messageType: 'care_tickets_list',
      metadata: {
        totalTickets: listRes.totalTickets,
        tickets: listRes.tickets,
        pageLink: '/account?tab=care',
        quickActions: ['Tạo yêu cầu hỗ trợ mới', 'Theo dõi đơn hàng', 'Bảo quản kính'],
      },
    };
  }

  // 5. Hướng dẫn cách tạo phiếu khi chưa có ticket nào
  return {
    content: `Chào quý khách! Để gửi yêu cầu hỗ trợ sau mua (Bảo hành khung gọng, căn chỉnh ve mũi, vệ sinh siêu âm hoặc đổi trả), quý khách thực hiện theo các bước sau:\n\n` +
      `✦ **Bước 1**: Truy cập mục [**Lumina Care trong Tài khoản**](/account?tab=care) hoặc vào trang [**Đơn hàng của tôi**](/orders).\n` +
      `✦ **Bước 2**: Chọn đơn hàng cần hỗ trợ và chọn dịch vụ tương ứng:\n` +
      `  • *Bảo hành / Kiểm tra lỗi sản phẩm* (12 tháng khung gọng, 6 tháng tròng kính).\n` +
      `  • *Cân chỉnh độ vừa vặn / ve mũi gọng kính* (Miễn phí 24 tháng).\n` +
      `  • *Vệ sinh sóng siêu âm & bảo dưỡng định kỳ* (Miễn phí 24 tháng).\n` +
      `  • *Đổi trả kính Catalog* (Trong 7 ngày theo chính sách).\n` +
      `✦ **Bước 3**: Mô tả tình trạng và đính kèm ảnh (nếu có) → Bấm gửi phiếu.\n\n` +
      `Chuyên viên Lumina sẽ tiếp nhận và phản hồi trong vòng 24 giờ làm việc.`,
    messageType: 'care_guidance',
    metadata: {
      pageLink: '/account?tab=care',
      quickActions: ['Đến trang Lumina Care', 'Theo dõi đơn', 'Bảo quản kính'],
    },
  };
}

/**
 * Xử lý tư vấn điểm thưởng & Loyalty.
 */
export async function handleAfterSalesLoyalty({ user }) {
  if (!user) {
    return {
      content: `Chương trình hội viên **Lumina Membership** trân trọng tri ân khách hàng thân thiết:\n\n` +
        `✦ **Cơ chế tích điểm**: Mỗi **100.000đ** chi tiêu hợp lệ nhận **1 điểm** (tương đương 1% giá trị đơn hàng sau giảm giá).\n` +
        `✦ **Quy đổi đổi thưởng**: **1 điểm = 1.000đ**, trừ trực tiếp vào đơn hàng mới (tối đa 20% giá trị sản phẩm đủ điều kiện).\n` +
        `✦ **Phân hạng đặc quyền**:\n` +
        `  • **Member**: 0 – 49 điểm (Đặc quyền chào mừng).\n` +
        `  • **Silver**: 50 – 199 điểm (Ưu tiên lịch vệ sinh sóng siêu âm).\n` +
        `  • **Gold**: 200 – 499 điểm (Quà sinh nhật & đặc quyền Atelier).\n` +
        `  • **Diamond**: Từ 500 điểm (Chuyên gia phong cách riêng & miễn phí tùy biến Bespoke).\n\n` +
        `*Quý khách vui lòng đăng nhập tài khoản để tra cứu số dư điểm và lịch sử tích lũy của mình.*`,
      messageType: 'auth_required',
      metadata: {
        pageLink: '/login',
        quickActions: ['Đăng nhập tài khoản', 'Xem quyền lợi hạng', 'Bộ sưu tập mới'],
      },
    };
  }

  const summaryRes = await getMyLoyaltySummary({ user });
  if (!summaryRes.success) {
    return {
      content: summaryRes.message,
      messageType: 'loyalty_error',
      metadata: {
        pageLink: '/account?tab=loyalty',
        quickActions: ['Thử lại', 'Xem đơn hàng', 'Bảo quản kính'],
      },
    };
  }

  const { loyalty } = summaryRes;
  const transRes = await getMyLoyaltyTransactions({ user, limit: 3 });

  let transText = '';
  if (transRes.success && transRes.transactions?.length > 0) {
    transText = `\n\n✦ **Lịch sử giao dịch gần nhất**:\n` +
      transRes.transactions.map((t) =>
        `  • **${t.pointsDeltaFormatted}** (${t.typeLabel}) — Mã GD: \`${t.code}\` ngày ${new Date(t.createdAt).toLocaleDateString('vi-VN')}`
      ).join('\n');
  }

  const nextTierDesc = loyalty.nextTier
    ? `Cần thêm **${loyalty.nextTierPointsNeeded} điểm** nữa để thăng hạng **${loyalty.nextTier.label}**.`
    : `Quý khách đang sở hữu hạng thẻ cao quý nhất tại Lumina Atelier!`;

  return {
    content: `Chào quý khách ${user.name || ''}! Thông tin tài khoản **Lumina Membership** của bạn:\n\n` +
      `✦ **Số dư khả dụng**: **${loyalty.pointsBalanceFormatted}** (Quy đổi tương đương: **${loyalty.redemptionValueFormatted}**)\n` +
      `✦ **Hạng thành viên hiện tại**: **${loyalty.tierName}**\n` +
      `✦ **Tiến độ nâng hạng**: ${nextTierDesc}\n` +
      `✦ **Tổng điểm đã tích lũy**: ${loyalty.totalEarned.toLocaleString('vi-VN')} điểm` +
      transText +
      `\n\nQuý khách có thể đổi điểm trực tiếp tại bước [**Thanh toán giỏ hàng**](/cart) hoặc xem chi tiết tại [**Trang Thành Viên**](/account?tab=loyalty).`,
    messageType: 'loyalty_summary',
    metadata: {
      loyalty,
      pageLink: '/account?tab=loyalty',
      quickActions: ['Trang thành viên', 'Theo dõi đơn', 'Bảo quản kính', 'Khám phá 3D Atelier'],
    },
  };
}

/**
 * Hướng dẫn viết đánh giá (Review) và giới thiệu bạn bè (Referral).
 */
export async function handleReviewAndReferralGuidance({ user, content }) {
  const isReferral = content.toLowerCase().includes('giới thiệu') ||
                     content.toLowerCase().includes('referral') ||
                     content.toLowerCase().includes('mã mời') ||
                     content.toLowerCase().includes('bạn bè');

  if (isReferral) {
    return {
      content: `Chương trình **Lumina Atelier Referral — Chia sẻ phong cách, nhân đôi đặc quyền**:\n\n` +
        `✦ **Cơ chế hoạt động**:\n` +
        `  • Mỗi hội viên Lumina sở hữu một **Mã giới thiệu độc quyền** và đường link chia sẻ cá nhân.\n` +
        `  • Bạn bè được giới thiệu sẽ nhận ưu đãi chào mừng đặc biệt khi mua đơn hàng đầu tiên.\n` +
        `  • Người giới thiệu nhận phần thưởng điểm Loyalty ngay sau khi đơn hàng của bạn bè hoàn tất giao nhận xác minh (không hoàn trả trong 7 ngày).\n` +
        `✦ **Chống gian lận**: Hệ thống tự động kiểm soát tài khoản lặp và đơn hàng ảo để bảo vệ quyền lợi cộng đồng hội viên.\n\n` +
        `Quý khách có thể lấy mã và theo dõi danh sách bạn bè đã giới thiệu tại [**Trang Giới Thiệu Bạn Bè**](/account?tab=referral).`,
      messageType: 'referral_guidance',
      metadata: {
        pageLink: '/account?tab=referral',
        quickActions: ['Lấy mã giới thiệu', 'Điểm thành viên', 'Xem sản phẩm'],
      },
    };
  }

  // Mặc định: Hướng dẫn viết đánh giá sản phẩm (Product Review)
  return {
    content: `Chính sách **Đánh giá sản phẩm đã mua tại Lumina Eyewear**:\n\n` +
      `✦ **Đánh giá từ người mua thực tế**: Chỉ những khách hàng đã đặt mua và nhận sản phẩm thành công mới có nhãn chứng nhận **"Đã mua hàng"** trên đánh giá.\n` +
      `✦ **Minh bạch & khách quan**: Lumina tôn trọng mọi trải nghiệm chân thực từ quý khách. Đánh giá hợp lệ đều được ghi nhận công tâm bất kể xếp hạng số sao.\n` +
      `✦ **Cách thức thực hiện**:\n` +
      `  • **Cách 1**: Truy cập mục [**Lịch sử đơn hàng**](/orders) → Chọn đơn đã nhận → Bấm **"Đánh giá sản phẩm"**.\n` +
      `  • **Cách 2**: Truy cập trực tiếp trang chi tiết sản phẩm trên [**Catalog**](/catalog) → Cuộn xuống mục Đánh giá → Viết cảm nhận.\n\n` +
      `Ý kiến đóng góp quý báu của quý khách giúp nghệ nhân Lumina không ngừng hoàn thiện từng đường nét chế tác.`,
    messageType: 'review_guidance',
    metadata: {
      pageLink: '/orders',
      quickActions: ['Xem đơn để đánh giá', 'Điểm thành viên', 'Bảo quản kính'],
    },
  };
}

/**
 * Hướng dẫn xem lại thiết kế 3D Bespoke / snapshot đã đặt.
 */
export async function handlePurchasedDesignInquiry({ user }) {
  if (!user) {
    return {
      content: `Quý khách vui lòng đăng nhập tài khoản để xem lại các bản vẽ thông số **3D Bespoke Atelier** và hình ảnh snapshot của kính mắt đã đặt chế tác.`,
      messageType: 'auth_required',
      metadata: {
        pageLink: '/login',
        quickActions: ['Đăng nhập tài khoản', 'Khám phá 3D Atelier'],
      },
    };
  }

  const designRes = await getMyPurchasedDesigns({ user });
  if (!designRes.success) {
    return {
      content: designRes.message,
      messageType: 'designs_error',
      metadata: {
        quickActions: ['Thử lại', 'Vào 3D Atelier'],
      },
    };
  }

  const { designs } = designRes;
  if (!designs || designs.length === 0) {
    return {
      content: `Dạ chào quý khách! Tài khoản của bạn hiện chưa có thiết kế kính **3D Bespoke** nào đã đặt mua.\n\n` +
        `Quý khách có thể trải nghiệm tự tay thiết kế kính mắt cá nhân hóa tại [**3D Bespoke Atelier**](/studio) — lựa chọn chất liệu Titanium, đính đá Swarovski, gắn Charm và khắc laser tên riêng trên gọng kính.`,
      messageType: 'designs_list_empty',
      metadata: {
        pageLink: '/studio',
        quickActions: ['Khám phá 3D Atelier', 'Xem Catalog', 'Bảo quản kính'],
      },
    };
  }

  const designBullets = designs.slice(0, 3).map((d) =>
    `✦ **Thiết kế thuộc đơn [${d.orderCode}](/orders)** — Sản phẩm: *${d.productName}*\n` +
    `  • Kiểu dáng: **${d.baseModel.toUpperCase()}** | Màu gọng: \`${d.frameColor}\`\n` +
    `  • Khắc laser: ${d.engravingText ? `"${d.engravingText}"` : 'Không khắc'}\n` +
    `  • Đính đá Swarovski: ${d.hasRhinestones ? 'Có đính đá' : 'Không'} | Charm: ${d.charmsCount > 0 ? `${d.charmsCount} charm` : 'Không'}\n` +
    `  • Đặt chế tác ngày: ${new Date(d.orderedAt).toLocaleDateString('vi-VN')}`
  ).join('\n\n');

  return {
    content: `Dạ, dưới đây là thông số thiết kế 3D Bespoke độc bản mà quý khách đã đặt tại Lumina Atelier:\n\n${designBullets}\n\n` +
      `Bản vẽ kỹ thuật và snapshot 3D lưu trữ trọn đời trong hồ sơ cá nhân của quý khách tại [**Quản lý thiết kế**](/account).`,
    messageType: 'purchased_designs',
    metadata: {
      totalDesigns: designs.length,
      designs,
      pageLink: '/account',
      quickActions: ['Vào 3D Atelier tạo mẫu mới', 'Theo dõi đơn', 'Bảo quản kính'],
    },
  };
}

/**
 * Xử lý chuyển tiếp nhân sự hỗ trợ (Human Handover).
 */
export async function handleHumanHandover() {
  return {
    content: `Dạ, để giải quyết các trường hợp đặc biệt cần quyết định trực tiếp từ nhân sự Lumina (như thẩm định trường hợp bảo hành ngoài phạm vi, khiếu nại tài chính hoặc tư vấn khúc xạ chuyên sâu), Lumina Concierge xin được kết nối quý khách với các kênh phục vụ riêng:\n\n` +
      `✦ **Hotline Phục vụ Trực tiếp**: **1900-LUMINA** (1900-586-462) — Hoạt động 9:00 đến 21:00 hàng ngày.\n` +
      `✦ **Email Concierge**: **concierge@lumina-eyewear.vn** — Phản hồi chính thức kèm biên bản xử lý trong 12 giờ làm việc.\n` +
      `✦ **Flagship Showroom & Private Lounge**: Số 1 Đường Nguyễn Huệ, Bến Nghé, Quận 1, TP. Hồ Chí Minh.\n` +
      `✦ **Gửi phiếu Lumina Care**: Quý khách cũng có thể gửi phiếu tại mục [**Lumina Care**](/account?tab=care) để chuyên viên kỹ thuật gọi lại hỗ trợ tận tình.`,
    messageType: 'human_handover',
    metadata: {
      pageLink: '/account?tab=care',
      contacts: {
        hotline: '1900-586-462',
        email: 'concierge@lumina-eyewear.vn',
        address: 'Số 1 Đường Nguyễn Huệ, Quận 1, TP.HCM',
      },
      quickActions: ['Tạo phiếu Lumina Care', 'Theo dõi đơn', 'Bảo quản kính', 'Chính sách bảo hành'],
    },
  };
}

/**
 * Hướng dẫn bảo quản kính mắt theo chuẩn đã duyệt.
 */
export async function handleEyewearCareTips() {
  const policyData = await getApprovedCarePolicy();
  const p = policyData.policy;

  return {
    content: `Cẩm nang **Bảo quản & Chính sách Bảo hành Lumina Eyewear** (Đã phê duyệt):\n\n` +
      `✦ **Chính sách bảo hành chính hãng**:\n` +
      `  • **Bảo hành khung gọng**: **${p.frameWarrantyMonths} tháng** đối với các lỗi vật liệu và kỹ thuật chế tác.\n` +
      `  • **Bảo hành lớp phủ tròng kính**: **${p.lensCoatingWarrantyMonths} tháng** cho tính năng chống chói, chống trầy xước.\n` +
      `  • **Đặc quyền bảo dưỡng**: Miễn phí **vệ sinh sóng siêu âm đa tầng** và **nắn chỉnh ve mũi** trong suốt **${p.deepCleaningMonths} tháng** tại tất cả Showroom.\n\n` +
      `✦ **Hướng dẫn vệ sinh & bảo quản hàng ngày**:\n` +
      `  • Luôn sử dụng khăn lau microfiber chuyên dụng đi kèm hộp Atelier. Không dùng vạt áo, khăn giấy khô tránh làm xước vi mô lớp phủ quang học.\n` +
      `  • Khi kính dính mồ hôi hoặc bụi cát: Xả nhẹ dưới vòi nước mát hoặc nước ấm pha xà phòng dịu nhẹ trước khi lau.\n` +
      `✦ **Những điều nên tránh**:\n` +
      `  • Không cài kính lên đỉnh đầu làm giãn bản lề lò xo và biến dạng gọng.\n` +
      `  • Không để kính trên táp-lô xe hơi hoặc nơi có nhiệt độ trên 60°C làm nứt lớp phủ chống phản quang (AR).\n` +
      `  • Luôn cất kính vào hộp bảo vệ Atelier khi không đeo, hướng mặt tròng lên phía trên.`,
    messageType: 'eyewear_care_tips',
    metadata: {
      pageLink: '/account?tab=care',
      quickActions: ['Đặt lịch vệ sinh siêu âm', 'Yêu cầu hỗ trợ', 'Điểm thành viên', 'Theo dõi đơn'],
    },
  };
}

