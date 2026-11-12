import { pool } from '../config/database.js';
import { BadRequestError, ConflictError } from '../middleware/errorHandler.js';

/**
 * pricing.service.js — Authoritative Server-side Price & Inventory Verification.
 * Conforms to PRD Section 4 & Prompt 7 Section 4:
 * - Never trusts client-supplied prices or subtotals
 * - Queries MySQL for authoritative catalog prices and stock
 * - Re-computes 3D Bespoke custom specs prices server-side
 */

// 3D Bespoke Pricing Constants (Strictly synchronized with Frontend pricingCalculator.js)
export const BASE_MODEL_PRICES = {
  aviator: { label: 'Celestial Aviator', price: 2450000 },
  cateye: { label: 'Cyber Cat-Eye', price: 2650000 },
  round: { label: 'Aura Round', price: 2250000 },
  square: { label: 'Titan Square', price: 2350000 },
  'modern-pilot': { label: 'Modern Pilot', price: 2650000 },
  'sculpted-cateye': { label: 'Sculpted Cat-Eye', price: 2750000 },
  'oversized-square': { label: 'Oversized Square', price: 2850000 },
  'slim-oval': { label: 'Slim Oval', price: 2550000 },
  'geometric-hexagon': { label: 'Geometric Hexagon', price: 2700000 },
  'bug-eye': { label: 'Bug-Eye', price: 2900000 },
};

export const FRAME_COLOR_ADDONS = {
  '#D4AF37': 400000, // Vàng 18K
  '#C0C0C0': 300000, // Titanium
  tortoiseshell: 350000, // Đồi mồi Ý
  '#141413': 0, // Đen Obsidian
};

export const CHARM_PRICES = {
  'lumina-star': 200000,
  'ruby-heart': 250000,
  'silver-butterfly': 220000,
};

export const RHINESTONES_ADDON = 450000;
export const ENGRAVING_ADDON = 150000;

export const DEMO_VOUCHERS = {
  LUMINA10: {
    type: 'percent',
    value: 10,
    minOrder: 2000000,
    description: 'Giảm 10% cho đơn hàng từ 2.000.000 ₫',
  },
  BESPOKE200: {
    type: 'fixed',
    value: 200000,
    minOrder: 1500000,
    description: 'Giảm 200.000 ₫ cho thiết kế Bespoke',
  },
  FREESHIP: {
    type: 'shipping',
    value: 0,
    minOrder: 0,
    description: 'Miễn phí vận chuyển toàn quốc',
  },
};

/**
 * Calculates authoritative unit price for a 3D Bespoke Eyewear design.
 * @param {Object} spec - designSpec
 * @returns {number} verified unit price
 */
export function calculateAuthoritativeBespokePrice(spec = {}) {
  const modelKey = (spec.baseModel || 'aviator').toLowerCase();
  const modelInfo = BASE_MODEL_PRICES[modelKey];
  if (!modelInfo) {
    throw new BadRequestError('Dáng gọng kính 3D không hợp lệ.');
  }
  const basePrice = modelInfo.price;

  const colorKey = spec.frameColor || '#D4AF37';
  const colorAddon = FRAME_COLOR_ADDONS[colorKey] ?? FRAME_COLOR_ADDONS['#D4AF37'];

  const rhinestonesAddon = spec.hasRhinestones ? RHINESTONES_ADDON : 0;

  let charmsAddon = 0;
  if (Array.isArray(spec.charms)) {
    const safeCharms = spec.charms.slice(0, 2);
    for (const charmId of safeCharms) {
      charmsAddon += CHARM_PRICES[charmId] || 200000;
    }
  }

  const hasEngraving = Boolean(spec.engravingText && spec.engravingText.trim().length > 0);
  const engravingAddon = hasEngraving ? ENGRAVING_ADDON : 0;

  return basePrice + colorAddon + rhinestonesAddon + charmsAddon + engravingAddon;
}

/**
 * Verifies all order items against authoritative database and pricing rules.
 * @param {Array} rawItems - Array of cart items from client
 * @param {string|null} voucherCode - Optional voucher code
 * @param {Object} [connection] - Optional MySQL connection for transaction lock
 * @returns {Promise<Object>} Verified items breakdown and total calculations
 */
export async function verifyOrderPricingAndStock(rawItems, voucherCode = null, connection = null) {
  const db = connection || pool;
  const verifiedItems = [];
  let subtotalAmount = 0;

  for (const item of rawItems) {
    const qty = parseInt(item.quantity, 10);
    const isCustom = item.productType === 'custom' || Boolean(item.designSpec);

    if (isCustom) {
      // 1. Custom 3D Bespoke Eyewear
      const verifiedUnitPrice = calculateAuthoritativeBespokePrice(item.designSpec);
      const itemSubtotal = verifiedUnitPrice * qty;

      subtotalAmount += itemSubtotal;
      verifiedItems.push({
        productId: item.productId || `bespoke-${item.designSpec.baseModel}`,
        productType: 'custom',
        productName: item.name || `Lumina Bespoke 3D (${item.designSpec.baseModel})`,
        quantity: qty,
        unitPrice: verifiedUnitPrice,
        subtotal: itemSubtotal,
        designSpec: item.designSpec,
        snapshotDataUrl: item.snapshotDataUrl || null,
        prescription: item.prescription || null,
      });
    } else {
      // 2. Catalog Product: Query authoritative price & stock from MySQL
      const productId = item.productId || item.id;
      const [rows] = await db.query(
        'SELECT id, name, price, stock, is_active FROM products WHERE id = ? FOR UPDATE',
        [productId]
      );

      if (rows.length === 0) {
        throw new BadRequestError(`Sản phẩm với mã "${productId}" không tồn tại trong hệ thống.`);
      }

      const product = rows[0];

      if (!product.is_active) {
        throw new BadRequestError(`Sản phẩm "${product.name}" hiện đã ngừng kinh doanh.`);
      }

      if (product.stock < qty) {
        throw new ConflictError(
          `Sản phẩm "${product.name}" không đủ tồn kho khả dụng (Kho: ${product.stock}, Đặt: ${qty}).`
        );
      }

      const verifiedUnitPrice = parseFloat(product.price);
      const itemSubtotal = verifiedUnitPrice * qty;

      subtotalAmount += itemSubtotal;
      verifiedItems.push({
        productId: product.id,
        productType: 'catalog',
        productName: product.name,
        quantity: qty,
        unitPrice: verifiedUnitPrice,
        subtotal: itemSubtotal,
        currentStock: product.stock,
        prescription: item.prescription || null,
      });
    }
  }

  // 3. Voucher calculation
  let discountAmount = 0;
  let appliedVoucher = null;

  if (voucherCode && voucherCode.trim().length > 0) {
    const code = voucherCode.trim().toUpperCase();
    const vConfig = DEMO_VOUCHERS[code];

    if (!vConfig) {
      throw new BadRequestError(`Mã giảm giá "${code}" không tồn tại hoặc đã hết hạn.`);
    }

    if (subtotalAmount < vConfig.minOrder) {
      throw new BadRequestError(
        `Mã "${code}" yêu cầu đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(
          vConfig.minOrder
        )} ₫.`
      );
    }

    if (vConfig.type === 'percent') {
      discountAmount = Math.round((subtotalAmount * vConfig.value) / 100);
    } else if (vConfig.type === 'fixed') {
      discountAmount = Math.min(subtotalAmount, vConfig.value);
    }

    appliedVoucher = code;
  }

  const shippingFee = 0; // Standard free luxury shipping
  const totalAmount = Math.max(0, subtotalAmount + shippingFee - discountAmount);

  return {
    verifiedItems,
    subtotalAmount,
    shippingFee,
    discountAmount,
    voucherCode: appliedVoucher,
    totalAmount,
  };
}
