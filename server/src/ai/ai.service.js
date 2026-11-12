/**
 * Lumina Eyewear — AI Orchestrator Service
 * 
 * Quản lý luồng xử lý tin nhắn kết hợp (Hybrid Engine):
 * Tier 1: Rule-based FAQ (phản hồi ngay lập tức, không tốn token/latency)
 * Tier 2: Domain-specific Handlers (sản phẩm, đơn hàng từ MySQL + AI augment)
 * Tier 3: LLM Provider (Gemini / OpenAI cho hội thoại tự nhiên)
 * Fallback: Graceful degradation về FAQ / tin nhắn thông báo an toàn
 */

import { pool } from '../config/database.js';
import { classifyIntent } from './intentClassifier.js';
import { createAIProvider } from './aiProvider.factory.js';
import { buildSystemPrompt, formatMessageHistory } from './promptBuilder.js';
import { parseAIResponse, buildFallbackResponse } from './responseParser.js';
import {
  searchProducts,
  getProductDetails,
  getProductStock,
  compareProducts,
  compareCategories,
  getProductsByPriceRange,
  getProductsByFaceShape,
  mapProductToCard,
} from './productTools.js';
import {
  ORDER_STATUS_MAP,
  maskPII,
  lookupOrderWithSecurity,
  formatOrderDetailsResponse,
  handleCancelOrModifyRequest,
} from './orderAdvisor.js';
import {
  explainDesignSpec,
  guideStudioComponent,
  buildTryOnGuide,
  explainPDMeasurement,
} from './studioAdvisor.js';
import {
  handleAfterSalesCare,
  handleAfterSalesLoyalty,
  handleReviewAndReferralGuidance,
  handlePurchasedDesignInquiry,
  handleHumanHandover,
  handleEyewearCareTips,
} from './afterSalesAdvisor.js';

/**
 * Lấy danh sách sản phẩm active từ MySQL database.
 * @param {object} [filters]
 * @param {string} [filters.category]
 * @param {number} [filters.limit=4]
 * @returns {Promise<object[]>}
 */
async function fetchCatalogProducts(filters = {}) {
  try {
    const limit = filters.limit || 4;
    let query = `
      SELECT id, name, category, category_label, price, original_price, stock, frame_material, image_url
      FROM products
      WHERE is_active = 1
    `;
    const params = [];

    if (filters.category) {
      query += ` AND category = ?`;
      params.push(filters.category);
    }

    query += ` LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error('[AIService] Error fetching products:', error.message);
    return [];
  }
}

/**
 * Format danh sách sản phẩm thành Product Cards cho UI.
 * @param {object[]} products 
 * @returns {object[]}
 */
function mapProductsToCards(products) {
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    categoryLabel: p.category_label || p.category,
    price: parseFloat(p.price),
    originalPrice: p.original_price ? parseFloat(p.original_price) : null,
    stock: p.stock,
    image: p.image_url,
    frameMaterial: p.frame_material,
    actionUrl: '/catalog',
    tryOnUrl: `/try-on?model=${p.category}`,
  }));
}

/**
 * Tra cứu đơn hàng an toàn (với IDOR protection).
 * @param {string} orderCode 
 * @param {object} user 
 * @returns {Promise<{ found: boolean, allowed: boolean, order?: object }>}
 */
async function fetchOrderSafely(orderCode, user) {
  try {
    const [rows] = await pool.query(
      `SELECT id, order_code, user_id, customer_name, total_amount, status, payment_status, created_at
       FROM orders
       WHERE order_code = ?
       LIMIT 1`,
      [orderCode]
    );

    if (rows.length === 0) {
      return { found: false, allowed: false };
    }

    const order = rows[0];

    // IDOR Protection: Khách chỉ xem được đơn của mình, Admin xem được tất cả
    const isOwner = user && order.user_id === user.id;
    const isAdmin = user && user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return { found: true, allowed: false };
    }

    return { found: true, allowed: true, order };
  } catch (error) {
    console.error('[AIService] Error fetching order:', error.message);
    return { found: false, allowed: false };
  }
}

/**
 * Lấy đơn hàng mới nhất của người dùng hiện tại.
 * @param {string} userId 
 * @returns {Promise<object|null>}
 */
async function fetchLatestUserOrder(userId) {
  try {
    const [rows] = await pool.query(
      `SELECT id, order_code, user_id, customer_name, total_amount, status, payment_status, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('[AIService] Error fetching latest order:', error.message);
    return null;
  }
}

/**
 * Gọi AI Provider với cơ chế timeout và retry an toàn.
 * @param {object} provider 
 * @param {object} payload 
 * @returns {Promise<string>}
 */
async function callAIWithRetry(provider, payload, maxRetries = 1) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await provider.generateResponse(payload);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`[AIService] AI call attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt < maxRetries) {
        // Wait 300ms before quick retry
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  throw lastError;
}

/**
 * Hàm trung tâm xử lý tin nhắn và sinh phản hồi trợ lý Lumina AI.
 * 
 * @param {object} options
 * @param {string} options.content - Tin nhắn người dùng
 * @param {object|null} [options.user] - Thông tin user nếu đã login
 * @param {object|null} [options.clientContext] - Context từ phía frontend (URL, active product...)
 * @param {object[]} [options.history=[]] - Lịch sử tin nhắn gần nhất trong session
 * @returns {Promise<{ content: string, messageType: string, metadata: object }>}
 */
export async function generateLuminaResponse({ content, user = null, clientContext = null, history = [] }) {
  // 1. Phân loại intent từ tin nhắn
  //    clientContext được dùng để nâng mức ưu tiên intent khi đang ở trang studio/tryon
  const rawClassification = classifyIntent(content, clientContext);
  let { intent, confidence, matchedFaq, extractedEntities } = rawClassification;

  // Nâng mức ưu tiên intent theo pageType (Prompt 07: Context Integration)
  if (clientContext?.pageType === 'studio') {
    const studioKeywords = ['tròng kính', 'độ truyền sáng', 'opacity', 'metalness', 'roughness', 'thiết kế', 'gọng', 'màu', 'khắc', 'đá', 'charm', 'bảng giá', 'tùy biến', 'tùy chỉnh', 'atelier', 'cái này'];
    if (intent === 'unknown' || (intent === 'product' && studioKeywords.some(kw => content.toLowerCase().includes(kw)))) {
      intent = 'studio';
      confidence = 0.7;
    }
  } else if (clientContext?.pageType === 'tryon') {
    const faceStylistKeywords = ['dáng mặt', 'khuôn mặt', 'mặt tròn', 'mặt vuông', 'trái xoan', 'gợi ý gọng', 'phù hợp', 'thử kính', 'camera', 'hướng dẫn', 'làm thế nào'];
    if (intent === 'unknown' || (intent === 'product' && faceStylistKeywords.some(kw => content.toLowerCase().includes(kw)))) {
      intent = 'tryon';
      confidence = 0.7;
    }
  }

  // 2. Kiểm tra AI Provider khả dụng
  const aiProvider = createAIProvider();

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 1: RULE-BASED FAQ (Ưu tiên FAQ đã được duyệt, chính xác 100%)
  // ─────────────────────────────────────────────────────────────────────────────
  if (intent === 'faq' && matchedFaq) {
    return {
      content: matchedFaq.answer,
      messageType: 'faq_response',
      metadata: {
        faqId: matchedFaq.id,
        faqCategory: matchedFaq.category,
        confidence,
        quickActions: [
          'Tư vấn chọn kính',
          'Tìm sản phẩm',
          'Thử kính AI',
          'Khám phá 3D Atelier',
        ],
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: PRODUCT INTENT (Dữ liệu sản phẩm từ MySQL — Prompt 05)
  // ─────────────────────────────────────────────────────────────────────────────
  if (intent === 'product') {
    // 1. Phân loại trường hợp: SO SÁNH SẢN PHẨM / KIỂU DÁNG (Comparison)
    if (extractedEntities?.isComparison) {
      // 1a. So sánh 2 category (Ví dụ: Aviator vs Cat-Eye)
      if (extractedEntities.compareCategories && extractedEntities.compareCategories.length >= 2) {
        const [catA, catB] = extractedEntities.compareCategories;
        const comparison = await compareCategories(catA, catB);
        if (comparison) {
          const { profileA, profileB, sampleProducts } = comparison;
          const content = `Dạ, dưới đây là so sánh chi tiết giữa hai phong cách **${profileA.name}** và **${profileB.name}**:\n\n` +
            `✦ **${profileA.name}**:\n` +
            `  • **Phong cách**: ${profileA.vibe}\n` +
            `  • **Chất liệu chủ đạo**: ${profileA.materials}\n` +
            `  • **Dáng mặt phù hợp**: ${profileA.suitableFaces.join(', ')}\n` +
            `  • **Ưu điểm quang học**: ${profileA.opticalAdvantage}\n\n` +
            `✦ **${profileB.name}**:\n` +
            `  • **Phong cách**: ${profileB.vibe}\n` +
            `  • **Chất liệu chủ đạo**: ${profileB.materials}\n` +
            `  • **Dáng mặt phù hợp**: ${profileB.suitableFaces.join(', ')}\n` +
            `  • **Ưu điểm quang học**: ${profileB.opticalAdvantage}\n\n` +
            `*Lưu ý: Đây là những gợi ý phong cách nhãn khoa giúp quý khách định hình gu thẩm mỹ cá nhân. Quý khách có thể thử trực tiếp qua tính năng **Thử kính AI**.*`;

          return {
            content,
            messageType: 'product_comparison',
            metadata: {
              productCards: sampleProducts,
              quickActions: [`Thử kính ${profileA.name}`, `Thử kính ${profileB.name}`, 'Xem toàn bộ Catalog'],
            },
          };
        }
      }

      // 1b. So sánh 2 mã sản phẩm cụ thể (Ví dụ: lumina-01 và lumina-02)
      if (extractedEntities.specificProductIds && extractedEntities.specificProductIds.length >= 2) {
        const { comparedProducts } = await compareProducts(extractedEntities.specificProductIds);
        if (comparedProducts.length >= 2) {
          const p1 = comparedProducts[0];
          const p2 = comparedProducts[1];
          const content = `So sánh chi tiết giữa **${p1.name}** và **${p2.name}**:\n\n` +
            `✦ **${p1.name}**:\n` +
            `  • Giá: **${p1.price.toLocaleString('vi-VN')}đ**${p1.originalPrice ? ` (Gốc: ${p1.originalPrice.toLocaleString('vi-VN')}đ)` : ''}\n` +
            `  • Kiểu dáng: ${p1.categoryLabel}\n` +
            `  • Chất liệu: ${p1.frameMaterial || 'Titanium cao cấp'}\n` +
            `  • Tồn kho: ${p1.stock > 0 ? `Còn hàng (${p1.stock} sản phẩm)` : 'Tạm hết hàng'}\n\n` +
            `✦ **${p2.name}**:\n` +
            `  • Giá: **${p2.price.toLocaleString('vi-VN')}đ**${p2.originalPrice ? ` (Gốc: ${p2.originalPrice.toLocaleString('vi-VN')}đ)` : ''}\n` +
            `  • Kiểu dáng: ${p2.categoryLabel}\n` +
            `  • Chất liệu: ${p2.frameMaterial || 'Titanium cao cấp'}\n` +
            `  • Tồn kho: ${p2.stock > 0 ? `Còn hàng (${p2.stock} sản phẩm)` : 'Tạm hết hàng'}\n\n` +
            `Quý khách có thể bấm nút **Thử kính** bên dưới để trải nghiệm thực tế trên gương mặt qua camera.`;

          return {
            content,
            messageType: 'product_comparison',
            metadata: {
              productCards: comparedProducts,
              quickActions: ['Thử kính AI', 'Xem giỏ hàng', 'Tư vấn dáng mặt'],
            },
          };
        }
      }
    }

    // 2. Phân loại trường hợp: TƯ VẤN DÁNG MẶT (Face Shape Styling — Prompt 05)
    if (extractedEntities?.faceShape) {
      const { stylingAdvice, recommendedProducts } = await getProductsByFaceShape(extractedEntities.faceShape, { inStockOnly: true, limit: 3 });
      
      const content = `Dạ, tư vấn dáng kính cho **${stylingAdvice.label}**:\n\n` +
        `✦ **Đặc điểm gương mặt**: ${stylingAdvice.description}\n` +
        `✦ **Kiểu gọng gợi ý**: ${stylingAdvice.recommendedLabels.join(', ')}\n` +
        `✦ **Cơ sở tạo phong cách**: ${stylingAdvice.styleRationale}\n` +
        `✦ **Lưu ý**: ${stylingAdvice.considerations}\n\n` +
        `*Gợi ý trên mang tính tham khảo thẩm mỹ và phong cách nhãn khoa, không phải quy chuẩn tuyệt đối. Quý khách hãy tự tin lựa chọn thiết kế thể hiện trọn vẹn cá tính riêng.*`;

      return {
        content,
        messageType: 'styling_advice',
        metadata: {
          faceShape: stylingAdvice.id,
          productCards: recommendedProducts,
          quickActions: stylingAdvice.quickActions,
        },
      };
    }

    // 2b. Phân loại trường hợp: TƯ VẤN DÁNG MẶT TỔNG QUÁT (Khi khách chưa rõ dáng mặt của mình)
    if (extractedEntities?.isGeneralFaceAdvice) {
      const sampleProducts = await fetchCatalogProducts({ limit: 3 });
      const content = `Dạ, để tìm chiếc kính hoàn hảo tôn vinh đường nét riêng, nguyên tắc vàng trong nghệ thuật nhãn khoa Lumina là **tạo sự cân bằng đối lập**:\n\n` +
        `✦ **Mặt trái xoan**: Tỉ lệ vàng cân đối lý tưởng, phù hợp hầu hết mọi dáng kính, đặc biệt quyến rũ với **Cat-Eye** kiêu kỳ.\n` +
        `✦ **Mặt tròn**: Nên chọn gọng **Vuông (Square)** hoặc **Aviator giọt nước** để tạo góc cạnh giúp gương mặt thon gọn.\n` +
        `✦ **Mặt vuông**: Gọng **Tròn (Round)** hoặc oval mềm mại làm dịu đường viền quai hàm sắc sảo.\n` +
        `✦ **Mặt trái tim**: Gọng **Aviator** hoặc **Round** thanh mảnh giúp hài hòa vầng trán rộng và cằm thon.\n` +
        `✦ **Mặt dài**: Gọng **Vuông bản rộng** hoặc **Tròn lớn** tạo chiều sâu cân đối.\n\n` +
        `Quý khách có thể chọn dáng mặt cụ thể bên dưới để xem gợi ý chi tiết, hoặc mở tính năng **Thử kính AI** để camera tự động nhận diện dáng mặt chính xác!`;

      return {
        content,
        messageType: 'styling_advice',
        metadata: {
          productCards: mapProductsToCards(sampleProducts),
          quickActions: ['Mặt trái xoan', 'Mặt tròn', 'Mặt vuông', 'Thử kính AI phân tích'],
        },
      };
    }

    // 3. Phân loại trường hợp: TƯ VẤN THEO NGÂN SÁCH (Budget Constraint — Prompt 05)
    if (extractedEntities?.budget?.hasBudget) {
      const budget = extractedEntities.budget;
      const { products, totalFound } = await getProductsByPriceRange({
        minPrice: budget.minPrice,
        maxPrice: budget.maxPrice,
        inStockOnly: true,
        limit: 4,
      });

      if (totalFound > 0) {
        let budgetDesc = '';
        if (budget.maxPrice && budget.minPrice > 0) {
          budgetDesc = `từ ${budget.minPrice.toLocaleString('vi-VN')}đ đến ${budget.maxPrice.toLocaleString('vi-VN')}đ`;
        } else if (budget.maxPrice) {
          budgetDesc = `dưới ${budget.maxPrice.toLocaleString('vi-VN')}đ`;
        } else {
          budgetDesc = `từ ${budget.minPrice.toLocaleString('vi-VN')}đ trở lên`;
        }

        const productBullets = products.map((p) => 
          `✦ **${p.name}** — Giá: **${p.price.toLocaleString('vi-VN')}đ** (${p.categoryLabel})\n` +
          `  • Điểm nổi bật: ${p.frameMaterial || 'Chất liệu cao cấp'}, tồn kho ${p.stock} chiếc.`
        ).join('\n\n');

        const content = `Với mức ngân sách **${budgetDesc}**, Lumina trân trọng gợi ý các thiết kế kính mắt thượng lưu phù hợp:\n\n` +
          `${productBullets}\n\n` +
          `Mọi sản phẩm đều đi kèm hộp Atelier sang trọng, khăn lau microfiber và thẻ bảo hành chính hãng 12 tháng.`;

        return {
          content,
          messageType: 'budget_recommendation',
          metadata: {
            budget,
            productCards: products,
            quickActions: ['Xem tất cả sản phẩm', 'Thử kính AI', 'Tư vấn dáng mặt'],
          },
        };
      } else {
        // Trường hợp không có sản phẩm trong khoảng ngân sách này
        let budgetDesc = budget.maxPrice ? `dưới ${budget.maxPrice.toLocaleString('vi-VN')}đ` : `từ ${budget.minPrice.toLocaleString('vi-VN')}đ`;
        return {
          content: `Rất tiếc, Lumina hiện chưa có mẫu kính nào trong khoảng giá **${budgetDesc}**. Bộ sưu tập kính mắt thủ công của Lumina hiện có mức giá từ **1.950.000đ** đến **3.450.000đ**.\n\nQuý khách có thể tham khảo mẫu kính **Aura Minimalist Round** (1.950.000đ) — thiết kế thanh lịch với mức giá dễ tiếp cận nhất tại Lumina.`,
          messageType: 'product_recommendation',
          metadata: {
            quickActions: ['Xem mẫu giá tốt nhất', 'Toàn bộ bộ sưu tập', 'Chính sách bảo hành'],
          },
        };
      }
    }

    // 4. Phân loại trường hợp: HỎI VỀ TỒN KHO / TÌNH TRẠNG HÀNG (Stock Inquiry)
    if (extractedEntities?.isStockInquiry && extractedEntities?.specificProductIds && extractedEntities.specificProductIds.length > 0) {
      const productId = extractedEntities.specificProductIds[0];
      const stockInfo = await getProductStock(productId);

      if (stockInfo.found) {
        if (stockInfo.inStock) {
          const product = await getProductDetails(productId);
          return {
            content: `Sản phẩm **${stockInfo.name}** hiện **còn hàng** tại showroom Lumina Atelier (Số lượng: **${stockInfo.stock}** sản phẩm). Giá niêm yết: **${stockInfo.price.toLocaleString('vi-VN')}đ**.\n\nQuý khách có thể đặt hàng trực tuyến ngay hoặc sử dụng tính năng **Thử kính AI** để ướm thử trên khuôn mặt.`,
            messageType: 'stock_info',
            metadata: {
              productCards: [mapProductToCard(product)],
              quickActions: ['Thêm vào giỏ hàng', 'Thử kính AI', 'Xem sản phẩm khác'],
            },
          };
        } else {
          // Out of stock case
          const altProducts = await searchProducts({ inStockOnly: true, limit: 2 });
          return {
            content: `Sản phẩm **${stockInfo.name}** hiện đang **tạm hết hàng** do số lượng chế tác thủ công có hạn. Đội ngũ nghệ nhân Lumina đang tiến hành bổ sung đợt sản phẩm mới.\n\nQuý khách có thể tham khảo các thiết kế cùng phong cách hiện đang có sẵn bên dưới:`,
            messageType: 'stock_info',
            metadata: {
              productCards: altProducts.map(mapProductToCard),
              quickActions: ['Đăng ký nhận thông báo', 'Xem mẫu có sẵn', 'Tư vấn kiểu dáng'],
            },
          };
        }
      }
    }

    // 5. Tìm kiếm sản phẩm theo category hoặc từ khóa (General Search / Catalog Recommendation)
    const categoryFilter = extractedEntities?.category || null;
    const materialFilter = extractedEntities?.material || null;
    const keywordFilter = extractedEntities?.outOfScopeKeyword || null;
    const products = await searchProducts({
      keyword: keywordFilter,
      category: categoryFilter,
      material: materialFilter,
      inStockOnly: true,
      limit: 3,
    });

    if (products.length === 0) {
      // Trường hợp tìm kiếm không có kết quả
      return {
        content: `Rất tiếc, Lumina không tìm thấy sản phẩm nào phù hợp với yêu cầu "${content}". Bộ sưu tập Lumina Atelier hiện tập trung vào 4 dòng kính quang học cao cấp: **Aviator (Phi công)**, **Cat-Eye (Mắt mèo)**, **Round (Gọng tròn)** và **Square (Gọng vuông)**.\n\nQuý khách có thể khám phá toàn bộ bộ sưu tập hoặc nhờ tôi tư vấn dáng kính theo khuôn mặt.`,
        messageType: 'product_recommendation',
        metadata: {
          quickActions: ['Xem tất cả sản phẩm', 'Tư vấn theo dáng mặt', 'Thử kính AI'],
        },
      };
    }

    const productCards = products.map(mapProductToCard);

    // Nếu có AI Provider: Gọi AI sinh lời tư vấn chuyên sâu dựa trên sản phẩm thật từ MySQL
    if (aiProvider) {
      try {
        const systemPrompt = buildSystemPrompt({
          intent: 'product',
          products,
          userInfo: user,
          messageHistory: history,
        });
        const formattedHistory = formatMessageHistory(history, 6);

        const aiRaw = await callAIWithRetry(aiProvider, {
          systemPrompt,
          userMessage: content,
          messageHistory: formattedHistory,
        });

        const parsed = parseAIResponse(aiRaw, 'product', { productCards });
        return parsed;
      } catch (err) {
        console.warn('[AIService] Product AI generation failed, falling back to curated cards:', err.message);
      }
    }

    // Fallback Product (khi không có AI hoặc AI lỗi)
    return {
      content: 'Dưới đây là một số thiết kế kính mắt cao cấp nổi bật từ bộ sưu tập Lumina Atelier:',
      messageType: 'product_recommendation',
      metadata: {
        productCards,
        quickActions: ['Xem tất cả bộ sưu tập', 'Gọng Titanium siêu nhẹ', 'Khám phá 3D Atelier'],
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: ORDER INTENT (Tra cứu đơn hàng và Chăm sóc khách hàng — Prompt 06)
  // ─────────────────────────────────────────────────────────────────────────────
  if (intent === 'order') {
    const orderCode = extractedEntities?.orderCode || null;

    // 1. Xử lý yêu cầu Hủy hoặc Thay đổi đơn hàng (Guardrails: AI không tự đổi DB)
    if (extractedEntities?.isCancelRequest) {
      return await handleCancelOrModifyRequest({ orderCode, user });
    }

    // 2. Guest User -> Yêu cầu đăng nhập vì bảo mật đơn hàng
    if (!user) {
      return {
        content: 'Vì lý do bảo mật thông tin đơn hàng cá nhân, quý khách vui lòng đăng nhập tài khoản Lumina để tra cứu hành trình chế tác và vận chuyển chi tiết.',
        messageType: 'auth_required',
        metadata: {
          quickActions: ['Đăng nhập tài khoản', 'Chính sách bảo hành', 'Showroom Lumina'],
        },
      };
    }

    // 3. Customer đã đăng nhập -> Kiểm tra nếu có mã đơn trong câu hỏi
    if (orderCode) {
      const lookup = await lookupOrderWithSecurity(orderCode, user);

      if (lookup.status === 'NOT_FOUND') {
        return {
          content: `Lumina không tìm thấy đơn hàng nào có mã **${orderCode}**. Quý khách vui lòng kiểm tra lại định dạng mã đơn hàng trong email xác nhận đặt hàng.`,
          messageType: 'order_status',
          metadata: {
            orderCode,
            status: 'not_found',
            quickActions: ['Xem đơn hàng của tôi', 'Liên hệ Hotline 1900-LUMINA'],
          },
        };
      }

      if (lookup.status === 'FORBIDDEN') {
        // IDOR Blocked: Đơn hàng tồn tại nhưng không thuộc về user này
        return {
          content: `Rất tiếc, thông tin đơn hàng **${orderCode}** không thuộc quyền sở hữu của tài khoản hiện tại. Vì lý do bảo mật thông tin khách hàng, Lumina chỉ hiển thị các đơn hàng do chính quý khách đặt.`,
          messageType: 'order_status',
          metadata: {
            orderCode,
            status: 'forbidden',
            quickActions: ['Xem đơn hàng của tôi', 'Chính sách bảo mật'],
          },
        };
      }

      if (lookup.status === 'DB_ERROR') {
        // Connection lost / database error fallback
        return {
          content: 'Xin lỗi quý khách, hệ thống tra cứu đơn hàng của Lumina đang tạm gián đoạn kết nối. Quý khách vui lòng thử lại sau giây lát hoặc liên hệ trực tiếp hotline **1900-LUMINA** để được hỗ trợ kiểm tra ngay lập tức.',
          messageType: 'error',
          metadata: {
            orderCode,
            error: 'db_connection_error',
            quickActions: ['Thử tra cứu lại', 'Hotline 1900-LUMINA', 'Xem bộ sưu tập'],
          },
        };
      }

      // Đơn hàng hợp lệ và được phép truy cập
      const order = lookup.order;

      // Nếu có AI Provider: Gọi AI sinh phản hồi tự nhiên kèm guardrail không sửa data, không bịa shipping
      if (aiProvider) {
        try {
          const systemPrompt = buildSystemPrompt({
            intent: 'order',
            orderInfo: order,
            userInfo: user,
            messageHistory: history,
          });
          const formattedHistory = formatMessageHistory(history, 4);

          const aiRaw = await callAIWithRetry(aiProvider, {
            systemPrompt,
            userMessage: content,
            messageHistory: formattedHistory,
          });

          return parseAIResponse(aiRaw, 'order');
        } catch (err) {
          console.warn('[AIService] Order AI failed, falling back to structured info:', err.message);
        }
      }

      // Fallback khi không có AI: Sử dụng formatOrderDetailsResponse chuẩn hóa theo Prompt 06
      return formatOrderDetailsResponse(order, user);
    }

    // 4. Chưa cung cấp mã đơn -> Tìm đơn gần nhất của khách
    const latestOrder = await fetchLatestUserOrder(user.id);
    if (latestOrder) {
      const statusConfig = ORDER_STATUS_MAP[latestOrder.status];
      const statusLabel = statusConfig ? statusConfig.label : latestOrder.status.toUpperCase();

      return {
        content: `Chào quý khách ${user.name || ''}! Đơn hàng gần nhất của quý khách là **${latestOrder.order_code}** (Trạng thái: **${statusLabel}**).\n\nQuý khách có thể gửi mã đơn hàng này hoặc cung cấp mã đơn khác để Lumina kiểm tra tiến độ chi tiết nhé.`,
        messageType: 'order_status',
        metadata: {
          orderCode: latestOrder.order_code,
          status: latestOrder.status,
          statusLabel,
          quickActions: ['Xem chi tiết đơn này', 'Chính sách bảo hành', 'Liên hệ CSKH'],
        },
      };
    }

    return {
      content: `Chào quý khách ${user.name || ''}! Quý khách vui lòng cung cấp mã đơn hàng (định dạng **LUM-XXXXXXXX-XXXX**) để Lumina kiểm tra tiến độ ngay nhé.`,
      messageType: 'order_status',
      metadata: {
        quickActions: ['Chính sách giao hàng', 'Xem bộ sưu tập mới', 'Hotline 1900-LUMINA'],
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: TRY-ON INTENT (Hướng dẫn thử kính AI — Prompt 07)
  // ─────────────────────────────────────────────────────────────────────────────
  if (intent === 'tryon') {
    const lowerContent = content.toLowerCase();

    // Phân nhánh theo câu hỏi cụ thể
    const isPDQuestion = lowerContent.includes('pd') || lowerContent.includes('khoảng cách đồng tử') || lowerContent.includes('pupillary');
    const isFaceStylistQuestion = lowerContent.includes('face stylist') || lowerContent.includes('dáng mặt') || lowerContent.includes('nhận diện mặt');
    const isCameraQuestion = lowerContent.includes('camera') || lowerContent.includes('quyền') || lowerContent.includes('bật');
    const isShapeAdviceQuestion = lowerContent.includes('gợi ý') || lowerContent.includes('phù hợp') || lowerContent.includes('kiểu gọng');

    // Trường hợp đặc thù: giải thích PD
    if (isPDQuestion) {
      return {
        content: explainPDMeasurement(),
        messageType: 'tryon_guide',
        metadata: {
          quickActions: ['Mở AI Try-On', 'Thử kính ngay', 'Xem bộ sưu tập'],
        },
      };
    }

    // Trường hợp đặc thù: Face Stylist với ngữ cảnh dáng mặt từ frontend
    if ((isFaceStylistQuestion || isShapeAdviceQuestion) && clientContext?.detectedFaceShape) {
      const tryOnGuide = buildTryOnGuide({
        detectedFaceShape: clientContext.detectedFaceShape,
        activeFrameModel: clientContext.activeFrameModel || null,
      });
      return {
        content: tryOnGuide,
        messageType: 'face_stylist_advice',
        metadata: {
          detectedFaceShape: clientContext.detectedFaceShape,
          quickActions: ['Chọn gọng phù hợp', 'Mở 3D Atelier', 'Xem sản phẩm gợi ý'],
        },
      };
    }

    // Trường hợp tổng quát: hướng dẫn Try-On
    if (aiProvider) {
      try {
        const systemPrompt = buildSystemPrompt({
          intent: 'tryon',
          userInfo: user,
          messageHistory: history,
          clientContext,
        });
        const formattedHistory = formatMessageHistory(history, 4);

        const aiRaw = await callAIWithRetry(aiProvider, {
          systemPrompt,
          userMessage: content,
          messageHistory: formattedHistory,
        });

        return parseAIResponse(aiRaw, 'tryon');
      } catch (err) {
        console.warn('[AIService] Tryon AI failed, falling back:', err.message);
      }
    }

    // Fallback: hướng dẫn tĩnh từ studioAdvisor
    const tryOnFallback = buildTryOnGuide({
      detectedFaceShape: clientContext?.detectedFaceShape || null,
      activeFrameModel: clientContext?.activeFrameModel || null,
    });

    return {
      content: tryOnFallback,
      messageType: 'tryon_guide',
      metadata: {
        quickActions: ['Mở Camera thử kính', 'Phân tích dáng mặt AI', 'Xem bộ sưu tập'],
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: STUDIO INTENT (3D Bespoke Atelier — Prompt 07)
  // ─────────────────────────────────────────────────────────────────────────────
  if (intent === 'studio') {
    const lowerContent = content.toLowerCase();

    // Phân nhánh theo thành phần hỏi cụ thể
    const componentKeywords = {
      model: ['kiểu gọng', 'base model', 'aviator', 'cat-eye', 'round', 'square', 'mô hình'],
      frame: ['màu gọng', 'frame color', 'metalness', 'roughness', 'chất liệu', 'bề mặt'],
      lens: ['tròng kính', 'lens', 'opacity', 'độ truyền sáng', 'màu tròng'],
      rhinestone: ['rhinestone', 'đính đá', 'swarovski', 'tinh thể'],
      charm: ['charm', 'trang trí', 'phụ kiện'],
      engraving: ['khắc', 'laser', 'engraving', 'khắc tên', 'khắc chữ'],
      price: ['giá', 'chi phí', 'bao nhiêu', 'bảng giá', 'tổng tiền'],
    };

    let matchedComponent = null;
    for (const [comp, keywords] of Object.entries(componentKeywords)) {
      if (keywords.some((kw) => lowerContent.includes(kw))) {
        matchedComponent = comp;
        break;
      }
    }

    // Nếu có designSpec từ context và hỏi về thiết kế hiện tại
    const isAskingCurrentDesign = lowerContent.includes('thiết kế') || lowerContent.includes('hiện tại') ||
      lowerContent.includes('đang chọn') || lowerContent.includes('design spec') || lowerContent.includes('tùy chỉnh');

    if (isAskingCurrentDesign && clientContext?.designSpec) {
      const designExplanation = explainDesignSpec(clientContext.designSpec, clientContext.customPrice);
      return {
        content: designExplanation,
        messageType: 'studio_info',
        metadata: {
          designSpec: clientContext.designSpec,
          customPrice: clientContext.customPrice,
          quickActions: ['Thay đổi kiểu gọng', 'Chỉnh màu gọng', 'Thêm tùy chỉnh', 'Thêm vào giỏ'],
        },
      };
    }

    // Hướng dẫn thành phần cụ thể
    if (matchedComponent) {
      return {
        content: guideStudioComponent(matchedComponent),
        messageType: 'studio_info',
        metadata: {
          guideComponent: matchedComponent,
          quickActions: ['Chỉnh kiểu gọng', 'Chỉnh màu tròng kính', 'Bảng giá tùy biến', 'Mở 3D Atelier'],
        },
      };
    }

    // Trường hợp khách hỏi về thử kính từ Studio: điều hướng sang Try-On
    if (lowerContent.includes('thử kính') || lowerContent.includes('try on') || lowerContent.includes('camera')) {
      return {
        content: `Để ướm thử gọng kính lên khuôn mặt qua camera, quý khách có thể chuyển sang tính năng **AI Virtual Try-On**.\n\nDesign 3D hiện tại sẽ được giữ nguyên — quý khách có thể quay lại Atelier để tiếp tục tùy chỉnh bất cứ lúc nào.`,
        messageType: 'navigation_suggestion',
        metadata: {
          suggestedAction: 'open_tryon',
          tryOnUrl: '/try-on',
          quickActions: ['Mở AI Try-On', 'Tiếp tục trong Atelier', 'Thêm vào giỏ hàng'],
        },
      };
    }

    if (aiProvider) {
      try {
        const systemPrompt = buildSystemPrompt({
          intent: 'studio',
          userInfo: user,
          messageHistory: history,
          clientContext,
        });
        const formattedHistory = formatMessageHistory(history, 4);

        const aiRaw = await callAIWithRetry(aiProvider, {
          systemPrompt,
          userMessage: content,
          messageHistory: formattedHistory,
        });

        return parseAIResponse(aiRaw, 'studio');
      } catch (err) {
        console.warn('[AIService] Studio AI failed, falling back:', err.message);
      }
    }

    // Fallback Studio
    const designFallback = clientContext?.designSpec
      ? explainDesignSpec(clientContext.designSpec, clientContext.customPrice)
      : `Không gian **3D Bespoke Atelier** cho phép quý khách cá nhân hóa độc bản:\n\n✦ Tùy chọn chất liệu Titanium hàng không hoặc mạ vàng 18K.\n✦ Tùy chỉnh màu sắc và độ truyền quang của tròng kính.\n✦ Đính đá Swarovski, gắn Charm may mắn và khắc tên riêng bằng laser trên gọng kính.`;

    return {
      content: designFallback,
      messageType: 'studio_info',
      metadata: {
        quickActions: ['Vào phòng 3D Atelier', 'Bảng giá tùy biến 3D', 'Xem mẫu có sẵn'],
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 2: AFTER-SALES CONCIERGE INTENTS (Prompt 07)
  // ─────────────────────────────────────────────────────────────────────────────
  if (intent === 'aftersales_care') {
    return handleAfterSalesCare({ user, extractedEntities, content });
  }

  if (intent === 'aftersales_loyalty') {
    return handleAfterSalesLoyalty({ user, extractedEntities, content });
  }

  if (intent === 'aftersales_review_referral') {
    return handleReviewAndReferralGuidance({ user, content });
  }

  if (intent === 'aftersales_design') {
    return handlePurchasedDesignInquiry({ user });
  }

  if (intent === 'human_handover') {
    return handleHumanHandover();
  }

  if (intent === 'care_tips') {
    return handleEyewearCareTips();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TIER 3: AI NATURAL CONVERSATION / UNKNOWN INTENT
  // ─────────────────────────────────────────────────────────────────────────────
  if (aiProvider) {
    try {
      const systemPrompt = buildSystemPrompt({
        intent: 'unknown',
        userInfo: user,
        messageHistory: history,
      });
      const formattedHistory = formatMessageHistory(history, 8);

      const aiRaw = await callAIWithRetry(aiProvider, {
        systemPrompt,
        userMessage: content,
        messageHistory: formattedHistory,
      });

      return parseAIResponse(aiRaw, 'unknown');
    } catch (err) {
      console.warn('[AIService] General AI failed, falling back to FAQ or default:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FALLBACK: Khi AI Provider không có hoặc lỗi
  // ─────────────────────────────────────────────────────────────────────────────
  if (matchedFaq) {
    return buildFallbackResponse('faq', matchedFaq);
  }

  // Nếu câu hỏi có liên quan đến kính, gương mặt hoặc phong cách nhưng chưa bắt được entity hẹp
  const lowerContent = (content || '').toLowerCase();
  const isStylingRelated = ['kính', 'gọng', 'mặt', 'phong cách', 'dáng', 'chọn', 'mẫu', 'tư vấn'].some(k => lowerContent.includes(k));

  if (isStylingRelated) {
    const featured = await fetchCatalogProducts({ limit: 3 });
    return {
      content: `Dạ, Lumina Concierge rất hân hạnh được đồng hành cùng quý khách tìm kiếm thiết kế kính mắt hoàn hảo. Quý khách có thể cho tôi biết thêm về **dáng khuôn mặt** (mặt tròn, vuông, trái xoan, trái tim, hay dài) hoặc phong cách quý khách yêu thích (cổ điển, hiện đại, tối giản hay sang trọng kiêu kỳ) để tôi đưa ra gợi ý chuẩn xác nhất ạ!`,
      messageType: 'product_recommendation',
      metadata: {
        productCards: mapProductsToCards(featured),
        quickActions: ['Tư vấn theo khuôn mặt', 'Bộ sưu tập Haute Couture', 'Thử kính AI', 'Khám phá 3D Atelier'],
      },
    };
  }

  return {
    content: `Chào quý khách! Tôi là Lumina Concierge ✦ — Trợ lý phong cách và kính mắt cao cấp của bạn.\n\nTôi có thể hỗ trợ bạn theo dõi tiến trình đơn hàng, giải đáp chính sách bảo hành Lumina Care, tra cứu điểm thành viên hoặc hướng dẫn bảo quản kính mắt.\n\nQuý khách muốn tôi hỗ trợ thông tin nào dưới đây ạ?`,
    messageType: 'text',
    metadata: {
      quickActions: ['Theo dõi đơn', 'Yêu cầu hỗ trợ', 'Điểm thành viên', 'Bảo quản kính'],
    },
  };
}

export default { generateLuminaResponse };

