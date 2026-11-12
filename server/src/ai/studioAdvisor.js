/**
 * studioAdvisor.js — Lumina AI Studio & Try-On Context Handler
 *
 * Xử lý các tình huống đặc thù khi khách hàng đang ở:
 *   - /studio-3d: Giải thích designSpec, hướng dẫn tùy chỉnh 3D
 *   - /try-on:    Hướng dẫn camera, giải thích Face Stylist, PD
 *
 * NGUYÊN TẮC BẢO MẬT:
 *   - Không nhận ảnh camera hay landmark raw từ client.
 *   - Không tự thay đổi designSpec thay người dùng.
 *   - Không tuyên bố PD ước lượng từ webcam là số đo y khoa.
 *   - Không tự điều hướng trang khi người dùng chưa xác nhận.
 */

// ── Frame model metadata (đồng bộ với data/frameModels.js frontend) ──────────
export const FRAME_MODEL_INFO = {
  aviator: {
    name: 'Aviator (Phi công)',
    description: 'Gọng giọt nước cổ điển với cầu kép đặc trưng. Phù hợp mặt tròn, mặt oval và mặt trái tim. Chất liệu Titanium siêu nhẹ, kết cấu uốn gọng thủ công.',
    recommendedFaces: ['Mặt tròn', 'Mặt oval / Trái xoan', 'Mặt trái tim'],
  },
  'cat-eye': {
    name: 'Cat-Eye (Mắt mèo)',
    description: 'Gọng vát góc ngoài hướng lên trên, mang nét thanh lịch vintage Pháp. Phù hợp mặt tròn, mặt vuông và mặt trái tim. Chất liệu Acetate Ý cao cấp hoặc mạ vàng 18K.',
    recommendedFaces: ['Mặt tròn', 'Mặt vuông', 'Mặt trái tim'],
  },
  round: {
    name: 'Round (Gọng tròn)',
    description: 'Gọng hình tròn thuần túy, thiết kế Bauhaus tối giản. Phù hợp mặt vuông, mặt kim cương. Làm dịu đường góc cạnh quai hàm và trán rộng.',
    recommendedFaces: ['Mặt vuông', 'Mặt kim cương'],
  },
  square: {
    name: 'Square (Gọng vuông)',
    description: 'Gọng hình chữ nhật với góc cạnh rõ nét. Phong cách executive thương mại. Phù hợp mặt oval và mặt trái xoan vì tạo độ cân bằng hình khối.',
    recommendedFaces: ['Mặt oval / Trái xoan', 'Mặt dài'],
  },
};

// ── Lens opacity presets ──────────────────────────────────────────────────────
const LENS_OPACITY_PRESETS = {
  0.10: 'Rất sáng (Photochromic nhạt) — phù hợp trong nhà',
  0.25: 'Sáng vừa — phù hợp ánh sáng thường',
  0.45: 'Tiêu chuẩn (mặc định) — đa năng ngày thường',
  0.65: 'Tối vừa — phù hợp ngoài trời nhiều mây',
  0.85: 'Tối đậm — phù hợp nắng mạnh',
  0.95: 'Tối cực đại — kính mát thời trang',
};

// ── Metalness / Roughness guide ───────────────────────────────────────────────
function describeFrameSurface(metalness, roughness) {
  if (metalness > 0.8 && roughness < 0.3) return 'Bề mặt gương bóng mạ kim loại — sang trọng, ánh sáng phản chiếu mạnh';
  if (metalness > 0.6 && roughness < 0.5) return 'Bề mặt bán bóng kim loại — lịch lãm, ít phản sáng';
  if (metalness < 0.3 && roughness > 0.6) return 'Bề mặt mờ Acetate — cổ điển, chất cảm Ý';
  if (metalness < 0.3 && roughness < 0.4) return 'Bề mặt bóng Acetate — phong cách trẻ trung, năng động';
  return 'Bề mặt kết hợp Acetate + kim loại — thiết kế độc bản';
}

/**
 * Giải thích designSpec hiện tại và hướng dẫn tùy chỉnh.
 * @param {object} designSpec - Từ CustomGlassesContext (đã sanitize)
 * @param {number|null} [customPrice] - Giá tùy chỉnh tính toán từ pricingCalculator
 * @returns {string} Nội dung phản hồi AI
 */
export function explainDesignSpec(designSpec, customPrice = null) {
  if (!designSpec) {
    return 'Hiện tại chưa có thiết kế 3D nào được chọn trong Atelier. Quý khách có thể vào trang **3D Bespoke Atelier** để bắt đầu cá nhân hóa gọng kính độc bản.';
  }

  const modelInfo = FRAME_MODEL_INFO[designSpec.baseModel] || { name: designSpec.baseModel, description: '' };
  const surfaceDesc = describeFrameSurface(designSpec.metalness ?? 0.9, designSpec.roughness ?? 0.2);

  // Tìm opacity preset gần nhất
  const opacityKey = Object.keys(LENS_OPACITY_PRESETS).reduce((prev, curr) => {
    return Math.abs(parseFloat(curr) - designSpec.lensOpacity) < Math.abs(parseFloat(prev) - designSpec.lensOpacity) ? curr : prev;
  });
  const opacityLabel = LENS_OPACITY_PRESETS[opacityKey] || `${Math.round((designSpec.lensOpacity || 0.45) * 100)}% độ truyền sáng`;

  const lines = [
    `Thiết kế 3D hiện tại của quý khách tại Lumina Atelier:`,
    ``,
    `✦ **Kiểu gọng**: ${modelInfo.name}`,
    `  _${modelInfo.description}_`,
    `✦ **Màu gọng**: \`${designSpec.frameColor}\` — ${surfaceDesc}`,
    `✦ **Tròng kính**: màu \`${designSpec.lensColor}\` — ${opacityLabel}`,
  ];

  if (designSpec.hasRhinestones) {
    lines.push(`✦ **Rhinestones Swarovski**: Đã kích hoạt đính đá tinh thể cao cấp`);
  }

  if (designSpec.charms && designSpec.charms.length > 0) {
    lines.push(`✦ **Charm trang trí**: ${designSpec.charms.join(', ')}`);
  }

  if (designSpec.engravingText && designSpec.engravingText.trim()) {
    lines.push(`✦ **Khắc laser**: "${designSpec.engravingText}" — khắc tiêu chuẩn 15 ký tự trên gọng bên phải`);
  }

  if (customPrice) {
    lines.push(`✦ **Giá tùy chỉnh ước tính**: **${Number(customPrice).toLocaleString('vi-VN')}đ**`);
    lines.push(`  _(Giá cuối cùng được xác nhận khi quý khách thêm vào giỏ hàng)_`);
  }

  lines.push(``, `*Quý khách có thể tiếp tục điều chỉnh từng thông số trực tiếp tại bảng điều khiển bên trái. Mọi thay đổi được lưu tự động.*`);

  return lines.join('\n');
}

/**
 * Trả về hướng dẫn tùy chỉnh Studio cho một thành phần cụ thể.
 * @param {'model'|'frame'|'lens'|'rhinestone'|'charm'|'engraving'|'price'} component
 * @returns {string}
 */
export function guideStudioComponent(component) {
  const guides = {
    model: `**Chọn Base Model (Kiểu gọng):**\n\n✦ **Aviator** — Gọng giọt nước phi công, cầu kép Titanium. Huyền thoại từ 1936.\n✦ **Cat-Eye** — Gọng vát góc ngoài thanh lịch. Icon phong cách Pháp thập niên 50.\n✦ **Round** — Gọng tròn Bauhaus tối giản. Lựa chọn của giới sáng tạo.\n✦ **Square** — Gọng vuông executive lịch lãm. Dành cho môi trường thương mại cao cấp.\n\nQuý khách bấm vào từng mẫu ở bảng **Model Selector** để xem preview 3D realtime.`,

    frame: `**Tùy chỉnh màu gọng & chất liệu:**\n\n✦ **Metalness**: Điều chỉnh từ 0 (Acetate thuần) đến 1.0 (gương kim loại). Giá trị cao → phản chiếu ánh sáng mạnh.\n✦ **Roughness**: Điều chỉnh từ 0 (bóng gương) đến 1.0 (mờ nhám). Giá trị cao → bề mặt mờ Acetate vintage.\n✦ **Màu gọng**: Chọn từ bảng màu cao cấp Lumina — Vàng Champagne, Obsidian, Bạch Kim, Đồng cổ, Đỏ Bordeaux.\n\n*Mẹo: Metalness 0.9 + Roughness 0.2 = hiệu ứng mạ vàng 18K bóng gương.*`,

    lens: `**Tùy chỉnh tròng kính:**\n\n✦ **Màu tròng**: Từ trong suốt quang học đến xám Obsidian, Xanh Sapphire, Nâu Cognac.\n✦ **Độ truyền sáng (Opacity)**: Từ 10% (rất nhạt, kính trong nhà) đến 95% (kính mát đậm).\n  - 10–25%: Kính quang học trong nhà\n  - 45%: Đa năng ngày thường (mặc định)\n  - 65–95%: Kính mát ngoài trời\n\n*Lưu ý: Độ opacity > 85% sẽ hiển thị cảnh báo về tầm nhìn an toàn khi lái xe.*`,

    rhinestone: `**Đính đá Swarovski:**\n\nKích hoạt tính năng này để gắn tinh thể Swarovski chính hãng trên viền gọng.\n\n✦ Tinh thể được phân phối tự động theo kiểu gọng (đều hoặc điểm nhấn).\n✦ Ánh sáng 3D realtime phản chiếu tương tác với tinh thể Swarovski.\n✦ Thêm phụ phí **+500.000đ** vào giá tùy chỉnh.\n\n*Lưu ý: Chỉ dành cho các sự kiện đặc biệt hoặc bộ sưu tập giới hạn.*`,

    charm: `**Gắn Charm trang trí:**\n\nCharm là chi tiết kim loại độc bản được gắn vào cạnh đuôi gọng (tối đa 2 charm).\n\n✦ **lumina-star** ✦: Ngôi sao 5 cánh Lumina — ký hiệu nhận diện thương hiệu.\n✦ **lumina-diamond** ◆: Hình kim cương tinh tế — biểu tượng sự vĩnh cửu.\n✦ **lumina-heart** ♥: Trái tim tinh xảo — dành cho phiên bản quà tặng Valentine.\n\nQuý khách bấm **Thêm Charm** trong bảng Accessories để chọn.`,

    engraving: `**Khắc laser cá nhân hóa:**\n\nCông nghệ khắc laser CNC độ chính xác 0.1mm trên gọng Titanium hoặc bề mặt kim loại:\n\n✦ Tối đa **15 ký tự** (chữ hoa, số và ký tự đặc biệt ✦ ♥ ★).\n✦ Vị trí khắc: Mặt trong cạnh đuôi gọng bên phải (khuất khi đeo).\n✦ Thêm phụ phí **+300.000đ** vào giá tùy chỉnh.\n\n*Thông điệp được khắc vĩnh viễn — không thể thay đổi sau khi đặt hàng.*`,

    price: `**Bảng giá tùy chỉnh 3D Atelier:**\n\n✦ **Giá gọng cơ bản**: Từ 1.950.000đ (Round Titanium) đến 3.450.000đ (Aviator Vàng 18K).\n✦ **Rhinestones Swarovski**: +500.000đ\n✦ **Khắc laser**: +300.000đ\n✦ **Charm trang trí**: +200.000đ/charm\n\nGiá tùy chỉnh tổng cộng được tính realtime tại thanh **Summary Bar** phía dưới.\n\n*Giá cuối cùng được xác nhận khi thêm vào giỏ hàng. Lumina không tính thêm phí thiết kế hay phí tư vấn.*`,
  };

  return guides[component] || guides.model;
}

/**
 * Build hướng dẫn Try-On dựa trên ngữ cảnh hiện tại.
 * @param {object} options
 * @param {string|null} options.detectedFaceShape - Dáng mặt đã nhận diện (nếu có)
 * @param {string|null} options.activeFrameModel - Model đang ướm thử
 * @returns {string}
 */
export function buildTryOnGuide({ detectedFaceShape = null, activeFrameModel = null } = {}) {
  const lines = [];

  if (detectedFaceShape) {
    // Đã có kết quả Face Stylist — giải thích và đề xuất gọng
    const shapeAdvice = {
      round: { vi: 'Mặt tròn', frames: ['Aviator (Phi công)', 'Square (Gọng vuông)', 'Cat-Eye'], tip: 'Gọng có góc cạnh sẽ tạo chiều dài và làm thon gương mặt.' },
      square: { vi: 'Mặt vuông', frames: ['Round (Gọng tròn)', 'Cat-Eye (Mắt mèo)'], tip: 'Gọng tròn và oval làm mềm đường viền quai hàm góc cạnh.' },
      oval: { vi: 'Mặt oval / Trái xoan', frames: ['Aviator', 'Square', 'Round', 'Cat-Eye'], tip: 'Khuôn mặt oval cân đối, hầu hết kiểu gọng đều phù hợp.' },
      heart: { vi: 'Mặt trái tim', frames: ['Aviator (Phi công)', 'Round (Gọng tròn)'], tip: 'Gọng rộng phần dưới giúp cân bằng vầng trán rộng và cằm thon.' },
      diamond: { vi: 'Mặt kim cương', frames: ['Cat-Eye (Mắt mèo)', 'Oval'], tip: 'Gọng có viền trên nhô cao làm nổi bật gò má cao đặc trưng.' },
    };

    const advice = shapeAdvice[detectedFaceShape] || shapeAdvice.oval;
    lines.push(`**Face Stylist AI** vừa phân tích và nhận diện dáng mặt của quý khách là **${advice.vi}**.`);
    lines.push(``);
    lines.push(`✦ **Đặc điểm**: ${advice.tip}`);
    lines.push(`✦ **Kiểu gọng gợi ý tốt nhất**: ${advice.frames.join(', ')}`);
    lines.push(``);

    if (activeFrameModel) {
      const modelName = FRAME_MODEL_INFO[activeFrameModel]?.name || activeFrameModel;
      lines.push(`Quý khách đang ướm thử **${modelName}** trên camera. Có thể thử các kiểu gọng gợi ý ở bảng bên trái để so sánh trực quan.`);
    }

    lines.push(``, `*Lưu ý: Gợi ý dáng mặt mang tính thẩm mỹ và phong cách — không phải quy chuẩn tuyệt đối. Quý khách tự tin chọn theo gu cá nhân.*`);
  } else {
    // Chưa có kết quả — hướng dẫn bật camera
    lines.push(`Hướng dẫn sử dụng **AI Virtual Try-On** của Lumina Eyewear:`);
    lines.push(``);
    lines.push(`**Bước 1 — Bật camera:**`);
    lines.push(`✦ Bấm nút **Bật Camera** ở góc trên bên phải khu vực xem trước.`);
    lines.push(`✦ Trình duyệt sẽ hỏi quyền truy cập camera — bấm **Cho phép**.`);
    lines.push(`✦ Nếu gặp lỗi "Camera bị từ chối": vào cài đặt trình duyệt → Quyền riêng tư → Camera → Cho phép domain này.`);
    lines.push(``);
    lines.push(`**Bước 2 — Căn chỉnh gương mặt:**`);
    lines.push(`✦ Nhìn thẳng vào camera, giữ đầu ở tư thế tự nhiên (không nghiêng quá 15°).`);
    lines.push(`✦ Đảm bảo ánh sáng đủ sáng và đều — tránh ngược sáng.`);
    lines.push(`✦ Nếu hệ thống không nhận diện khuôn mặt: Di chuyển lại gần camera hơn, đảm bảo toàn bộ gương mặt nằm trong khung hình.`);
    lines.push(``);
    lines.push(`**Bước 3 — Thử kính:**`);
    lines.push(`✦ Chọn kiểu gọng từ bảng bên trái. Kính sẽ tự động ướm thử theo chuyển động gương mặt.`);
    lines.push(`✦ Nghiêng đầu trái/phải để xem góc cạnh của gọng kính.`);
    lines.push(`✦ Bấm **Phân tích dáng mặt** (Face Stylist) để nhận tư vấn kiểu gọng phù hợp.`);
    lines.push(``);

    if (activeFrameModel) {
      const modelName = FRAME_MODEL_INFO[activeFrameModel]?.name || activeFrameModel;
      lines.push(`Hiện tại quý khách đang xem **${modelName}** — bật camera để ướm thử trực tiếp.`);
    }
  }

  return lines.join('\n');
}

/**
 * Hướng dẫn khoảng cách đồng tử (PD) an toàn.
 * @returns {string}
 */
export function explainPDMeasurement() {
  return `**Giải thích số đo PD (Pupillary Distance — Khoảng cách đồng tử):**

✦ **PD là gì?**: Khoảng cách tính bằng mm giữa tâm đồng tử mắt trái và mắt phải. Dùng để định vị tâm quang học của tròng kính.

✦ **Giá trị bình thường**: 50–75mm (trung bình người Việt: 62–65mm).

✦ **Camera AI của Lumina**: Phân tích 478 điểm mốc MediaPipe FaceMesh để **ước lượng tỷ lệ tương đối** của khuôn mặt. Kết quả phân tích **không thay thế được số đo PD theo milimét thực tế**, vì camera chưa được hiệu chuẩn chiều sâu.

✦ **Để có số đo PD chính xác cho đơn kính thuốc**: Quý khách nhập PD từ đơn kính do bác sĩ nhãn khoa kê, hoặc được đo bằng thiết bị chuyên dụng tại cửa hàng kính.

*Lumina không nhận trách nhiệm y tế về độ chính xác PD ước lượng từ webcam. Vui lòng tham khảo chuyên gia nhãn khoa.*`;
}

export default {
  explainDesignSpec,
  guideStudioComponent,
  buildTryOnGuide,
  explainPDMeasurement,
  FRAME_MODEL_INFO,
};
