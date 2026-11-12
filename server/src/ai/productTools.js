/**
 * Lumina Eyewear — Product Tools & Eyewear Styling Advisor (Prompt 05)
 * 
 * Module nội bộ chịu trách nhiệm:
 * 1. Truy vấn sản phẩm an toàn từ MySQL (search, details, stock, price range, face shape).
 * 2. Phân tích ngân sách và lọc theo giá thực tế từ DB.
 * 3. So sánh sản phẩm và kiểu dáng (silhouette comparison).
 * 4. Tư vấn dáng mặt (Round, Square, Oval, Heart, Diamond) kết hợp gợi ý gọng kính.
 * 5. Tuân thủ nghiêm ngặt quy tắc không bịa giá, không bịa tồn kho, không trả về sản phẩm inactive.
 */

import { pool } from '../config/database.js';

/**
 * Metadata phong cách và dáng mặt chuẩn nhãn khoa & thời trang Lumina Atelier.
 */
export const FACE_SHAPE_STYLING = {
  round: {
    id: 'round',
    label: 'Mặt tròn',
    description: 'Khuôn mặt có chiều dài và chiều ngang tương đồng, đường viền mềm mại, không có góc cạnh quai hàm rõ nét.',
    recommendedFrames: ['square', 'aviator'],
    recommendedLabels: ['Gọng vuông (Square)', 'Phi công (Aviator giọt nước)'],
    styleRationale: 'Các đường nét góc cạnh của gọng Vuông hoặc độ cong thuôn dài của gọng Aviator giúp cân bằng sự mềm mại, tạo hiệu ứng thị giác giúp khuôn mặt thon gọn và thanh thoát hơn.',
    considerations: 'Nên cân nhắc hạn chế gọng tròn xoe hoặc kích thước quá nhỏ, vì có thể làm nổi bật thêm độ tròn của gương mặt.',
    quickActions: ['Gọng Vuông thanh lịch', 'Phi công Aviator', 'Thử kính AI phân tích'],
  },
  square: {
    id: 'square',
    label: 'Mặt vuông',
    description: 'Đường viền quai hàm góc cạnh, vầng trán rộng và chiều ngang gò má tương đương chiều rộng xương hàm.',
    recommendedFrames: ['round', 'aviator'],
    recommendedLabels: ['Gọng tròn (Round)', 'Phi công (Aviator)'],
    styleRationale: 'Các đường cong uyển chuyển của gọng Tròn Minimalist hoặc Aviator cổ điển giúp làm dịu bớt các góc nhọn của xương quai hàm, mang lại vẻ hài hòa và phóng khoáng.',
    considerations: 'Tránh gọng có góc vuông sắc nhọn hoặc quá dày bản vì có thể khiến gương mặt trông cứng cáp hơn.',
    quickActions: ['Gọng Tròn thời thượng', 'Phi công Aviator', 'Thử kính AI phân tích'],
  },
  oval: {
    id: 'oval',
    label: 'Mặt trái xoan',
    description: 'Tỉ lệ các vùng trên gương mặt cân đối lý tưởng, phần trán hơi rộng hơn cằm và đường nét cong nhẹ nhàng.',
    recommendedFrames: ['cateye', 'square', 'aviator', 'round'],
    recommendedLabels: ['Mắt mèo (Cat-Eye)', 'Gọng vuông (Square)', 'Phi công (Aviator)', 'Gọng tròn (Round)'],
    styleRationale: 'Mặt trái xoan là dáng mặt linh hoạt nhất trong nghệ thuật phối kính. Quý khách có thể tự tin diện hầu hết các form kính, đặc biệt dáng Cat-Eye sẽ làm nổi bật thần thái kiêu kỳ, quý phái.',
    considerations: 'Nên chọn kích thước gọng có chiều ngang bằng hoặc hơi rộng hơn phần rộng nhất của gương mặt để giữ tỉ lệ vàng hoàn hảo.',
    quickActions: ['Mắt mèo Cat-Eye quý phái', 'Gọng Vuông cá tính', 'Thử kính AI phân tích'],
  },
  heart: {
    id: 'heart',
    label: 'Mặt trái tim (Tam giác ngược)',
    description: 'Phần trán và gò má rộng, thon gọn dần về phía cằm nhọn thanh tú.',
    recommendedFrames: ['aviator', 'round'],
    recommendedLabels: ['Phi công (Aviator)', 'Gọng tròn (Round thanh mảnh)'],
    styleRationale: 'Thiết kế giọt nước mở rộng ở phần đáy của gọng Aviator hoặc viền bo mềm của gọng Round giúp tạo sự cân bằng tự nhiên với phần cằm thon gọn phía dưới.',
    considerations: 'Hạn chế các mẫu gọng có phần viền trên quá dày hoặc đính kết nặng nề, vì có thể thu hút thêm sự chú ý vào vầng trán rộng.',
    quickActions: ['Phi công Aviator', 'Gọng Tròn thanh mảnh', 'Thử kính AI phân tích'],
  },
  diamond: {
    id: 'diamond',
    label: 'Mặt kim cương',
    description: 'Gò má cao và là điểm rộng nhất trên gương mặt, trong khi vùng trán và cằm tương đối hẹp.',
    recommendedFrames: ['cateye', 'round'],
    recommendedLabels: ['Mắt mèo (Cat-Eye)', 'Gọng tròn viền oval'],
    styleRationale: 'Đuôi mắt chếch nhẹ của gọng Cat-Eye hoặc dáng tròn mềm mại làm nổi bật xương gò má cao quý phái, đồng thời tạo điểm nhấn sang trọng cho phần thái dương.',
    considerations: 'Tránh các dáng kính bản hẹp hơn gò má vì sẽ làm mất đi sự thanh thoát tự nhiên của đường nét kim cương.',
    quickActions: ['Mắt mèo Cat-Eye 18K', 'Gọng Tròn nhẹ nhàng', 'Thử kính AI phân tích'],
  },
  oblong: {
    id: 'oblong',
    label: 'Mặt dài (Chữ nhật)',
    description: 'Chiều dài khuôn mặt lớn hơn rõ rệt so với chiều ngang, đường nét trán và quai hàm thẳng tắp thanh tú.',
    recommendedFrames: ['square', 'aviator', 'round'],
    recommendedLabels: ['Gọng vuông bản rộng (Square)', 'Phi công (Aviator giọt nước)', 'Gọng tròn lớn (Oversized Round)'],
    styleRationale: 'Các thiết kế có tròng kính sâu hoặc viền gọng bản vừa đến lớn tạo điểm dừng thị giác, giúp cân bằng chiều dọc và khiến gương mặt trông hài hòa, đầy đặn hơn.',
    considerations: 'Nên tránh gọng quá nhỏ, tròng hẹp bề dọc hoặc gọng không viền mảnh vì dễ tạo cảm giác khuôn mặt dài hơn.',
    quickActions: ['Gọng Vuông cân bằng', 'Phi công Aviator', 'Thử kính AI phân tích'],
  },
};

/**
 * Thông tin phong cách & đặc trưng từng kiểu dáng gọng kính.
 */
export const CATEGORY_STYLING_PROFILE = {
  cateye: {
    category: 'cateye',
    name: 'Mắt mèo (Cat-Eye)',
    vibe: 'Quyến rũ, kiêu kỳ, mang đậm tinh thần Haute Couture và tôn vinh thần thái quý phái.',
    materials: 'Acetate đồi mồi Amber, Titanium mạ vàng 18K Champagne.',
    suitableFaces: ['Mặt trái xoan', 'Mặt kim cương', 'Mặt tròn'],
    opticalAdvantage: 'Đuôi mắt chếch lên tạo hiệu ứng nâng cơ mặt tự nhiên, tôn vinh vùng gò má và đôi mắt.',
  },
  aviator: {
    category: 'aviator',
    name: 'Phi công (Aviator)',
    vibe: 'Phóng khoáng, tự do, mang tính biểu tượng vượt thời gian từ di sản hàng không sang trọng.',
    materials: 'Titanium siêu nhẹ cấp hàng không, cầu kính đôi chắc chắn.',
    suitableFaces: ['Mặt vuông', 'Mặt trái tim', 'Mặt trái xoan', 'Mặt tròn'],
    opticalAdvantage: 'Thị trường quan sát rộng, ôm nhẹ khuôn mặt, tạo chiều sâu thị giác đầy nam tính và cuốn hút.',
  },
  round: {
    category: 'round',
    name: 'Gọng tròn (Round)',
    vibe: 'Trí thức, tối giản (Minimalist), tinh tế và mang phong vị nghệ thuật kiến trúc đương đại.',
    materials: 'Bạc Titanium đánh bóng gương, Thép không gỉ sơn tĩnh điện mờ.',
    suitableFaces: ['Mặt vuông', 'Mặt kim cương', 'Mặt trái tim', 'Mặt chữ nhật'],
    opticalAdvantage: 'Các đường cong thuần khiết làm dịu các góc cạnh gương mặt, tạo cảm giác thân thiện, tao nhã.',
  },
  square: {
    category: 'square',
    name: 'Gọng vuông (Square)',
    vibe: 'Bản lĩnh, uy quyền, chuẩn mực Executive cho phong thái lãnh đạo và kiến trúc hiện đại.',
    materials: 'Titanium nguyên khối mạ vàng 24K, Acetate đen bóng nguyên khối Obsidian.',
    suitableFaces: ['Mặt tròn', 'Mặt trái xoan', 'Mặt trái tim'],
    opticalAdvantage: 'Đường viền sắc nét định hình khung xương mặt rõ ràng, tạo vẻ đĩnh đạc và tin cậy.',
  },
};

/**
 * Format thông tin sản phẩm thành thẻ Product Card dùng cho UI.
 * @param {object} p - Raw product row từ MySQL
 * @returns {object}
 */
export function mapProductToCard(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    categoryLabel: p.category_label || p.category,
    price: parseFloat(p.price),
    originalPrice: p.original_price ? parseFloat(p.original_price) : null,
    stock: p.stock,
    inStock: p.stock > 0,
    image: p.image_url,
    frameMaterial: p.frame_material,
    actionUrl: `/catalog`,
    tryOnUrl: `/try-on?model=${p.category}`,
  };
}

/**
 * 1. Tìm kiếm sản phẩm theo từ khóa, category, chất liệu và tình trạng tồn kho.
 * Chỉ trả về sản phẩm đang active (`is_active = 1`).
 * 
 * @param {object} options
 * @param {string} [options.keyword]
 * @param {string} [options.category]
 * @param {string} [options.material]
 * @param {boolean} [options.inStockOnly=false]
 * @param {number} [options.limit=10]
 * @returns {Promise<object[]>}
 */
export async function searchProducts({ keyword, category, material, inStockOnly = false, limit = 10 } = {}) {
  try {
    let sql = `
      SELECT id, name, category, category_label, price, original_price, stock, frame_material, image_url, is_active
      FROM products
      WHERE is_active = 1
    `;
    const params = [];

    if (category) {
      // Chuẩn hóa category (cateye, aviator, round, square)
      const normCat = category.toLowerCase().replace(/[^a-z]/g, '');
      const validCat = normCat.includes('cat') ? 'cateye' : normCat;
      sql += ` AND category = ?`;
      params.push(validCat);
    }

    if (material) {
      sql += ` AND LOWER(frame_material) LIKE ?`;
      params.push(`%${material.toLowerCase().trim()}%`);
    }

    if (keyword) {
      const kw = `%${keyword.toLowerCase().trim()}%`;
      sql += ` AND (LOWER(name) LIKE ? OR LOWER(category_label) LIKE ? OR LOWER(frame_material) LIKE ?)`;
      params.push(kw, kw, kw);
    }

    if (inStockOnly) {
      sql += ` AND stock > 0`;
    }

    sql += ` ORDER BY stock DESC, price ASC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error('[ProductTools] Error in searchProducts:', error.message);
    return [];
  }
}

/**
 * 2. Lấy thông tin chi tiết một sản phẩm theo ID từ MySQL.
 * 
 * @param {string} productId 
 * @returns {Promise<object|null>}
 */
export async function getProductDetails(productId) {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, category, category_label, price, original_price, stock, frame_material, dimensions, image_url, is_active
       FROM products
       WHERE id = ? AND is_active = 1
       LIMIT 1`,
      [productId]
    );

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('[ProductTools] Error in getProductDetails:', error.message);
    return null;
  }
}

/**
 * 3. Kiểm tra số lượng tồn kho chính xác của sản phẩm.
 * 
 * @param {string} productId 
 * @returns {Promise<{ found: boolean, inStock: boolean, stock: number, name?: string }>}
 */
export async function getProductStock(productId) {
  try {
    const product = await getProductDetails(productId);
    if (!product) {
      return { found: false, inStock: false, stock: 0 };
    }
    return {
      found: true,
      inStock: product.stock > 0,
      stock: product.stock,
      name: product.name,
      price: parseFloat(product.price),
    };
  } catch (error) {
    console.error('[ProductTools] Error in getProductStock:', error.message);
    return { found: false, inStock: false, stock: 0 };
  }
}

/**
 * 4. So sánh hai hoặc nhiều sản phẩm dựa trên dữ liệu thật từ MySQL.
 * 
 * @param {string[]} productIds 
 * @returns {Promise<{ comparedProducts: object[], comparisonAnalysis: object }>}
 */
export async function compareProducts(productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return { comparedProducts: [], comparisonAnalysis: null };
  }

  const products = [];
  for (const id of productIds.slice(0, 3)) {
    const item = await getProductDetails(id);
    if (item) products.push(item);
  }

  if (products.length === 0) {
    return { comparedProducts: [], comparisonAnalysis: null };
  }

  const cards = products.map(mapProductToCard);

  // Tạo phân tích so sánh
  const comparisonAnalysis = {
    count: products.length,
    priceDiff: products.length >= 2 ? Math.abs(products[0].price - products[1].price) : 0,
    materials: products.map((p) => ({ id: p.id, name: p.name, material: p.frame_material })),
    categories: products.map((p) => ({ id: p.id, name: p.name, category: p.category_label || p.category })),
  };

  return {
    comparedProducts: cards,
    comparisonAnalysis,
  };
}

/**
 * 4b. So sánh 2 danh mục/kiểu dáng kính (Silhouette comparison, e.g. Aviator vs Cat-Eye).
 * 
 * @param {string} cat1 
 * @param {string} cat2 
 * @returns {Promise<object>}
 */
export async function compareCategories(cat1, cat2) {
  const norm1 = cat1.toLowerCase().includes('cat') ? 'cateye' : cat1.toLowerCase();
  const norm2 = cat2.toLowerCase().includes('cat') ? 'cateye' : cat2.toLowerCase();

  const profile1 = CATEGORY_STYLING_PROFILE[norm1];
  const profile2 = CATEGORY_STYLING_PROFILE[norm2];

  if (!profile1 || !profile2) {
    return null;
  }

  // Lấy các sản phẩm tiêu biểu cho mỗi dòng từ MySQL
  const productsCat1 = await searchProducts({ category: norm1, limit: 1 });
  const productsCat2 = await searchProducts({ category: norm2, limit: 1 });

  const sampleProducts = [
    ...(productsCat1.length > 0 ? [mapProductToCard(productsCat1[0])] : []),
    ...(productsCat2.length > 0 ? [mapProductToCard(productsCat2[0])] : []),
  ];

  return {
    profileA: profile1,
    profileB: profile2,
    sampleProducts,
  };
}

/**
 * 5. Lọc sản phẩm theo khoảng ngân sách (Min/Max Price).
 * 
 * @param {object} options
 * @param {number} [options.minPrice=0]
 * @param {number} [options.maxPrice]
 * @param {boolean} [options.inStockOnly=true]
 * @param {number} [options.limit=6]
 * @returns {Promise<{ products: object[], totalFound: number, priceRange: object }>}
 */
export async function getProductsByPriceRange({ minPrice = 0, maxPrice = null, inStockOnly = true, limit = 6 } = {}) {
  try {
    let sql = `
      SELECT id, name, category, category_label, price, original_price, stock, frame_material, image_url, is_active
      FROM products
      WHERE is_active = 1 AND price >= ?
    `;
    const params = [minPrice];

    if (maxPrice !== null && maxPrice > 0) {
      sql += ` AND price <= ?`;
      params.push(maxPrice);
    }

    if (inStockOnly) {
      sql += ` AND stock > 0`;
    }

    sql += ` ORDER BY price ASC LIMIT ?`;
    params.push(limit);

    const [rows] = await pool.query(sql, params);

    return {
      products: rows.map(mapProductToCard),
      totalFound: rows.length,
      priceRange: { min: minPrice, max: maxPrice },
    };
  } catch (error) {
    console.error('[ProductTools] Error in getProductsByPriceRange:', error.message);
    return { products: [], totalFound: 0, priceRange: { min: minPrice, max: maxPrice } };
  }
}

/**
 * 6. Lấy danh sách sản phẩm gợi ý theo Dáng mặt.
 * 
 * @param {string} faceShape - 'round' | 'square' | 'oval' | 'heart' | 'diamond'
 * @param {object} [options]
 * @param {boolean} [options.inStockOnly=true]
 * @param {number} [options.limit=4]
 * @returns {Promise<{ stylingAdvice: object, recommendedProducts: object[] }>}
 */
export async function getProductsByFaceShape(faceShape, { inStockOnly = true, limit = 4 } = {}) {
  const normShape = (faceShape || '').toLowerCase().trim();
  let matchedShape = 'oval'; // default fallback

  if (normShape.includes('tròn') || normShape.includes('round')) matchedShape = 'round';
  else if (normShape.includes('vuông') || normShape.includes('square')) matchedShape = 'square';
  else if (normShape.includes('xoan') || normShape.includes('oval')) matchedShape = 'oval';
  else if (normShape.includes('tim') || normShape.includes('heart')) matchedShape = 'heart';
  else if (normShape.includes('cương') || normShape.includes('diamond')) matchedShape = 'diamond';
  else if (normShape.includes('dài') || normShape.includes('chữ nhật') || normShape.includes('oblong')) matchedShape = 'oblong';

  const advice = FACE_SHAPE_STYLING[matchedShape];

  // Tìm các sản phẩm thuộc category được khuyến nghị
  const products = [];
  for (const cat of advice.recommendedFrames) {
    const items = await searchProducts({ category: cat, inStockOnly, limit: 2 });
    for (const item of items) {
      if (products.length < limit && !products.some((p) => p.id === item.id)) {
        products.push(mapProductToCard(item));
      }
    }
  }

  return {
    stylingAdvice: advice,
    recommendedProducts: products,
  };
}

/**
 * 7. Phân tích ngữ nghĩa để trích xuất khoảng giá hoặc ngân sách từ tin nhắn người dùng.
 * Hỗ trợ các cú pháp: "3 triệu", "ngân sách 3tr", "dưới 2.5 triệu", "từ 2 đến 3 triệu", "2500k", v.v.
 * 
 * @param {string} text 
 * @returns {{ hasBudget: boolean, minPrice: number, maxPrice: number|null, targetBudget: number|null }}
 */
export function parseBudgetConstraint(text) {
  const lower = text.toLowerCase();

  // Pattern 1: Khoảng giá "từ X đến Y triệu/tr", "tầm X đến Y triệu", hoặc "từ X - Y triệu"
  const rangeMatch = lower.match(/(?:từ|khoảng|tầm)\s*([\d,.]+)\s*(?:đến|-)\s*([\d,.]+)\s*(triệu|tr|k)?/i);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1].replace(',', '.'));
    let max = parseFloat(rangeMatch[2].replace(',', '.'));
    const unit = rangeMatch[3] || 'triệu';

    if (unit === 'k') {
      min *= 1000;
      max *= 1000;
    } else {
      min *= 1000000;
      max *= 1000000;
    }

    return {
      hasBudget: true,
      minPrice: min,
      maxPrice: max,
      targetBudget: max,
    };
  }

  // Pattern 2: Giới hạn trên "dưới X triệu", "tối đa X triệu", "nhỏ hơn X triệu"
  const maxMatch = lower.match(/(?:dưới|tối đa|nhỏ hơn|ít hơn|dưới mức)\s*([\d,.]+)\s*(triệu|tr|k|đ|vnd)?/i);
  if (maxMatch) {
    let max = parseFloat(maxMatch[1].replace(',', '.'));
    const unit = maxMatch[2] || 'triệu';
    if (unit === 'k') max *= 1000;
    else if (unit !== 'đ' && unit !== 'vnd') max *= 1000000;

    return {
      hasBudget: true,
      minPrice: 0,
      maxPrice: max,
      targetBudget: max,
    };
  }

  // Pattern 3: Giới hạn dưới "trên X triệu", "tối thiểu X triệu", "lớn hơn X triệu"
  const minMatch = lower.match(/(?:trên|tối thiểu|lớn hơn|nhiều hơn)\s*([\d,.]+)\s*(triệu|tr|k|đ|vnd)?/i);
  if (minMatch) {
    let min = parseFloat(minMatch[1].replace(',', '.'));
    const unit = minMatch[2] || 'triệu';
    if (unit === 'k') min *= 1000;
    else if (unit !== 'đ' && unit !== 'vnd') min *= 1000000;

    return {
      hasBudget: true,
      minPrice: min,
      maxPrice: null,
      targetBudget: min,
    };
  }

  // Pattern 4: "ngân sách X triệu", "tầm X triệu", "khoảng X triệu", "có X triệu"
  const budgetMatch = lower.match(/(?:ngân sách|tầm|khoảng|có|tầm giá|mức giá)\s*([\d,.]+)\s*(triệu|tr|k)?/i);
  if (budgetMatch) {
    let val = parseFloat(budgetMatch[1].replace(',', '.'));
    const unit = budgetMatch[2] || 'triệu';
    if (unit === 'k') val *= 1000;
    else val *= 1000000;

    return {
      hasBudget: true,
      // Cho phép dao động linh hoạt +/- 15% xung quanh ngân sách
      minPrice: Math.max(0, val * 0.8),
      maxPrice: val * 1.15,
      targetBudget: val,
    };
  }

  return {
    hasBudget: false,
    minPrice: 0,
    maxPrice: null,
    targetBudget: null,
  };
}

export default {
  FACE_SHAPE_STYLING,
  CATEGORY_STYLING_PROFILE,
  mapProductToCard,
  searchProducts,
  getProductDetails,
  getProductStock,
  compareProducts,
  compareCategories,
  getProductsByPriceRange,
  getProductsByFaceShape,
  parseBudgetConstraint,
};
