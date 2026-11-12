/**
 * Lumina Eyewear — Hybrid Intent Classifier
 * 
 * Phân loại tin nhắn người dùng vào các intent:
 *   faq, product, order, tryon, studio, unknown
 * 
 * Sử dụng keyword scoring + pattern matching thay vì chỉ includes().
 * Trả về { intent, confidence, matchedFaq?, extractedEntities? }
 */

import FAQ_DATA from './faq.data.js';
import { parseBudgetConstraint } from './productTools.js';

// ── Intent patterns with weighted keywords ──
const INTENT_PATTERNS = {
  product: {
    keywords: [
      { term: 'sản phẩm', weight: 3 },
      { term: 'bộ sưu tập', weight: 3 },
      { term: 'catalog', weight: 3 },
      { term: 'kính mắt', weight: 3 },
      { term: 'gọng kính', weight: 3 },
      { term: 'mẫu kính', weight: 3 },
      { term: 'kính', weight: 2 },
      { term: 'giá', weight: 1.5 },
      { term: 'bao nhiêu tiền', weight: 2 },
      { term: 'giá bao nhiêu', weight: 2 },
      { term: 'ngân sách', weight: 3.5 },
      { term: 'tầm giá', weight: 3 },
      { term: 'khoảng giá', weight: 3 },
      { term: 'triệu', weight: 2 },
      { term: 'tìm kính', weight: 3 },
      { term: 'gọng', weight: 1.5 },
      { term: 'titanium', weight: 2 },
      { term: 'acetate', weight: 2 },
      { term: 'aviator', weight: 2 },
      { term: 'cat-eye', weight: 2 },
      { term: 'cateye', weight: 2 },
      { term: 'mắt mèo', weight: 2 },
      { term: 'phi công', weight: 2 },
      { term: 'round', weight: 1.5 },
      { term: 'square', weight: 1.5 },
      { term: 'tròn', weight: 2 },
      { term: 'vuông', weight: 2 },
      { term: 'cao cấp', weight: 2 },
      { term: 'minimalist', weight: 2 },
      { term: 'obsidian', weight: 2 },
      { term: 'kính bơi', weight: 3 },
      { term: 'so sánh', weight: 3.5 },
      { term: 'khác nhau', weight: 3 },
      { term: 'dáng mặt', weight: 3 },
      { term: 'mặt tròn', weight: 3 },
      { term: 'mặt vuông', weight: 3 },
      { term: 'trái xoan', weight: 3 },
      { term: 'trái tim', weight: 3 },
      { term: 'kim cương', weight: 3 },
      { term: 'mặt dài', weight: 3 },
      { term: 'chữ nhật', weight: 2.5 },
      { term: 'khuôn mặt', weight: 2.5 },
      { term: 'hợp kính', weight: 3 },
      { term: 'tư vấn', weight: 1.5 },
      { term: 'chọn kính', weight: 3 },
      { term: 'đề xuất', weight: 1.5 },
      { term: 'recommend', weight: 1.5 },
      { term: 'còn hàng', weight: 2 },
      { term: 'hết hàng', weight: 2 },
      { term: 'tồn kho', weight: 2 },
      { term: 'mẫu', weight: 1 },
      { term: 'dưới', weight: 1 },
      { term: 'trên', weight: 1 },
    ],
    threshold: 3,
  },

  order: {
    keywords: [
      { term: 'đơn hàng', weight: 4 },
      { term: 'tra cứu đơn', weight: 4 },
      { term: 'kiểm tra đơn', weight: 4 },
      { term: 'xem đơn', weight: 3 },
      { term: 'mã đơn', weight: 4 },
      { term: 'lum-', weight: 5 },
      { term: 'trạng thái đơn', weight: 4 },
      { term: 'giao hàng chưa', weight: 3 },
      { term: 'khi nào nhận', weight: 3 },
      { term: 'đã giao chưa', weight: 3 },
      { term: 'order', weight: 2 },
      { term: 'tracking', weight: 3 },
      { term: 'theo dõi đơn', weight: 4 },
      { term: 'đơn của tôi', weight: 3 },
      { term: 'hủy đơn', weight: 4 },
      { term: 'đổi địa chỉ đơn', weight: 3 },
      { term: 'đơn', weight: 1.5 },
    ],
    threshold: 3,
  },

  tryon: {
    keywords: [
      { term: 'thử kính', weight: 4 },
      { term: 'try on', weight: 4 },
      { term: 'try-on', weight: 4 },
      { term: 'ai try-on', weight: 4 },
      { term: 'hướng dẫn thử kính', weight: 4 },
      { term: 'camera', weight: 2 },
      { term: 'webcam', weight: 2 },
      { term: 'ảnh chân dung', weight: 3 },
      { term: 'virtual', weight: 1.5 },
      { term: 'pd', weight: 2 },
      { term: 'pupillary', weight: 3 },
      { term: 'khoảng cách đồng tử', weight: 3 },
      { term: 'đồng tử', weight: 3 },
      { term: 'khuôn mặt', weight: 1.5 },
      { term: 'face stylist', weight: 3 },
      { term: 'điểm mốc', weight: 2 },
    ],
    threshold: 3,
  },

  studio: {
    keywords: [
      { term: '3d', weight: 2 },
      { term: 'atelier', weight: 4 },
      { term: 'bespoke', weight: 4 },
      { term: 'tùy biến', weight: 3 },
      { term: 'tùy chỉnh', weight: 3 },
      { term: 'customize', weight: 3 },
      { term: 'khắc tên', weight: 4 },
      { term: 'khắc laser', weight: 4 },
      { term: 'đính đá', weight: 3 },
      { term: 'swarovski', weight: 4 },
      { term: 'charm', weight: 2 },
      { term: 'rhinestone', weight: 3 },
      { term: 'mạ vàng', weight: 3 },
      { term: 'thiết kế kính', weight: 3 },
      { term: 'cá nhân hóa', weight: 3 },
    ],
    threshold: 3,
  },

  // ── PROMPT 07: AFTER-SALES CONCIERGE INTENTS ──
  aftersales_care: {
    keywords: [
      { term: 'yêu cầu hỗ trợ', weight: 4.5 },
      { term: 'phiếu hỗ trợ', weight: 4.5 },
      { term: 'phiếu bảo hành', weight: 4.5 },
      { term: 'bảo hành kính', weight: 4 },
      { term: 'sửa kính', weight: 3.5 },
      { term: 'lỗi kỹ thuật', weight: 3.5 },
      { term: 'chăm sóc sau mua', weight: 4 },
      { term: 'tạo phiếu', weight: 4 },
      { term: 'gửi phiếu', weight: 4 },
      { term: 'tình trạng hỗ trợ', weight: 4 },
      { term: 'lumina care', weight: 3.5 },
      { term: 'care-', weight: 5 },
      { term: 've mũi', weight: 2.5 },
      { term: 'cân chỉnh ve mũi', weight: 3.5 },
      { term: 'sóng siêu âm', weight: 3 },
      { term: 'vệ sinh siêu âm', weight: 3.5 },
      { term: 'bảo dưỡng', weight: 2.5 },
    ],
    threshold: 3,
  },

  aftersales_loyalty: {
    keywords: [
      { term: 'điểm thành viên', weight: 5 },
      { term: 'điểm thưởng', weight: 4.5 },
      { term: 'điểm tích lũy', weight: 4.5 },
      { term: 'hạng thành viên', weight: 4 },
      { term: 'hạng bạc', weight: 3.5 },
      { term: 'hạng vàng', weight: 3.5 },
      { term: 'hạng kim cương', weight: 3.5 },
      { term: 'đổi điểm', weight: 4 },
      { term: 'lịch sử điểm', weight: 4 },
      { term: 'loyalty', weight: 3.5 },
      { term: 'tích điểm', weight: 3.5 },
      { term: 'điểm của tôi', weight: 4 },
      { term: 'điểm hiện có', weight: 4 },
    ],
    threshold: 3,
  },

  aftersales_review_referral: {
    keywords: [
      { term: 'đánh giá sản phẩm', weight: 4.5 },
      { term: 'viết review', weight: 4.5 },
      { term: 'viết đánh giá', weight: 4.5 },
      { term: 'review kính', weight: 4 },
      { term: 'giới thiệu bạn bè', weight: 4.5 },
      { term: 'mã giới thiệu', weight: 4.5 },
      { term: 'link giới thiệu', weight: 4.5 },
      { term: 'thưởng giới thiệu', weight: 4 },
      { term: 'referral', weight: 4 },
    ],
    threshold: 3,
  },

  aftersales_design: {
    keywords: [
      { term: 'thiết kế đã mua', weight: 6 },
      { term: 'xem lại thiết kế', weight: 6 },
      { term: 'thiết kế tôi đã đặt mua', weight: 7 },
      { term: 'thiết kế đã đặt', weight: 6 },
      { term: 'thiết kế đã đặt mua', weight: 7 },
      { term: 'bản vẽ 3d đã mua', weight: 6 },
      { term: 'kính đã đặt mua', weight: 6 },
      { term: 'kính bespoke đã đặt', weight: 6 },
      { term: 'snapshot đã mua', weight: 6 },
      { term: 'designspec đã mua', weight: 6 },
      { term: 'đã đặt mua', weight: 4.5 },
      { term: 'đã mua', weight: 3 },
      { term: 'đã đặt', weight: 3 },
    ],
    threshold: 3,
  },

  human_handover: {
    keywords: [
      { term: 'gặp nhân viên', weight: 5 },
      { term: 'gặp tư vấn viên', weight: 5 },
      { term: 'chuyên viên hỗ trợ', weight: 5 },
      { term: 'chuyển nhân viên', weight: 5 },
      { term: 'gọi nhân viên', weight: 4.5 },
      { term: 'người thật', weight: 5 },
      { term: 'human agent', weight: 5 },
      { term: 'gặp quản lý', weight: 4.5 },
      { term: 'khiếu nại nhân viên', weight: 4 },
      { term: 'tổng đài viên', weight: 4.5 },
    ],
    threshold: 3,
  },

  care_tips: {
    keywords: [
      { term: 'bảo quản kính', weight: 4.5 },
      { term: 'cách bảo quản', weight: 4.5 },
      { term: 'vệ sinh kính', weight: 4 },
      { term: 'lau kính', weight: 4 },
      { term: 'rửa kính', weight: 3.5 },
      { term: 'giữ gìn kính', weight: 4 },
      { term: 'chăm sóc kính', weight: 4 },
    ],
    threshold: 3,
  },
};

/**
 * Chuẩn hóa chuỗi tiếng Việt loại bỏ dấu để so sánh linh hoạt.
 * @param {string} str 
 * @returns {string}
 */
export function removeAccents(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Tính confidence score cho một intent dựa trên keyword matching.
 * @param {string} text - Tin nhắn đã lowercase
 * @param {object} pattern - Object { keywords, threshold }
 * @returns {number} Tổng điểm weight
 */
function scoreIntent(text, pattern) {
  let score = 0;
  const unaccentedText = removeAccents(text);
  for (const { term, weight } of pattern.keywords) {
    const unaccentedTerm = removeAccents(term);
    if (text.includes(term) || unaccentedText.includes(unaccentedTerm)) {
      score += weight;
    }
  }
  return score;
}

/**
 * Tìm FAQ phù hợp nhất dựa trên keyword matching.
 * @param {string} text - Tin nhắn đã lowercase
 * @returns {{ faq: object, score: number } | null}
 */
function findBestFaq(text) {
  let bestFaq = null;
  let bestScore = 0;

  const corePolicyKeywords = [
    'bảo hành', 'đổi trả', 'hoàn tiền', 'mở cửa', 'đóng cửa', 
    'mấy giờ', 'bảo quản', 'vệ sinh', 'lau kính', 'hướng dẫn',
    'chuyển khoản', 'ngân hàng', 'thanh toán', 'hủy đơn', 'giao hàng',
    'vận chuyển', 'quy trình', 'thời gian giao'
  ];

  for (const faq of FAQ_DATA) {
    if (!faq.isActive) continue;

    let score = 0;
    for (const keyword of faq.keywords) {
      const kw = keyword.toLowerCase();
      if (text.includes(kw)) {
        if (corePolicyKeywords.some(cpk => kw.includes(cpk) || cpk.includes(kw))) {
          score += 3;
        } else {
          score += 1.5;
        }
      }
    }

    // Thưởng điểm nếu câu hỏi có từ mang tính quy chế/chính sách
    if (['chính sách', 'quy trình', 'hướng dẫn', 'quy định'].some(w => text.includes(w))) {
      score += 1.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestFaq = faq;
    }
  }

  return bestScore >= 2 ? { faq: bestFaq, score: bestScore } : null;
}

/**
 * Trích xuất các entity có giá trị từ tin nhắn (mã đơn hàng, tên sản phẩm, dáng mặt, ngân sách, so sánh...)
 * @param {string} text 
 * @returns {object}
 */
function extractEntities(text) {
  const entities = {};
  const unaccented = removeAccents(text);

  // 1. Trích xuất mã đơn hàng (LUM-XXXXXXXX-XXXX hoặc LUM-TEST-CONFIRM-02)
  const orderCodeMatch = text.match(/lum-[a-z0-9]+(?:-[a-z0-9]+)+/i);
  if (orderCodeMatch) {
    entities.orderCode = orderCodeMatch[0].toUpperCase();
  }

  // 1b. Trích xuất mã ticket Lumina Care (CARE-YYYYMMDD-XXXX)
  const careTicketMatch = text.match(/care-[a-z0-9]+(?:-[a-z0-9]+)+/i);
  if (careTicketMatch) {
    entities.ticketCode = careTicketMatch[0].toUpperCase();
  }

  // 2. Trích xuất ngân sách (Budget)
  const budget = parseBudgetConstraint(text);
  if (budget.hasBudget) {
    entities.budget = budget;
  }

  // 3. Trích xuất category kính (aviator, cateye, round, square)
  const categories = ['aviator', 'cat-eye', 'cateye', 'mắt mèo', 'phi công', 'round', 'tròn', 'square', 'vuông'];
  for (const cat of categories) {
    const unaccentedCat = removeAccents(cat);
    if (text.includes(cat) || unaccented.includes(unaccentedCat)) {
      if (cat === 'cat-eye' || cat === 'mắt mèo' || cat === 'cateye') entities.category = 'cateye';
      else if (cat === 'aviator' || cat === 'phi công') entities.category = 'aviator';
      else if (cat === 'round' || cat === 'tròn') entities.category = 'round';
      else if (cat === 'square' || cat === 'vuông') entities.category = 'square';
      break;
    }
  }

  // 4. Trích xuất chất liệu
  const materials = ['titanium', 'acetate', 'mạ vàng', '18k', '24k', 'thép không gỉ', 'bạc'];
  for (const mat of materials) {
    const unaccentedMat = removeAccents(mat);
    if (text.includes(mat) || unaccented.includes(unaccentedMat)) {
      entities.material = mat;
      break;
    }
  }

  // 5. Trích xuất dáng mặt theo chuẩn Prompt 05 (Round, Square, Oval, Heart, Diamond, Oblong)
  if (text.includes('mặt tròn') || text.includes('dáng tròn') || unaccented.includes('mat tron') || unaccented.includes('dang tron')) {
    entities.faceShape = 'round';
  } else if (text.includes('mặt vuông') || text.includes('quai hàm') || unaccented.includes('mat vuong') || unaccented.includes('quai ham')) {
    entities.faceShape = 'square';
  } else if (text.includes('trái xoan') || text.includes('oval') || unaccented.includes('trai xoan') || unaccented.includes('trai xoang') || unaccented.includes('xoan')) {
    entities.faceShape = 'oval';
  } else if (text.includes('trái tim') || text.includes('tam giác ngược') || text.includes('heart') || unaccented.includes('trai tim')) {
    entities.faceShape = 'heart';
  } else if (text.includes('kim cương') || text.includes('gò má cao') || text.includes('diamond') || unaccented.includes('kim cuong')) {
    entities.faceShape = 'diamond';
  } else if (text.includes('mặt dài') || text.includes('thon dài') || text.includes('chữ nhật') || text.includes('oblong') || unaccented.includes('mat dai') || unaccented.includes('thon dai') || unaccented.includes('chu nhat')) {
    entities.faceShape = 'oblong';
  }

  // 5b. Trích xuất câu hỏi tư vấn dáng mặt tổng quát (chưa biết dáng mặt của mình)
  const generalFaceKeywords = [
    'không biết mặt', 'chưa biết mặt', 'dáng mặt nào', 'hợp mặt nào',
    'chọn kính theo mặt', 'chọn kính theo khuôn mặt', 'tư vấn theo mặt',
    'khuôn mặt hợp', 'xác định dáng mặt', 'tư vấn dáng mặt', 'tư vấn khuôn mặt',
    'khong biet mat', 'chua biet mat', 'dang mat nao', 'hop mat nao',
    'chon kinh theo mat', 'chon kinh theo khuon mat', 'tu van theo mat', 'tu van khuon mat'
  ];
  if (generalFaceKeywords.some((kw) => text.includes(kw) || unaccented.includes(removeAccents(kw)))) {
    entities.isGeneralFaceAdvice = true;
  }

  // 6. Trích xuất ý định so sánh (Comparison)
  const isComparison = text.includes('so sánh') || text.includes('khác nhau') || text.includes('khác biệt') || text.includes(' versus ') || text.includes(' vs ');
  if (isComparison) {
    entities.isComparison = true;

    // Tìm 2 category được so sánh
    const foundCats = [];
    if (text.includes('aviator') || text.includes('phi công')) foundCats.push('aviator');
    if (text.includes('cat-eye') || text.includes('cateye') || text.includes('mắt mèo')) foundCats.push('cateye');
    if (text.includes('round') || text.includes('gọng tròn')) foundCats.push('round');
    if (text.includes('square') || text.includes('gọng vuông')) foundCats.push('square');

    if (foundCats.length >= 2) {
      entities.compareCategories = [foundCats[0], foundCats[1]];
    }
  }

  // 7. Trích xuất ID sản phẩm cụ thể (lumina-01 -> lumina-08)
  const productMatches = text.match(/lumina-0[1-8]/gi);
  if (productMatches) {
    entities.specificProductIds = productMatches.map((id) => id.toLowerCase());
  }

  // 8. Trích xuất hỏi về tình trạng tồn kho / hết hàng
  if (text.includes('hết hàng') || text.includes('còn hàng') || text.includes('tồn kho')) {
    entities.isStockInquiry = true;
  }

  // 9. Trích xuất yêu cầu hủy hoặc thay đổi đơn hàng (chỉ khi là yêu cầu cụ thể, không phải câu hỏi quy định/chính sách)
  const isPolicyQuery = ['quy định', 'chính sách', 'hướng dẫn', 'thế nào', 'làm sao', 'quy trình'].some(w => text.includes(w));
  if (!isPolicyQuery && (text.includes('hủy đơn') || text.includes('hủy đặt hàng') || text.includes('cancel order') || text.includes('đổi địa chỉ'))) {
    entities.isCancelRequest = true;
  }

  // 10. Trích xuất từ khóa tìm kiếm đặc thù ngoài danh mục kính quang học (Out-of-scope keywords)
  const outOfScopeTerms = ['kính bơi', 'chống nước', 'áp tròng', 'kính vr', 'thực tế ảo', 'gỗ mun'];
  for (const term of outOfScopeTerms) {
    if (text.includes(term)) {
      entities.outOfScopeKeyword = term;
      break;
    }
  }

  return Object.keys(entities).length > 0 ? entities : null;
}

/**
 * Phân loại intent chính cho tin nhắn người dùng.
 * 
 * @param {string} userMessage - Nội dung tin nhắn gốc
 * @param {object|null} [clientContext] - Ngữ cảnh giao diện frontend (pageType, designSpec...)
 * @returns {{ intent: string, confidence: number, matchedFaq: object|null, extractedEntities: object|null }}
 */
export function classifyIntent(userMessage, clientContext = null) {
  const text = userMessage.toLowerCase().trim();

  if (!text || text.length === 0) {
    return { intent: 'unknown', confidence: 0, matchedFaq: null, extractedEntities: null };
  }

  // 1. Trích xuất entities trước
  const entities = extractEntities(text);

  // 2. Nếu người dùng cung cấp mã đơn hàng cụ thể (LUM-...), ưu tiên ORDER intent tuyệt đối
  if (entities?.orderCode) {
    return {
      intent: 'order',
      confidence: 1,
      matchedFaq: null,
      extractedEntities: entities,
    };
  }

  // 2b. Nếu người dùng cung cấp mã ticket chăm sóc Lumina Care cụ thể (CARE-...), ưu tiên AFTERSALES_CARE
  if (entities?.ticketCode) {
    return {
      intent: 'aftersales_care',
      confidence: 1,
      matchedFaq: null,
      extractedEntities: entities,
    };
  }

  // 3. Tìm FAQ match
  const faqResult = findBestFaq(text);

  // 4. Score từng intent
  const intentScores = {};
  for (const [intentName, pattern] of Object.entries(INTENT_PATTERNS)) {
    intentScores[intentName] = scoreIntent(text, pattern);
  }

  // Phân biệt: Nếu hỏi xem lại thiết kế đã đặt mua -> ưu tiên aftersales_design hơn studio editor
  const hasPurchasedKeyword = ['đã đặt mua', 'đã mua', 'đã đặt', 'xem lại'].some(k => text.includes(k));
  const hasDesignKeyword = ['thiết kế', 'bespoke', '3d', 'snapshot', 'bản vẽ'].some(k => text.includes(k));
  if (hasPurchasedKeyword && hasDesignKeyword) {
    intentScores.aftersales_design = (intentScores.aftersales_design || 0) + 8;
    intentScores.studio = Math.max(0, (intentScores.studio || 0) - 6);
  }

  // 5. Xác định intent có score cao nhất
  let bestIntent = 'unknown';
  let bestScore = 0;
  for (const [intentName, score] of Object.entries(intentScores)) {
    if (score > bestScore && score >= INTENT_PATTERNS[intentName].threshold) {
      bestScore = score;
      bestIntent = intentName;
    }
  }

  // 5b. Boost intent khi clientContext xác định rõ pageType (Prompt 07: Context Integration)
  //     Nếu bestIntent vẫn là 'unknown' và pageType rõ ràng → boost sang page intent
  //     Nếu có intent nhưng score yếu (< 4) và pageType match → boost theo page
  if (clientContext?.pageType && bestScore < 4) {
    if (clientContext.pageType === 'studio' && (bestIntent === 'unknown' || intentScores.studio >= 1)) {
      bestIntent = 'studio';
      bestScore = Math.max(bestScore, 3);
    } else if (clientContext.pageType === 'tryon' && (bestIntent === 'unknown' || intentScores.tryon >= 1)) {
      bestIntent = 'tryon';
      bestScore = Math.max(bestScore, 3);
    }
  }

  // 5c. Ưu tiên các intent After-sales Concierge chuyên biệt (Prompt 07)
  const specificAfterSalesIntents = [
    'aftersales_care',
    'aftersales_loyalty',
    'aftersales_review_referral',
    'aftersales_design',
    'human_handover',
    'care_tips',
  ];
  if (specificAfterSalesIntents.includes(bestIntent)) {
    return {
      intent: bestIntent,
      confidence: Math.max(0.8, Math.min(bestScore / 6, 1)),
      matchedFaq: null,
      extractedEntities: entities,
    };
  }

  // 6. FAQ Priority: Nếu tìm thấy FAQ phù hợp và là câu hỏi policy rõ ràng
  // hoặc FAQ score >= bestScore hoặc intent chưa rõ
  const policyTriggers = ['chính sách', 'quy định', 'quy trình', 'bảo hành', 'đổi trả', 'hoàn tiền', 'mấy giờ', 'mở cửa', 'đóng cửa', 'bảo quản', 'vệ sinh', 'lau kính', 'chuyển khoản', 'thanh toán cod'];
  const hasPolicyTrigger = policyTriggers.some((trigger) => text.includes(trigger));

  if (faqResult && (hasPolicyTrigger || faqResult.score >= bestScore || bestIntent === 'unknown')) {
    return {
      intent: 'faq',
      confidence: Math.min(faqResult.score / 5, 1),
      matchedFaq: faqResult.faq,
      extractedEntities: entities,
    };
  }

  // 7. Trả về intent đã xác định
  const confidence = bestScore > 0 ? Math.min(bestScore / 8, 1) : 0;

  return {
    intent: bestIntent,
    confidence,
    matchedFaq: bestIntent === 'unknown' && faqResult ? faqResult.faq : null,
    extractedEntities: entities,
  };
}

export default classifyIntent;

