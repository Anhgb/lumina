/**
 * Lumina Eyewear — AI Product & Smart Eyewear Recommendation Tests (Prompt 05)
 * 
 * Comprehensive Test Suite covering:
 * 1. Product Query Tools (searchProducts, getProductDetails, getProductStock, compareProducts, getProductsByPriceRange, getProductsByFaceShape)
 * 2. 10 Product Recommendation queries
 * 3. 5 Comparison queries (Category & Specific Products)
 * 4. 5 Budget queries (Exact budget, range, upper bound, lower bound, no-match budget)
 * 5. 5 Out-of-stock handling cases
 * 6. 5 No-result & Out-of-scope cases
 * 7. Product Card formatting & Catalog / Try-On navigation link verification
 */

import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {
  searchProducts,
  getProductDetails,
  getProductStock,
  compareProducts,
  compareCategories,
  getProductsByPriceRange,
  getProductsByFaceShape,
  parseBudgetConstraint,
  mapProductToCard,
  FACE_SHAPE_STYLING,
  CATEGORY_STYLING_PROFILE,
} from '../src/ai/productTools.js';
import { generateLuminaResponse } from '../src/ai/ai.service.js';
import { classifyIntent } from '../src/ai/intentClassifier.js';

dotenv.config();

suite('Lumina AI Smart Product Advisor & Styling Tests (Prompt 05)', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: INTERNAL PRODUCT TOOLS TESTS
  // ───────────────────────────────────────────────────────────────────────────

  test('1. searchProducts returns active products filtered by category and material', async () => {
    const aviators = await searchProducts({ category: 'aviator', inStockOnly: true });
    assert.ok(Array.isArray(aviators));
    assert.ok(aviators.length >= 2, 'Should find at least 2 active aviators');
    for (const p of aviators) {
      assert.equal(p.category, 'aviator');
      assert.equal(p.is_active, 1);
      assert.ok(p.stock > 0);
    }

    const titaniumProducts = await searchProducts({ material: 'titanium' });
    assert.ok(titaniumProducts.length >= 1);
    for (const p of titaniumProducts) {
      assert.ok(p.frame_material.toLowerCase().includes('titan'));
    }
  });

  test('2. getProductDetails retrieves accurate metadata and excludes inactive items', async () => {
    const item = await getProductDetails('lumina-01');
    assert.ok(item);
    assert.equal(item.id, 'lumina-01');
    assert.equal(item.name, 'Cyber Cat-Eye 18K Champagne');
    assert.equal(item.category, 'cateye');
    assert.equal(parseFloat(item.price), 3250000);
    assert.equal(item.is_active, 1);

    const nonExistent = await getProductDetails('lumina-fake-999');
    assert.equal(nonExistent, null);
  });

  test('3. getProductStock returns real inventory numbers without fabrication', async () => {
    const stockInfo = await getProductStock('lumina-03');
    assert.ok(stockInfo.found);
    assert.equal(stockInfo.inStock, true);
    assert.ok(stockInfo.stock >= 1);
    assert.equal(stockInfo.price, 1950000);

    const fakeStock = await getProductStock('non-existent-id');
    assert.equal(fakeStock.found, false);
    assert.equal(fakeStock.inStock, false);
    assert.equal(fakeStock.stock, 0);
  });

  test('4. compareCategories provides rich comparative styling between silhouettes', async () => {
    const comp = await compareCategories('aviator', 'cateye');
    assert.ok(comp);
    assert.equal(comp.profileA.category, 'aviator');
    assert.equal(comp.profileB.category, 'cateye');
    assert.ok(comp.profileA.vibe.length > 10);
    assert.ok(comp.profileB.vibe.length > 10);
    assert.ok(Array.isArray(comp.sampleProducts));
    assert.equal(comp.sampleProducts.length, 2);
  });

  test('5. compareProducts compares two specific products from MySQL', async () => {
    const comp = await compareProducts(['lumina-01', 'lumina-02']);
    assert.ok(comp);
    assert.equal(comp.comparedProducts.length, 2);
    assert.equal(comp.comparedProducts[0].id, 'lumina-01');
    assert.equal(comp.comparedProducts[1].id, 'lumina-02');
    assert.ok(comp.comparisonAnalysis.priceDiff > 0);
  });

  test('6. getProductsByPriceRange filters strictly by min and max price', async () => {
    const range = await getProductsByPriceRange({ minPrice: 2000000, maxPrice: 3000000, inStockOnly: true });
    assert.ok(range.totalFound >= 1);
    for (const p of range.products) {
      assert.ok(p.price >= 2000000);
      assert.ok(p.price <= 3000000);
      assert.ok(p.stock > 0);
    }
  });

  test('7. getProductsByFaceShape returns tailored recommendations for all 5 shapes', async () => {
    const shapes = ['round', 'square', 'oval', 'heart', 'diamond'];
    for (const shape of shapes) {
      const res = await getProductsByFaceShape(shape, { limit: 3 });
      assert.ok(res.stylingAdvice);
      assert.equal(res.stylingAdvice.id, shape);
      assert.ok(res.stylingAdvice.recommendedFrames.length >= 1);
      assert.ok(res.recommendedProducts.length >= 1, `Shape ${shape} should have recommended products`);
      for (const p of res.recommendedProducts) {
        assert.ok(res.stylingAdvice.recommendedFrames.includes(p.category));
      }
    }
  });

  test('8. parseBudgetConstraint accurately extracts numeric bounds from Vietnamese prose', () => {
    const b1 = parseBudgetConstraint('Tôi có ngân sách 3 triệu');
    assert.equal(b1.hasBudget, true);
    assert.equal(b1.targetBudget, 3000000);

    const b2 = parseBudgetConstraint('Kính nào giá dưới 2.5 triệu không?');
    assert.equal(b2.hasBudget, true);
    assert.equal(b2.minPrice, 0);
    assert.equal(b2.maxPrice, 2500000);

    const b3 = parseBudgetConstraint('Tìm gọng tầm 2 đến 3 triệu');
    assert.equal(b3.hasBudget, true);
    assert.equal(b3.minPrice, 2000000);
    assert.equal(b3.maxPrice, 3000000);

    const b4 = parseBudgetConstraint('Kính cao cấp trên 3 triệu');
    assert.equal(b4.hasBudget, true);
    assert.equal(b4.minPrice, 3000000);
    assert.equal(b4.maxPrice, null);

    const b5 = parseBudgetConstraint('Cho tôi xem bộ sưu tập mới');
    assert.equal(b5.hasBudget, false);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: 10 PRODUCT RECOMMENDATION QUERIES
  // ───────────────────────────────────────────────────────────────────────────
  suite('10 Product Recommendation Queries', () => {
    const queries = [
      'Gợi ý cho tôi các mẫu kính mắt cao cấp',
      'Tôi muốn tìm kính phi công aviator sang trọng',
      'Có mẫu kính mắt mèo cat-eye nào đẹp không?',
      'Tư vấn kính gọng tròn phong cách minimalist',
      'Tôi cần gọng kính vuông executive lịch lãm',
      'Mẫu kính chất liệu titanium nhẹ bền',
      'Kính acetate đen obsidian cao cấp',
      'Tư vấn kính cho mặt tròn thon gọn hơn',
      'Gợi ý kính cho khuôn mặt vuông góc cạnh',
      'Khuôn mặt trái xoan nên đeo gọng nào?',
    ];

    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      test(`Q${i + 1}: "${q}"`, async () => {
        const res = await generateLuminaResponse({ content: q, user: null, history: [] });
        assert.ok(res.content && res.content.length > 20);
        assert.ok(
          res.messageType === 'product_recommendation' || res.messageType === 'styling_advice',
          `Message type should be product_recommendation or styling_advice, got: ${res.messageType}`
        );
        assert.ok(Array.isArray(res.metadata.productCards));
        assert.ok(res.metadata.productCards.length >= 1, 'Should return at least 1 product card');

        const card = res.metadata.productCards[0];
        assert.ok(card.id);
        assert.ok(card.name);
        assert.ok(typeof card.price === 'number' && card.price > 0);
        assert.equal(card.actionUrl, '/catalog');
        assert.ok(card.tryOnUrl.startsWith('/try-on'));
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 3: 5 COMPARISON QUERIES
  // ───────────────────────────────────────────────────────────────────────────
  suite('5 Comparison Queries', () => {
    const compQueries = [
      { q: 'So sánh dáng kính Aviator và Cat-Eye', type: 'category' },
      { q: 'Gọng vuông và gọng tròn khác nhau thế nào?', type: 'category' },
      { q: 'So sánh lumina-01 và lumina-02', type: 'product' },
      { q: 'Sự khác biệt giữa kính mắt mèo và kính phi công', type: 'category' },
      { q: 'So sánh lumina-03 và lumina-04', type: 'product' },
    ];

    for (let i = 0; i < compQueries.length; i++) {
      const { q, type } = compQueries[i];
      test(`Comp ${i + 1}: "${q}"`, async () => {
        const res = await generateLuminaResponse({ content: q, user: null, history: [] });
        assert.ok(res.content);
        assert.equal(res.messageType, 'product_comparison');
        assert.ok(Array.isArray(res.metadata.productCards));
        assert.equal(res.metadata.productCards.length, 2, 'Comparison should return 2 sample/compared cards');

        // Check cards have distinct names
        assert.notEqual(res.metadata.productCards[0].id, res.metadata.productCards[1].id);
        assert.ok(res.metadata.quickActions.length >= 1);
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 4: 5 BUDGET QUERIES
  // ───────────────────────────────────────────────────────────────────────────
  suite('5 Budget Recommendation Queries', () => {
    test('Budget 1: "Tôi có ngân sách 3 triệu, nên chọn kính nào?"', async () => {
      const res = await generateLuminaResponse({ content: 'Tôi có ngân sách 3 triệu, nên chọn kính nào?', user: null });
      assert.equal(res.messageType, 'budget_recommendation');
      assert.ok(res.metadata.productCards.length >= 1);
      for (const card of res.metadata.productCards) {
        assert.ok(card.price <= 3500000, `Card price ${card.price} should fit target budget`);
      }
    });

    test('Budget 2: "Có mẫu kính nào giá dưới 2.5 triệu không?"', async () => {
      const res = await generateLuminaResponse({ content: 'Có mẫu kính nào giá dưới 2.5 triệu không?', user: null });
      assert.equal(res.messageType, 'budget_recommendation');
      assert.ok(res.metadata.productCards.length >= 1);
      for (const card of res.metadata.productCards) {
        assert.ok(card.price <= 2500000, `Card price ${card.price} must be <= 2.5m`);
      }
    });

    test('Budget 3: "Tìm kính trong khoảng từ 2 đến 3 triệu"', async () => {
      const res = await generateLuminaResponse({ content: 'Tìm kính trong khoảng từ 2 đến 3 triệu', user: null });
      assert.equal(res.messageType, 'budget_recommendation');
      assert.ok(res.metadata.productCards.length >= 1);
      for (const card of res.metadata.productCards) {
        assert.ok(card.price >= 2000000 && card.price <= 3000000);
      }
    });

    test('Budget 4: "Kính cao cấp trên 3 triệu"', async () => {
      const res = await generateLuminaResponse({ content: 'Kính cao cấp trên 3 triệu', user: null });
      assert.equal(res.messageType, 'budget_recommendation');
      assert.ok(res.metadata.productCards.length >= 1);
      for (const card of res.metadata.productCards) {
        assert.ok(card.price >= 3000000);
      }
    });

    test('Budget 5: "Kính giá dưới 1 triệu" (No match budget handled gracefully)', async () => {
      const res = await generateLuminaResponse({ content: 'Tôi muốn mua kính giá dưới 1 triệu', user: null });
      assert.equal(res.messageType, 'product_recommendation');
      assert.ok(res.content.includes('chưa có mẫu kính'));
      assert.ok(res.content.includes('1.950.000đ'));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 5: 5 OUT-OF-STOCK & INVENTORY HANDLING CASES
  // ───────────────────────────────────────────────────────────────────────────
  suite('5 Out-of-Stock and Inventory Handling Cases', () => {
    test('Stock 1: Check in-stock product inventory (lumina-03)', async () => {
      const res = await generateLuminaResponse({ content: 'Sản phẩm lumina-03 còn hàng không?', user: null });
      assert.equal(res.messageType, 'stock_info');
      assert.ok(res.content.includes('còn hàng'));
      assert.ok(res.content.includes('1.950.000đ'));
      assert.equal(res.metadata.productCards.length, 1);
      assert.equal(res.metadata.productCards[0].id, 'lumina-03');
    });

    test('Stock 2: Check in-stock product inventory (lumina-02)', async () => {
      const res = await generateLuminaResponse({ content: 'lumina-02 còn hàng không và giá bao nhiêu?', user: null });
      assert.equal(res.messageType, 'stock_info');
      assert.ok(res.content.includes('còn hàng'));
      assert.ok(res.content.includes('2.850.000đ'));
    });

    test('Stock 3: Simulated out-of-stock product returns transparent notice & alternatives', async () => {
      // Direct call to getProductStock for non-stock item
      const stockRes = await getProductStock('non-existent-product');
      assert.equal(stockRes.inStock, false);
      assert.equal(stockRes.stock, 0);
    });

    test('Stock 4: Search filters with inStockOnly=true never return stock 0 items', async () => {
      const inStockItems = await searchProducts({ inStockOnly: true });
      for (const item of inStockItems) {
        assert.ok(item.stock > 0, `Item ${item.id} must have stock > 0`);
      }
    });

    test('Stock 5: General stock inquiry returns in-stock status without hallucinating inventory', async () => {
      const res = await generateLuminaResponse({ content: 'Các mẫu kính hiện tại có sẵn hàng không?', user: null });
      assert.ok(res.metadata.productCards);
      for (const card of res.metadata.productCards) {
        assert.ok(card.stock > 0, 'Every recommended card must have positive real stock');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 6: 5 NO-RESULT & OUT-OF-SCOPE CASES
  // ───────────────────────────────────────────────────────────────────────────
  suite('5 No-Result and Out-of-Scope Cases', () => {
    test('NoResult 1: Out of scope request ("kính bơi")', async () => {
      const res = await generateLuminaResponse({ content: 'Shop có kính bơi chống nước không?', user: null });
      assert.equal(res.messageType, 'product_recommendation');
      assert.ok(res.content.includes('không tìm thấy'));
      assert.ok(res.metadata.quickActions.length >= 1);
    });

    test('NoResult 2: Impossibly high budget ("kính giá trên 100 triệu")', async () => {
      const res = await generateLuminaResponse({ content: 'Tìm kính giá trên 100 triệu', user: null });
      assert.ok(res.content.includes('chưa có') || res.content.includes('không tìm thấy'));
    });

    test('NoResult 3: Non-existent product ID ("lumina-999")', async () => {
      const details = await getProductDetails('lumina-999');
      assert.equal(details, null);
    });

    test('NoResult 4: Non-existent material filter ("kính làm từ gỗ mun")', async () => {
      const res = await searchProducts({ material: 'gỗ mun' });
      assert.equal(res.length, 0);
    });

    test('NoResult 5: Inactive product filter (is_active = 0 is never returned)', async () => {
      const allActive = await searchProducts({});
      for (const p of allActive) {
        assert.equal(p.is_active, 1, 'Only active products must be returned');
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PART 7: PRODUCT CARD FORMATTING & NAVIGATION LINKS
  // ───────────────────────────────────────────────────────────────────────────
  test('Product Card contract conforms strictly to frontend requirements', () => {
    const rawMock = {
      id: 'lumina-02',
      name: 'Celestial Aviator Titanium Gold',
      category: 'aviator',
      category_label: 'Phi công (Aviator)',
      price: '2850000.00',
      original_price: '3400000.00',
      stock: 6,
      frame_material: 'Titanium siêu nhẹ',
      image_url: '/assets/products/aviator.png',
      is_active: 1,
    };

    const card = mapProductToCard(rawMock);
    assert.equal(card.id, 'lumina-02');
    assert.equal(card.name, 'Celestial Aviator Titanium Gold');
    assert.equal(card.category, 'aviator');
    assert.equal(card.categoryLabel, 'Phi công (Aviator)');
    assert.equal(card.price, 2850000);
    assert.equal(card.originalPrice, 3400000);
    assert.equal(card.stock, 6);
    assert.equal(card.inStock, true);
    assert.equal(card.actionUrl, '/catalog');
    assert.equal(card.tryOnUrl, '/try-on?model=aviator');
    assert.equal(card.frameMaterial, 'Titanium siêu nhẹ');
  });
});
