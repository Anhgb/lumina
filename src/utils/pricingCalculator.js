/**
 * pricingCalculator.js — Demo pricing formula for Lumina Bespoke 3D Eyewear.
 * Conforms to PRD Section 4 & Prompt 5:
 * 
 * LƯU Ý MINH BẠCH (TRANSPARENT PRICING NOTICE):
 * Đây là công thức tính giá ước tính dành riêng cho phiên bản DEMO / Đồ án Frontend.
 * Giá hiển thị có tính chất tham khảo trực quan, không phải báo giá bán lẻ cam kết ngoài thực tế.
 * Trong hệ thống sản xuất thật, Backend sẽ là nguồn thẩm quyền kiểm tra và tính toán lại giá chính thức.
 */

export const BASE_MODEL_PRICES = {
  aviator: {
    label: 'Celestial Aviator',
    basePrice: 2450000,
    description: 'Khung dáng Aviator phi công kinh điển với cầu đôi thanh thoát.',
  },
  cateye: {
    label: 'Cyber Cat-Eye',
    basePrice: 2650000,
    description: 'Dáng mắt mèo kiêu kỳ với góc vát sắc sảo tôn đường nét khuôn mặt.',
  },
  round: {
    label: 'Aura Round',
    basePrice: 2250000,
    description: 'Dáng tròn hoài cổ tri thức, thanh thoát và tối giản.',
  },
  square: {
    label: 'Titan Square',
    basePrice: 2350000,
    description: 'Dáng vuông bản dày mạnh mẽ với các góc bo tinh tế.',
  },
  'modern-pilot': {
    label: 'Modern Pilot',
    basePrice: 2650000,
    description: 'Pilot kim loại tinh chỉnh tỷ lệ, phong cách thanh lịch hiện đại.',
  },
  'sculpted-cateye': {
    label: 'Sculpted Cat-Eye',
    basePrice: 2750000,
    description: 'Cat-Eye acetate tạo khối sắc nét, tôn vinh gò má.',
  },
  'oversized-square': {
    label: 'Oversized Square',
    basePrice: 2850000,
    description: 'Acetate bản lớn bo góc mềm mại, sang trọng quý phái.',
  },
  'slim-oval': {
    label: 'Slim Oval',
    basePrice: 2550000,
    description: 'Oval titanium mảnh siêu nhẹ, tinh tế thanh lịch.',
  },
  'geometric-hexagon': {
    label: 'Geometric Hexagon',
    basePrice: 2700000,
    description: 'Gọng lục giác titanium cá tính, kiến trúc hình học độc đáo.',
  },
  'bug-eye': {
    label: 'Bug-Eye',
    basePrice: 2900000,
    description: 'Acetate oversized có kiểm soát, tạo điểm nhấn thời trang ấn tượng.',
  },
};

export const FRAME_COLOR_ADDONS = {
  '#D4AF37': {
    name: 'Vàng Champagne 18K',
    addon: 400000,
    metalness: 0.9,
    roughness: 0.2,
  },
  '#141413': {
    name: 'Đen Obsidian Onyx',
    addon: 0,
    metalness: 0.3,
    roughness: 0.35,
  },
  '#C0C0C0': {
    name: 'Bạc Titanium Silver',
    addon: 300000,
    metalness: 0.95,
    roughness: 0.15,
  },
  'tortoiseshell': {
    name: 'Họa Tiết Đồi Mồi Ý',
    addon: 350000,
    metalness: 0.1,
    roughness: 0.4,
  },
};

export const CHARM_PRICES = {
  'lumina-star': {
    name: 'Ngôi Sao Lumina Star (✦)',
    price: 200000,
    color: '#D4AF37',
    description: 'Biểu tượng ngôi sao 4 cánh Lumina mạ vàng 18K đính bên càng kính.',
  },
  'ruby-heart': {
    name: 'Trái Tim Ruby Heart (♥)',
    price: 250000,
    color: '#DC2626',
    description: 'Pha lê đỏ cắt giác hình trái tim lãng mạn sang trọng.',
  },
  'silver-butterfly': {
    name: 'Hồ Điệp Bạc Silver Butterfly (🦋)',
    price: 220000,
    color: '#E2E8F0',
    description: 'Hồ điệp bạch kim đúc nổi tinh xảo tượng trưng cho sự thanh thoát.',
  },
};

export const RHINESTONE_PRICE = 450000;
export const ENGRAVING_PRICE = 150000;

/**
 * Calculates the total custom eyewear price with transparent breakdown.
 * @param {Object} spec - designSpec object
 * @returns {Object} { total, breakdown }
 */
export function calculateCustomEyewearPrice(spec = {}) {
  const modelKey = spec.baseModel || 'aviator';
  const modelInfo = BASE_MODEL_PRICES[modelKey] || BASE_MODEL_PRICES.aviator;
  const basePrice = modelInfo.basePrice;

  // Frame color addon
  const colorKey = spec.frameColor || '#D4AF37';
  const colorInfo = FRAME_COLOR_ADDONS[colorKey] || FRAME_COLOR_ADDONS['#D4AF37'];
  const frameColorAddon = colorInfo.addon;

  // Rhinestones addon
  const rhinestonesAddon = spec.hasRhinestones ? RHINESTONE_PRICE : 0;

  // Charms addon (max 2 charms as per PRD 7.3)
  const safeCharms = Array.isArray(spec.charms) ? spec.charms.slice(0, 2) : [];
  let charmsAddon = 0;
  const charmsBreakdown = safeCharms.map((charmId) => {
    const charmInfo = CHARM_PRICES[charmId] || { name: charmId, price: 200000 };
    charmsAddon += charmInfo.price;
    return { name: charmInfo.name, price: charmInfo.price };
  });

  // Engraving addon
  const hasEngraving = Boolean(spec.engravingText && spec.engravingText.trim().length > 0);
  const engravingAddon = hasEngraving ? ENGRAVING_PRICE : 0;

  const total = basePrice + frameColorAddon + rhinestonesAddon + charmsAddon + engravingAddon;

  return {
    total,
    modelName: modelInfo.label,
    basePrice,
    frameColorAddon,
    frameColorName: colorInfo.name,
    rhinestonesAddon,
    charmsAddon,
    charmsBreakdown,
    engravingAddon,
    hasEngraving,
  };
}
