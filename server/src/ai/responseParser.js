/**
 * Lumina Eyewear — Response Parser & Guardrails
 * 
 * Parse AI response, sanitize output, extract structured data,
 * và enforce post-generation guardrails.
 */

/**
 * Danh sách pattern cần chặn (guardrail post-generation).
 */
const BLOCKED_PATTERNS = [
  /api[_\s-]?key/i,
  /secret[_\s-]?key/i,
  /password/i,
  /database[_\s-]?connection/i,
  /mysql/i,
  /sql\s+query/i,
  /SELECT\s+.+\s+FROM/i,
  /INSERT\s+INTO/i,
  /DROP\s+TABLE/i,
  /process\.env/i,
  /AIzaSy[A-Za-z0-9_-]{20,}/i,
  /sk-[A-Za-z0-9_-]{20,}/i,
];

/**
 * Kiểm tra xem AI response có chứa nội dung nhạy cảm không.
 * @param {string} text 
 * @returns {boolean} true nếu nội dung AN TOÀN
 */
function isSafeContent(text) {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return false;
    }
  }
  return true;
}

/**
 * Trích xuất product cards từ AI response (nếu AI format đặc biệt).
 * AI có thể trả về markdown với pattern [PRODUCT:id] hoặc JSON block.
 * 
 * @param {string} text - Nội dung AI response
 * @returns {number[]} Danh sách product IDs được nhắc đến
 */
function extractProductReferences(text) {
  const ids = [];
  
  // Pattern: [PRODUCT:123] hoặc [SẢN PHẨM:123]
  const productRefPattern = /\[(?:PRODUCT|SẢN PHẨM):(\d+)\]/gi;
  let match;
  while ((match = productRefPattern.exec(text)) !== null) {
    ids.push(parseInt(match[1], 10));
  }

  return ids;
}

/**
 * Trích xuất quick actions được AI gợi ý.
 * Pattern: [ACTION:text] hoặc dạng bullet list "- 👉 text"
 * 
 * @param {string} text 
 * @returns {string[]}
 */
function extractQuickActions(text) {
  const actions = [];
  
  // Pattern: [ACTION:text]
  const actionPattern = /\[ACTION:([^\]]+)\]/gi;
  let match;
  while ((match = actionPattern.exec(text)) !== null) {
    actions.push(match[1].trim());
  }

  return actions;
}

/**
 * Loại bỏ các tag internal markup khỏi text hiển thị cho user.
 * @param {string} text 
 * @returns {string}
 */
function cleanDisplayText(text) {
  return text
    .replace(/\[(?:PRODUCT|SẢN PHẨM):\d+\]/gi, '')
    .replace(/\[ACTION:[^\]]+\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Xác định messageType dựa trên intent và nội dung response.
 * @param {string} intent 
 * @param {string} content 
 * @returns {string}
 */
function determineMessageType(intent, content) {
  switch (intent) {
    case 'faq': return 'faq_response';
    case 'product': return 'product_recommendation';
    case 'order': return 'order_status';
    case 'tryon': return 'tryon_guide';
    case 'studio': return 'studio_info';
    default: return 'text';
  }
}

/**
 * Parse và validate AI response trước khi trả về cho client.
 * 
 * @param {string} rawResponse - Nội dung thô từ AI provider
 * @param {string} intent - Intent đã phân loại
 * @param {object} [context] - Context bổ sung (products, etc.)
 * @returns {{ content: string, messageType: string, metadata: object }}
 */
export function parseAIResponse(rawResponse, intent, context = {}) {
  // Guardrail: kiểm tra nội dung nhạy cảm
  if (!isSafeContent(rawResponse)) {
    return {
      content: 'Xin lỗi quý khách, tôi không thể xử lý yêu cầu này. Quý khách vui lòng liên hệ hotline 1900-LUMINA để được hỗ trợ trực tiếp.',
      messageType: 'error',
      metadata: {
        quickActions: ['Liên hệ hotline', 'Xem sản phẩm', 'Thử kính AI'],
        error: 'content_filtered',
      },
    };
  }

  // Trích xuất structured data
  const productIds = extractProductReferences(rawResponse);
  const quickActions = extractQuickActions(rawResponse);
  const cleanContent = cleanDisplayText(rawResponse);
  const messageType = determineMessageType(intent, cleanContent);

  // Build metadata
  const metadata = {};

  if (quickActions.length > 0) {
    metadata.quickActions = quickActions;
  } else {
    // Default quick actions theo intent
    metadata.quickActions = getDefaultQuickActions(intent);
  }

  if (productIds.length > 0) {
    metadata.referencedProductIds = productIds;
  }

  // Nếu có product cards từ context
  if (context.productCards && context.productCards.length > 0) {
    metadata.productCards = context.productCards;
  }

  return {
    content: cleanContent,
    messageType,
    metadata,
  };
}

/**
 * Quick actions mặc định theo intent khi AI không gợi ý.
 */
function getDefaultQuickActions(intent) {
  switch (intent) {
    case 'product':
      return ['Xem tất cả bộ sưu tập', 'Thử kính AI', 'So sánh sản phẩm'];
    case 'order':
      return ['Chính sách đổi trả', 'Liên hệ CSKH', 'Xem sản phẩm'];
    case 'tryon':
      return ['Thử kính ngay', 'Xem sản phẩm', 'Hướng dẫn PD'];
    case 'studio':
      return ['Vào 3D Atelier', 'Xem bộ sưu tập', 'Bảng giá tùy biến'];
    case 'faq':
      return ['Tư vấn chọn kính', 'Xem sản phẩm', 'Thử kính AI'];
    default:
      return ['Tư vấn chọn kính', 'Tìm sản phẩm', 'Thử kính AI', 'Tra cứu đơn hàng'];
  }
}

/**
 * Tạo response fallback khi AI provider gặp lỗi.
 * @param {string} intent 
 * @param {object|null} matchedFaq 
 * @returns {{ content: string, messageType: string, metadata: object }}
 */
export function buildFallbackResponse(intent, matchedFaq = null) {
  // Nếu có FAQ match, dùng FAQ
  if (matchedFaq) {
    return {
      content: matchedFaq.answer,
      messageType: 'faq_response',
      metadata: {
        faqId: matchedFaq.id,
        faqCategory: matchedFaq.category,
        quickActions: getDefaultQuickActions('faq'),
      },
    };
  }

  // Fallback chung
  return {
    content: 'Xin lỗi quý khách, hệ thống tư vấn AI đang tạm bận. Quý khách vui lòng thử lại sau giây lát hoặc liên hệ hotline **1900-LUMINA** để được hỗ trợ ngay.',
    messageType: 'error',
    metadata: {
      quickActions: ['Thử lại', 'Liên hệ hotline', 'Xem sản phẩm'],
      error: 'ai_unavailable',
    },
  };
}

export default { parseAIResponse, buildFallbackResponse };

