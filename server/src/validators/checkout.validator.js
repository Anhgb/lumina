import { BadRequestError } from '../middleware/errorHandler.js';

const VALID_FRAME_MODELS = [
  'aviator',
  'cateye',
  'round',
  'square',
  'modern-pilot',
  'sculpted-cateye',
  'oversized-square',
  'slim-oval',
  'geometric-hexagon',
  'bug-eye',
];

/**
 * checkout.validator.js — Strict payload validation for POST /api/orders/checkout.
 * Conforms to PRD Section 7 & Prompt 7 Section 5.
 */

export function validateCheckoutPayload(req, res, next) {
  const { customer, items, paymentMethod } = req.body;

  const errors = [];

  if (paymentMethod !== undefined && !['cod', 'banking'].includes(paymentMethod)) {
    errors.push('Phương thức thanh toán chỉ nhận cod hoặc banking.');
  }

  // 1. Customer information validation
  if (!customer || typeof customer !== 'object') {
    return next(new BadRequestError('Thiếu thông tin người nhận hàng (customer).'));
  }

  if (!customer.name || customer.name.trim().length < 2) {
    errors.push('Họ tên người nhận phải có ít nhất 2 ký tự.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!customer.email || !emailRegex.test(customer.email.trim())) {
    errors.push('Địa chỉ email không đúng định dạng.');
  }

  const phoneRegex = /^[0-9+()-\s]{9,15}$/;
  if (!customer.phone || !phoneRegex.test(customer.phone.trim())) {
    errors.push('Số điện thoại không hợp lệ (từ 9 đến 15 chữ số).');
  }

  if (!customer.address || customer.address.trim().length < 5) {
    errors.push('Địa chỉ nhận hàng quá ngắn (tối thiểu 5 ký tự).');
  }

  if (!customer.city || customer.city.trim().length < 2) {
    errors.push('Vui lòng chọn Tỉnh / Thành phố nhận hàng.');
  }

  // 2. Items list validation
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.');
    return next(new BadRequestError('Dữ liệu đơn hàng không hợp lệ.', errors));
  }

  items.forEach((item, idx) => {
    const itemPrefix = `Sản phẩm #${idx + 1}`;

    const hasIdentifier =
      item.productId || item.id || (item.designSpec && item.designSpec.baseModel);
    if (!hasIdentifier) {
      errors.push(`${itemPrefix}: Thiếu mã nhận diện sản phẩm (productId).`);
    }

    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 99) {
      errors.push(`${itemPrefix}: Số lượng không hợp lệ (phải từ 1 đến 99).`);
    }

    // Custom 3D Bespoke Validation (PRD 7.3)
    if (item.productType === 'custom' || item.designSpec) {
      const spec = item.designSpec;
      if (!spec || typeof spec !== 'object') {
        errors.push(`${itemPrefix}: Thiếu thông số thiết kế kính 3D (designSpec).`);
      } else {
        if (!VALID_FRAME_MODELS.includes(spec.baseModel?.toLowerCase())) {
          errors.push(
            `${itemPrefix}: Dáng gọng kính 3D không hợp lệ.`
          );
        }

        const opacity = parseFloat(spec.lensOpacity);
        if (isNaN(opacity) || opacity < 0.1 || opacity > 0.95) {
          errors.push(
            `${itemPrefix}: Độ tối tròng kính (lensOpacity) phải nằm trong khoảng 0.10–0.95.`
          );
        }

        if (Array.isArray(spec.charms) && spec.charms.length > 2) {
          errors.push(
            `${itemPrefix}: Mỗi thiết kế chỉ được gắn tối đa 2 Charm theo quy chuẩn PRD 7.3.`
          );
        }

        if (spec.engravingText && spec.engravingText.length > 15) {
          errors.push(`${itemPrefix}: Chữ khắc laser tối đa 15 ký tự.`);
        }

        const VALID_TEMPLE_STYLES = ['classic-acetate', 'slim-metal', 'statement-wide', 'sculpted-comfort'];
        const VALID_ENGRAVING_PLACEMENTS = ['outer_temple', 'inner_temple', 'two_temples'];

        if (spec.templeStyle !== undefined && !VALID_TEMPLE_STYLES.includes(spec.templeStyle)) {
          errors.push(`${itemPrefix}: Kiểu càng kính (templeStyle) không hợp lệ.`);
        }
        if (spec.engravingPlacement !== undefined && !VALID_ENGRAVING_PLACEMENTS.includes(spec.engravingPlacement)) {
          errors.push(`${itemPrefix}: Vị trí khắc (engravingPlacement) không hợp lệ.`);
        }
      }
    }

    // Prescription validation (PRD 7.2)
    if (
      item.prescription &&
      (item.prescription.isPrescriptionOrder ||
        item.prescription.pd ||
        item.prescription.od ||
        item.prescription.os ||
        item.prescription.cylRight ||
        item.prescription.cylLeft)
    ) {
      const rx = item.prescription;
      if (rx.pd !== undefined && rx.pd !== null && rx.pd !== '') {
        const pd = parseFloat(rx.pd);
        if (isNaN(pd) || pd < 50 || pd > 75) {
          errors.push(
            `${itemPrefix}: Khoảng cách đồng tử (PD) phải nằm trong khoảng 50–75 mm theo quy chuẩn PRD 7.2.`
          );
        }
      }

      const cylOD = parseFloat(rx.cylRight ?? rx.cylinderOD ?? rx.cylOD ?? rx.od?.cyl) || 0;
      const cylOS = parseFloat(rx.cylLeft ?? rx.cylinderOS ?? rx.cylOS ?? rx.os?.cyl) || 0;
      const rawAxisOD = rx.axisRight ?? rx.axisOD ?? rx.od?.axis;
      const rawAxisOS = rx.axisLeft ?? rx.axisOS ?? rx.os?.axis;
      const axisOD =
        rawAxisOD !== null && rawAxisOD !== undefined && rawAxisOD !== ''
          ? parseInt(rawAxisOD, 10)
          : NaN;
      const axisOS =
        rawAxisOS !== null && rawAxisOS !== undefined && rawAxisOS !== ''
          ? parseInt(rawAxisOS, 10)
          : NaN;

      if (cylOD !== 0 && (isNaN(axisOD) || axisOD < 1 || axisOD > 180)) {
        errors.push(
          `${itemPrefix}: Mắt phải có độ loạn (CYL khác 0) thì trục loạn (AXIS OD) phải nằm trong khoảng 1° đến 180°.`
        );
      }

      if (cylOS !== 0 && (isNaN(axisOS) || axisOS < 1 || axisOS > 180)) {
        errors.push(
          `${itemPrefix}: Mắt trái có độ loạn (CYL khác 0) thì trục loạn (AXIS OS) phải nằm trong khoảng 1° đến 180°.`
        );
      }
    }
  });

  if (errors.length > 0) {
    return next(new BadRequestError('Dữ liệu đơn hàng không hợp lệ.', errors));
  }

  next();
}
