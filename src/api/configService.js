import { postmanClient } from './apiClient';

/**
 * configService.js — Postman Mock Server integration for AI Stylist rules, charms & vouchers.
 * Conforms to PRD Section 3.1 & Prompt VI:
 * Provides resilient fallback dataset if Postman Mock Server is unavailable.
 */

// Local fallback dataset for 5 face shapes & AI styling advice
export const FALLBACK_AI_FACE_RULES = {
  round: {
    shape: 'Round',
    shapeNameVi: 'Mặt Tròn',
    description: 'Chiều dài và chiều rộng khuôn mặt tương đương nhau, đường viền hàm mềm mại, không có góc cạnh sắc nét.',
    recommendedFrames: ['square', 'aviator'],
    avoidFrames: ['round'],
    stylingAdvice:
      'Nên chọn gọng kính có góc cạnh sắc nét như Dáng Vuông (Square) hoặc Dáng Chữ Nhật để tạo cảm giác khuôn mặt thon dài, thanh thoát hơn. Tránh các mẫu gọng tròn nhỏ vì sẽ làm gương mặt trông đầy đặn hơn.',
    favorableColors: ['#141413', '#C0C0C0'],
  },
  square: {
    shape: 'Square',
    shapeNameVi: 'Mặt Vuông',
    description: 'Trán rộng, gò má và xương hàm có chiều rộng tương đương, quai hàm vuông vức và góc cạnh sắc nét.',
    recommendedFrames: ['round', 'aviator'],
    avoidFrames: ['square'],
    stylingAdvice:
      'Nên chọn gọng kính dáng Tròn (Round) hoặc Aviator hình giọt nước có đường cong mềm mại để cân bằng lại nét góc cạnh của xương hàm. Tránh gọng kính quá góc cạnh hoặc bản dày.',
    favorableColors: ['#D4AF37', '#78350F'],
  },
  oval: {
    shape: 'Oval',
    shapeNameVi: 'Mặt Trái Xoan',
    description: 'Tỷ lệ khuôn mặt cân đối lý tưởng, chiều dài lớn hơn chiều rộng khoảng 1.5 lần, cằm và trán thon gọn mềm mại.',
    recommendedFrames: ['aviator', 'cateye', 'square', 'round'],
    avoidFrames: [],
    stylingAdvice:
      'Gương mặt trái xoan có tỷ lệ vàng và phù hợp với hầu hết mọi kiểu dáng gọng kính. Hãy thử Dáng Cat-Eye kiêu kỳ hoặc Aviator phóng khoáng để tôn lên nét thanh tú tự nhiên.',
    favorableColors: ['#D4AF37', '#141413', '#C0C0C0', 'tortoiseshell'],
  },
  heart: {
    shape: 'Heart',
    shapeNameVi: 'Mặt Trái Tim',
    description: 'Trán rộng, gò má cao và cằm thon nhọn dần về phía dưới giống hình trái tim.',
    recommendedFrames: ['aviator', 'round'],
    avoidFrames: ['cateye'],
    stylingAdvice:
      'Nên chọn gọng kính có phần dưới rộng hơn như Aviator hoặc gọng tròn viền thanh mảnh để tạo độ cân đối cho phần cằm nhọn. Tránh gọng Cat-Eye quá nhọn ở phần trên.',
    favorableColors: ['#C0C0C0', '#D4AF37'],
  },
  diamond: {
    shape: 'Diamond',
    shapeNameVi: 'Mặt Kim Cương',
    description: 'Gò má rộng và nổi bật nhất, trong khi trán và cằm đều hẹp và thon dài.',
    recommendedFrames: ['cateye', 'round'],
    avoidFrames: ['square'],
    stylingAdvice:
      'Nên chọn gọng kính Cat-Eye xếch nhẹ hoặc gọng tròn/oval có điểm nhấn ở viền trên (Browline) để hướng sự chú ý lên đôi mắt và làm mềm mại đôi gò má cao.',
    favorableColors: ['#D4AF37', '#831843', 'tortoiseshell'],
  },
};

export const configService = {
  /**
   * Fetches AI Face Styling rules from Postman Mock Server with local fallback
   * @returns {Promise<Object>}
   */
  async getAiFaceRules() {
    try {
      const response = await postmanClient.get('/ai_face_rules');
      if (response.data && typeof response.data === 'object') {
        return {
          source: 'postman_mock',
          data: response.data,
        };
      }
    } catch {
      // Fallback silently to comprehensive local rules
    }

    return {
      source: 'local_fallback',
      data: FALLBACK_AI_FACE_RULES,
    };
  },

  /**
   * Gets styling advice for a specific face shape
   * @param {string} shapeKey - 'round' | 'square' | 'oval' | 'heart' | 'diamond'
   * @returns {Object}
   */
  getAdviceForShape(shapeKey) {
    const key = (shapeKey || '').toLowerCase();
    return FALLBACK_AI_FACE_RULES[key] || FALLBACK_AI_FACE_RULES.oval;
  },
};
