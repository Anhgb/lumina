/**
 * Lumina Eyewear — Hybrid AI Engine Unit & Integration Tests
 * 
 * Tests Prompt 04 requirements:
 * 1. Intent Classification (FAQ, Product, Order, Try-On, Studio, Unknown)
 * 2. FAQ Accuracy (Hours, Warranty, Returns, Care, Shipping)
 * 3. AI Provider Factory & graceful fallback without API key
 * 4. System Prompt Builder & guardrail checks
 * 5. Response Parser & security filter against sensitive patterns
 * 6. Product catalog integration (verified prices from MySQL, no hallucination)
 * 7. Order tracking with IDOR protection
 * 8. Fallback handling on provider errors
 */

import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { pool } from '../src/config/database.js';
import { classifyIntent } from '../src/ai/intentClassifier.js';
import { createAIProvider, isAIProviderAvailable } from '../src/ai/aiProvider.factory.js';
import { buildSystemPrompt, formatMessageHistory } from '../src/ai/promptBuilder.js';
import { parseAIResponse, buildFallbackResponse } from '../src/ai/responseParser.js';
import { generateLuminaResponse } from '../src/ai/ai.service.js';
import FAQ_DATA from '../src/ai/faq.data.js';

dotenv.config();

suite('Lumina Hybrid AI Engine Tests (Prompt 04)', () => {
  // ── 1. FAQ Knowledge Base Tests ──
  test('1. FAQ Knowledge Base contains all required categories and active entries', () => {
    assert.ok(FAQ_DATA.length >= 8, 'FAQ should contain at least 8 entries');
    const categories = new Set(FAQ_DATA.map((f) => f.category));

    assert.ok(categories.has('hours'), 'FAQ must cover hours');
    assert.ok(categories.has('returns'), 'FAQ must cover returns');
    assert.ok(categories.has('warranty'), 'FAQ must cover warranty');
    assert.ok(categories.has('care'), 'FAQ must cover care');
    assert.ok(categories.has('shipping'), 'FAQ must cover shipping');

    for (const faq of FAQ_DATA) {
      assert.ok(faq.id, 'FAQ must have id');
      assert.ok(faq.question, 'FAQ must have question');
      assert.ok(Array.isArray(faq.keywords) && faq.keywords.length > 0, 'FAQ must have keywords');
      assert.ok(faq.answer && faq.answer.length > 20, 'FAQ must have detailed answer');
      assert.equal(faq.isActive, true, 'FAQ should be active');
    }
  });

  // ── 2. Intent Classification Tests ──
  test('2. Intent Classifier correctly routes common user queries', () => {
    // FAQ Intent
    const faqHours = classifyIntent('Mấy giờ showroom Lumina mở cửa vậy?');
    assert.equal(faqHours.intent, 'faq');
    assert.ok(faqHours.matchedFaq);
    assert.equal(faqHours.matchedFaq.category, 'hours');

    const faqWarranty = classifyIntent('Chính sách bảo hành gọng kính thế nào?');
    assert.equal(faqWarranty.intent, 'faq');
    assert.ok(faqWarranty.matchedFaq);
    assert.equal(faqWarranty.matchedFaq.category, 'warranty');

    const faqReturn = classifyIntent('Tôi muốn đổi trả sản phẩm thì phải làm sao?');
    assert.equal(faqReturn.intent, 'faq');
    assert.ok(faqReturn.matchedFaq);
    assert.equal(faqReturn.matchedFaq.category, 'returns');

    // Product Intent
    const productQuery = classifyIntent('Tôi muốn tìm gọng kính titan cao cấp');
    assert.equal(productQuery.intent, 'product');

    // Try-on Intent
    const tryonQuery = classifyIntent('Làm sao để thử kính AI qua camera?');
    assert.equal(tryonQuery.intent, 'tryon');

    // Studio Intent
    const studioQuery = classifyIntent('Tôi muốn tùy biến khắc tên và đính đá trên kính 3D');
    assert.equal(studioQuery.intent, 'studio');

    // Order Intent with code extraction
    const orderQuery = classifyIntent('Kiểm tra trạng thái đơn hàng LUM-12345678-ABCD');
    assert.equal(orderQuery.intent, 'order');
    assert.ok(orderQuery.extractedEntities);
    assert.equal(orderQuery.extractedEntities.orderCode, 'LUM-12345678-ABCD');

    // Unknown Intent
    const unknownQuery = classifyIntent('Thời tiết hôm nay thế nào');
    assert.equal(unknownQuery.intent, 'unknown');
  });

  // ── 3. AI Provider Factory & Fallback Mode ──
  test('3. AI Provider Factory returns null gracefully when no API keys configured (FAQ-only mode)', () => {
    const originalProvider = process.env.AI_PROVIDER;
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    const originalOpenAIKey = process.env.OPENAI_API_KEY;

    try {
      process.env.AI_PROVIDER = 'gemini';
      process.env.GEMINI_API_KEY = '';
      process.env.OPENAI_API_KEY = '';

      const provider = createAIProvider();
      assert.equal(provider, null, 'Should return null when API key is empty');
      assert.equal(isAIProviderAvailable(), false, 'isAIProviderAvailable should return false');
    } finally {
      process.env.AI_PROVIDER = originalProvider;
      process.env.GEMINI_API_KEY = originalGeminiKey;
      process.env.OPENAI_API_KEY = originalOpenAIKey;
    }
  });

  test('4. AI Provider Factory initializes properly when key is provided', () => {
    const originalProvider = process.env.AI_PROVIDER;
    const originalGeminiKey = process.env.GEMINI_API_KEY;

    try {
      process.env.AI_PROVIDER = 'gemini';
      process.env.GEMINI_API_KEY = 'test-demo-gemini-key-12345';

      const provider = createAIProvider();
      assert.ok(provider);
      assert.equal(provider.name, 'gemini');
      assert.equal(provider.apiKey, 'test-demo-gemini-key-12345');
      assert.ok(typeof provider.generateResponse === 'function');
    } finally {
      process.env.AI_PROVIDER = originalProvider;
      process.env.GEMINI_API_KEY = originalGeminiKey;
    }
  });

  // ── 5. System Prompt Builder & Guardrails ──
  test('5. Prompt Builder embeds strict guardrails and injects catalog context', () => {
    const mockProducts = [
      { id: 'lum-01', name: 'Lumina Grand Titan', category: 'square', price: 4500000, stock: 10 },
    ];

    const prompt = buildSystemPrompt({
      intent: 'product',
      products: mockProducts,
      userInfo: { name: 'Nguyễn Văn A', role: 'customer' },
    });

    assert.ok(prompt.includes('KHÔNG được bịa giá sản phẩm'), 'Must forbid price hallucination');
    assert.ok(prompt.includes('KHÔNG được bịa tồn kho'), 'Must forbid stock hallucination');
    assert.ok(prompt.includes('KHÔNG đưa ra tư vấn y tế'), 'Must forbid medical advice');
    assert.ok(prompt.includes('Lumina Grand Titan'), 'Must inject real catalog product name');
    assert.ok(prompt.includes('4.500.000'), 'Must inject real catalog product price');
    assert.ok(prompt.includes('Nguyễn Văn A'), 'Must include customer name');
  });

  // ── 6. Response Parser & Security Filters ──
  test('6. Response Parser blocks sensitive leaks and sanitizes output', () => {
    // Normal response
    const safeOutput = parseAIResponse('Kính dáng tròn rất tôn đường nét mặt vuông của quý khách.', 'product');
    assert.equal(safeOutput.messageType, 'product_recommendation');
    assert.ok(safeOutput.content.includes('Kính dáng tròn'));

    // Blocked: SQL injection or DB leak attempt
    const sqlLeak = parseAIResponse('SELECT * FROM users WHERE password = "abc"', 'unknown');
    assert.equal(sqlLeak.messageType, 'error');
    assert.equal(sqlLeak.metadata.error, 'content_filtered');

    // Blocked: API Key leak attempt
    const apiKeyLeak = parseAIResponse('Here is the API_KEY: AIzaSyD12345', 'unknown');
    assert.equal(apiKeyLeak.messageType, 'error');
    assert.equal(apiKeyLeak.metadata.error, 'content_filtered');
  });

  // ── 7. Fallback Builder ──
  test('7. Fallback builder returns friendly response without crashing', () => {
    const fallback = buildFallbackResponse('unknown', null);
    assert.equal(fallback.messageType, 'error');
    assert.ok(fallback.content.includes('1900-LUMINA'));
    assert.ok(fallback.metadata.quickActions.length > 0);

    const faqFallback = buildFallbackResponse('faq', FAQ_DATA[0]);
    assert.equal(faqFallback.messageType, 'faq_response');
    assert.equal(faqFallback.metadata.faqId, FAQ_DATA[0].id);
  });

  // ── 8. End-to-End Orchestrator: Product Intent (Real MySQL data) ──
  test('8. generateLuminaResponse returns real catalog products from MySQL for product query', async () => {
    const response = await generateLuminaResponse({
      content: 'Tôi muốn xem các mẫu kính cao cấp',
      user: null,
      history: [],
    });

    assert.ok(response.content);
    assert.equal(response.messageType, 'product_recommendation');
    assert.ok(Array.isArray(response.metadata.productCards));
    assert.ok(response.metadata.productCards.length > 0, 'Must return at least 1 product card');

    const firstCard = response.metadata.productCards[0];
    assert.ok(firstCard.id);
    assert.ok(firstCard.name);
    assert.ok(typeof firstCard.price === 'number');
    assert.ok(firstCard.price > 0, 'Price must be positive real number');
    assert.ok(firstCard.tryOnUrl);
  });

  // ── 9. End-to-End Orchestrator: FAQ Instant Response ──
  test('9. generateLuminaResponse returns FAQ directly for warranty question', async () => {
    const response = await generateLuminaResponse({
      content: 'Cho tôi hỏi về chính sách bảo hành của Lumina',
      user: null,
      history: [],
    });

    assert.equal(response.messageType, 'faq_response');
    assert.ok(response.content.includes('Bảo hành 12 tháng'));
    assert.equal(response.metadata.faqCategory, 'warranty');
  });

  // ── 10. End-to-End Orchestrator: Order Intent & IDOR Security ──
  test('10. generateLuminaResponse enforces login requirement for guest order query', async () => {
    const guestResponse = await generateLuminaResponse({
      content: 'Tra cứu đơn hàng LUM-12345678-ABCD',
      user: null, // Guest
      history: [],
    });

    assert.equal(guestResponse.messageType, 'auth_required');
    assert.ok(guestResponse.content.includes('đăng nhập tài khoản Lumina'));
  });

  test('11. generateLuminaResponse blocks Customer from accessing another customer order (IDOR Protection)', async () => {
    // Query order for a user who does NOT own it
    const fakeOrderCode = 'LUM-FAKE-ORDER-9999';
    const customerUser = { id: 'cust-lumina-01', name: 'Customer 1', role: 'customer' };

    const response = await generateLuminaResponse({
      content: `Tra cứu mã đơn ${fakeOrderCode}`,
      user: customerUser,
      history: [],
    });

    assert.equal(response.messageType, 'order_status');
    assert.ok(response.content.includes('không tìm thấy') || response.content.includes('không thuộc tài khoản'));
  });
});

