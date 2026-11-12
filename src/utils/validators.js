/**
 * validators.js — Business logic validation conforming to PRD Section 7.
 * Conforms to:
 * - PRD 7.1: Protected action checks (requireAuth)
 * - PRD 7.2: Prescription parameter validation (validatePrescription, validatePD)
 * - PRD 7.3: Custom 3D design constraints (validateCustom3D)
 * - PRD 7.4: Stock boundaries (validateStock)
 */

/**
 * Validates Pupil Distance (PD) in millimeters.
 * PRD 7.2: PD must be within [50, 75] mm.
 * @param {number|string} pd - Pupil distance in mm
 * @returns {Object} { isValid, message, warning }
 */
export function validatePD(pd) {
  const num = parseFloat(pd);
  if (isNaN(num)) {
    return {
      isValid: false,
      message: 'Vui lòng nhập khoảng cách đồng tử (PD) là một số hợp lệ.',
    };
  }

  if (num < 50 || num > 75) {
    return {
      isValid: false,
      message:
        'PD phải nằm trong khoảng 50–75 mm theo quy tắc nhập liệu của hệ thống. Vui lòng xác nhận lại số đo hoặc kiểm tra với chuyên viên kính mắt.',
    };
  }

  return { isValid: true };
}

/**
 * Validates optical prescription form inputs.
 * Conforms to PRD 7.2 rules.
 * @param {Object} rx - Prescription object
 * @returns {Object} { isValid, errors, warnings }
 */
export function validatePrescription(rx = {}) {
  const errors = [];
  const warnings = [];

  // 1. PD check
  if (rx.isPrescriptionOrder) {
    if (!rx.pd) {
      errors.push('Vui lòng nhập khoảng cách đồng tử (PD) khi đặt làm tròng kính thuốc.');
    } else {
      const pdCheck = validatePD(rx.pd);
      if (!pdCheck.isValid) {
        errors.push(pdCheck.message);
      }
    }
  }

  const sphL = parseFloat(rx.sphLeft) || 0;
  const sphR = parseFloat(rx.sphRight) || 0;

  // 2. SPH difference check (> 4.00 Diop)
  if (Math.abs(sphL - sphR) > 4.0) {
    warnings.push(
      'Độ chênh SPH giữa hai mắt lớn hơn 4.00 Diop. Vui lòng kiểm tra lại đơn kính và hỏi chuyên viên về lựa chọn tròng phù hợp.'
    );
  }

  // 3. High SPH with delicate frame check (> 6.00 Diop)
  if ((Math.abs(sphL) > 6.0 || Math.abs(sphR) > 6.0) && rx.frameType === 'thin-metal') {
    errors.push(
      'Cấu hình độ kính và loại gọng này cần được kiểm tra kỹ thuật trước khi đặt. Vui lòng chọn loại gọng khác hoặc xác nhận phương án với chuyên viên kính mắt.'
    );
  }

  // 4. CYL and AXIS integrity
  const cylL = parseFloat(rx.cylLeft) || 0;
  const cylR = parseFloat(rx.cylRight) || 0;
  const axisL = parseInt(rx.axisLeft, 10);
  const axisR = parseInt(rx.axisRight, 10);

  if (cylL !== 0 && (isNaN(axisL) || axisL < 1 || axisL > 180)) {
    errors.push('Bạn đã nhập độ loạn (CYL) mắt trái, vui lòng nhập trục loạn (AXIS) từ 1° đến 180°.');
  }
  if (cylR !== 0 && (isNaN(axisR) || axisR < 1 || axisR > 180)) {
    errors.push('Bạn đã nhập độ loạn (CYL) mắt phải, vui lòng nhập trục loạn (AXIS) từ 1° đến 180°.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates 3D custom design specifications.
 * Conforms to PRD 7.3 rules.
 * @param {Object} spec - designSpec object
 * @returns {Object} { isValid, errors, warnings }
 */
export function validateCustom3D(spec = {}) {
  const errors = [];
  const warnings = [];

  // Charms limit (max 2)
  if (Array.isArray(spec.charms) && spec.charms.length > 2) {
    errors.push(
      'Mỗi bên càng kính chỉ được gắn tối đa một Charm trong cấu hình demo; tổng cộng không quá hai Charm.'
    );
  }

  // Lens opacity boundary [0.10, 0.95]
  const opacity = typeof spec.lensOpacity === 'number' ? spec.lensOpacity : 0.45;
  if (opacity < 0.1 || opacity > 0.95) {
    errors.push('Độ tối tròng kính (lensOpacity) phải nằm trong khoảng 0.10–0.95.');
  }

  // Night driving safety warning (> 0.85)
  if (opacity > 0.85) {
    warnings.push(
      'Mô phỏng tròng kính đang rất tối (> 85%), không nên sử dụng cấu hình này khi lái xe ban đêm hoặc trong hầm tối.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
