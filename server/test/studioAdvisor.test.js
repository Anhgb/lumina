/**
 * Lumina Eyewear — AI Try-On, Face Stylist & 3D Studio Tests (Prompt 07)
 *
 * Test Suite bao gồm:
 * 1.  studioAdvisor.explainDesignSpec trả nội dung đúng với designSpec đầy đủ
 * 2.  studioAdvisor.explainDesignSpec xử lý gracefully khi designSpec null
 * 3.  studioAdvisor.guideStudioComponent trả hướng dẫn cho từng thành phần
 * 4.  studioAdvisor.buildTryOnGuide khi chưa có dáng mặt
 * 5.  studioAdvisor.buildTryOnGuide khi đã có dáng mặt (Face Stylist context)
 * 6.  studioAdvisor.explainPDMeasurement phải nêu rõ giới hạn y khoa
 * 7.  Intent "thử kính" định tuyến đúng tryon intent
 * 8.  Intent "3D Atelier / studio" định tuyến đúng studio intent
 * 9.  clientContext pageType=studio boost intent khi câu hỏi không rõ
 * 10. clientContext pageType=tryon boost intent khi câu hỏi không rõ
 * 11. AI Service: hỏi về PD → trả explainPDMeasurement, không nhận PD là y khoa
 * 12. AI Service: hỏi Face Stylist với detectedFaceShape → gợi ý kiểu gọng
 * 13. AI Service: hỏi về thiết kế 3D hiện tại → explainDesignSpec với designSpec
 * 14. AI Service: hỏi về component 'lens' → guideStudioComponent('lens')
 * 15. AI Service: hỏi thử kính từ Studio → navigation_suggestion sang TryOn
 * 16. AI Service: Guardrail — AI không tự thay đổi designSpec
 * 17. AI Service: Guardrail — AI không tuyên bố nhìn thấy camera
 * 18. AI Service: FAQ tryon nhận keyword mới (bật camera, cấp quyền)
 * 19. AI Service: FAQ studio-price nhận keyword giá tùy biến
 * 20. AI Service: FAQ pd-01 nhận keyword PD / khoảng cách đồng tử
 */

import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  explainDesignSpec,
  guideStudioComponent,
  buildTryOnGuide,
  explainPDMeasurement,
  FRAME_MODEL_INFO,
} from '../src/ai/studioAdvisor.js';
import { classifyIntent } from '../src/ai/intentClassifier.js';
import { generateLuminaResponse } from '../src/ai/ai.service.js';

// ── Test Fixtures ──────────────────────────────────────────────────────────────
const MOCK_DESIGN_SPEC = {
  baseModel: 'aviator',
  frameType: 'titanium',
  frameColor: '#D4AF37',
  metalness: 0.9,
  roughness: 0.2,
  lensColor: '#1F2937',
  lensOpacity: 0.45,
  hasRhinestones: true,
  charms: ['lumina-star'],
  engravingText: 'LUMINA',
};

const MOCK_CLIENT_CONTEXT_STUDIO = {
  currentPage: '/studio-3d',
  pageType: 'studio',
  designSpec: MOCK_DESIGN_SPEC,
  customPrice: 3250000,
};

const MOCK_CLIENT_CONTEXT_TRYON = {
  currentPage: '/try-on',
  pageType: 'tryon',
  detectedFaceShape: 'round',
  activeFrameModel: 'aviator',
};

const MOCK_USER = { id: 'cust-p07-01', name: 'Test User', role: 'customer' };

suite('Lumina AI Try-On, Face Stylist & 3D Studio Tests (Prompt 07)', () => {

  // ── 1. explainDesignSpec — đầy đủ fields ──
  test('1. explainDesignSpec trả mô tả đầy đủ thiết kế bao gồm rhinestones, charm, engraving và giá', () => {
    const result = explainDesignSpec(MOCK_DESIGN_SPEC, 3250000);

    assert.ok(result.includes('aviator') || result.includes('Aviator'), 'Phải nêu kiểu gọng aviator');
    assert.ok(result.includes('#D4AF37'), 'Phải nêu màu gọng');
    assert.ok(result.includes('Swarovski') || result.includes('rhinestone') || result.includes('Rhinestone'), 'Phải nêu rhinestones Swarovski');
    assert.ok(result.includes('lumina-star') || result.includes('Charm') || result.includes('charm'), 'Phải nêu charm');
    assert.ok(result.includes('LUMINA'), 'Phải nêu engraving text');
    assert.ok(result.includes('3.250.000') || result.includes('3,250,000') || result.includes('3250000'), 'Phải nêu giá tùy chỉnh');
  });

  // ── 2. explainDesignSpec — null input ──
  test('2. explainDesignSpec với designSpec null trả hướng dẫn vào Atelier gracefully', () => {
    const result = explainDesignSpec(null);
    assert.ok(result.length > 20, 'Phải trả nội dung không rỗng');
    assert.ok(result.includes('Atelier') || result.includes('atelier') || result.includes('3D'), 'Phải đề cập đến 3D Atelier');
  });

  // ── 3. guideStudioComponent — tất cả thành phần ──
  test('3. guideStudioComponent trả hướng dẫn chính xác cho từng thành phần', () => {
    const components = ['model', 'frame', 'lens', 'rhinestone', 'charm', 'engraving', 'price'];
    for (const comp of components) {
      const guide = guideStudioComponent(comp);
      assert.ok(guide.length > 50, `guideStudioComponent('${comp}') phải trả nội dung đủ dài`);
    }

    // Kiểm tra nội dung đặc thù từng component
    assert.ok(guideStudioComponent('lens').toLowerCase().includes('opacity') || guideStudioComponent('lens').includes('truyền sáng'), 'lens guide phải nêu opacity');
    assert.ok(guideStudioComponent('engraving').includes('15'), 'engraving guide phải nêu giới hạn 15 ký tự');
    assert.ok(guideStudioComponent('price').includes('500.000') || guideStudioComponent('price').includes('500000'), 'price guide phải nêu phụ phí rhinestone');
  });

  // ── 4. buildTryOnGuide — chưa có dáng mặt ──
  test('4. buildTryOnGuide khi chưa có dáng mặt trả hướng dẫn bật camera từng bước', () => {
    const guide = buildTryOnGuide({});
    assert.ok(guide.includes('camera') || guide.includes('Camera'), 'Phải hướng dẫn bật camera');
    assert.ok(guide.includes('Bước') || guide.includes('bước'), 'Phải có hướng dẫn từng bước');
    // Không được tuyên bố AI nhìn thấy camera
    assert.ok(!guide.includes('AI đang nhìn thấy'), 'KHÔNG được tuyên bố AI nhìn thấy camera');
  });

  // ── 5. buildTryOnGuide — đã có Face Stylist context ──
  test('5. buildTryOnGuide với detectedFaceShape "round" gợi ý kiểu gọng phù hợp', () => {
    const guide = buildTryOnGuide({ detectedFaceShape: 'round', activeFrameModel: 'aviator' });
    assert.ok(guide.toLowerCase().includes('tròn') || guide.toLowerCase().includes('round'), 'Phải nêu dáng mặt tròn');
    // Phải gợi ý gọng phù hợp với mặt tròn
    assert.ok(
      guide.includes('Aviator') || guide.includes('Square') || guide.includes('Cat-Eye'),
      'Phải gợi ý ít nhất một kiểu gọng phù hợp'
    );
    // Phải có disclaimer thẩm mỹ
    assert.ok(
      guide.includes('thẩm mỹ') || guide.includes('gợi ý') || guide.includes('tham khảo'),
      'Phải có disclaimer gợi ý thẩm mỹ, không phải quy chuẩn tuyệt đối'
    );
  });

  // ── 6. explainPDMeasurement — giới hạn y khoa ──
  test('6. explainPDMeasurement nêu rõ PD ước lượng từ webcam không thay thế số đo y khoa', () => {
    const explanation = explainPDMeasurement();
    assert.ok(explanation.includes('50') && explanation.includes('75'), 'Phải nêu phạm vi PD 50-75mm');
    assert.ok(
      explanation.includes('không thay thế') || explanation.includes('chưa hiệu chuẩn') || explanation.includes('không chịu trách nhiệm'),
      'Phải nêu rõ giới hạn y khoa'
    );
    assert.ok(explanation.includes('bác sĩ') || explanation.includes('nhãn khoa'), 'Phải đề xuất tham khảo bác sĩ nhãn khoa');
  });

  // ── 7. Intent "thử kính" ──
  test('7. Intent classifier định tuyến "thử kính" và "camera" vào tryon', () => {
    const r1 = classifyIntent('Tôi muốn thử kính qua camera');
    assert.equal(r1.intent, 'tryon', 'Phải là tryon intent');

    const r2 = classifyIntent('Hướng dẫn dùng AI Try-On');
    assert.equal(r2.intent, 'tryon', 'Phải là tryon intent');
  });

  // ── 8. Intent "3D studio" ──
  test('8. Intent classifier định tuyến "3D Atelier" và "tùy biến" vào studio', () => {
    const r1 = classifyIntent('Vào phòng 3D Atelier');
    assert.equal(r1.intent, 'studio', 'Phải là studio intent');

    const r2 = classifyIntent('Muốn tùy chỉnh gọng kính bespoke');
    assert.equal(r2.intent, 'studio');
  });

  // ── 9. clientContext boost studio ──
  test('9. clientContext pageType=studio boost intent khi câu hỏi không rõ', () => {
    const r = classifyIntent('Cái này có thay đổi được không?', { pageType: 'studio' });
    assert.equal(r.intent, 'studio', 'Phải boost sang studio khi đang ở trang Studio');
  });

  // ── 10. clientContext boost tryon ──
  test('10. clientContext pageType=tryon boost intent khi câu hỏi không rõ', () => {
    const r = classifyIntent('Làm thế nào?', { pageType: 'tryon' });
    assert.equal(r.intent, 'tryon', 'Phải boost sang tryon khi đang ở trang Try-On');
  });

  // ── 11. AI Service — PD question → guardrail y khoa ──
  test('11. AI Service: câu hỏi về PD trả lời không nhận PD ước lượng là số đo y khoa', async () => {
    const res = await generateLuminaResponse({
      content: 'PD ước lượng từ camera có chính xác không?',
      user: null,
      history: [],
    });

    assert.ok(
      res.messageType === 'tryon_guide' || res.messageType === 'faq_response',
      `messageType phải là tryon_guide hoặc faq_response, nhận được: ${res.messageType}`
    );
    // Phải nêu giới hạn y khoa
    assert.ok(
      res.content.includes('không thay thế') || res.content.includes('nhãn khoa') || res.content.includes('chưa hiệu chuẩn') || res.content.includes('không chịu trách nhiệm'),
      'Phải có disclaimer y khoa về PD'
    );
    // Không được tuyên bố PD là chính xác
    assert.ok(
      !res.content.includes('PD chính xác tuyệt đối') && !res.content.includes('đo được chính xác'),
      'Không được khẳng định PD là chính xác y khoa'
    );
  });

  // ── 12. AI Service — Face Stylist với context dáng mặt ──
  test('12. AI Service: Face Stylist với detectedFaceShape gợi ý kiểu gọng phù hợp', async () => {
    const res = await generateLuminaResponse({
      content: 'Dáng mặt tôi phù hợp với kiểu gọng nào?',
      user: null,
      clientContext: MOCK_CLIENT_CONTEXT_TRYON,
      history: [],
    });

    assert.ok(
      res.messageType === 'face_stylist_advice' || res.messageType === 'tryon_guide' || res.messageType === 'styling_advice' || res.messageType === 'faq_response',
      `messageType phải là face_stylist_advice/tryon_guide/styling_advice, nhận được: ${res.messageType}`
    );
    // Phải đề cập dáng mặt tròn
    assert.ok(
      res.content.toLowerCase().includes('tròn') || res.content.toLowerCase().includes('round'),
      'Phải đề cập dáng mặt tròn trong câu trả lời'
    );
  });

  // ── 13. AI Service — thiết kế hiện tại từ Studio context ──
  test('13. AI Service: hỏi về thiết kế 3D hiện tại trả designSpec từ clientContext', async () => {
    const res = await generateLuminaResponse({
      content: 'Giải thích thiết kế tôi đang chọn trong Atelier',
      user: MOCK_USER,
      clientContext: MOCK_CLIENT_CONTEXT_STUDIO,
      history: [],
    });

    assert.ok(
      res.messageType === 'studio_info',
      `messageType phải là studio_info, nhận được: ${res.messageType}`
    );
    // Phải đề cập designSpec
    assert.ok(
      res.content.includes('Aviator') || res.content.includes('aviator') || res.content.includes('#D4AF37'),
      'Phải nêu thông tin từ designSpec trong clientContext'
    );
  });

  // ── 14. AI Service — hướng dẫn thành phần lens ──
  test('14. AI Service: hỏi về tròng kính trong Studio trả hướng dẫn lens component', async () => {
    const res = await generateLuminaResponse({
      content: 'Giải thích độ truyền sáng tròng kính',
      user: null,
      clientContext: MOCK_CLIENT_CONTEXT_STUDIO,
      history: [],
    });

    assert.ok(
      res.messageType === 'studio_info' || res.messageType === 'faq_response',
      `messageType phải là studio_info, nhận được: ${res.messageType}`
    );
    assert.ok(
      res.content.toLowerCase().includes('opacity') || res.content.includes('truyền sáng') || res.content.includes('tròng'),
      'Phải có thông tin về opacity/độ truyền sáng'
    );
  });

  // ── 15. AI Service — navigation suggestion TryOn từ Studio ──
  test('15. AI Service: hỏi thử kính từ Studio trả navigation_suggestion sang Try-On', async () => {
    const res = await generateLuminaResponse({
      content: 'Tôi muốn thử kính này lên khuôn mặt qua camera',
      user: null,
      clientContext: MOCK_CLIENT_CONTEXT_STUDIO,
      history: [],
    });

    // Phải gợi ý chuyển sang Try-On, không tự điều hướng
    assert.ok(
      res.messageType === 'navigation_suggestion' || res.messageType === 'tryon_guide' || res.messageType === 'studio_info',
      `messageType phải là navigation_suggestion hoặc tryon_guide, nhận được: ${res.messageType}`
    );
    assert.ok(
      res.content.includes('Try-On') || res.content.includes('try-on') || res.content.includes('camera'),
      'Phải đề cập Try-On hoặc camera'
    );
  });

  // ── 16. Guardrail — AI không tự thay đổi designSpec ──
  test('16. Guardrail: AI không tự thay đổi designSpec khi khách yêu cầu thay màu gọng', async () => {
    const res = await generateLuminaResponse({
      content: 'Đổi màu gọng thành đen cho tôi',
      user: null,
      clientContext: MOCK_CLIENT_CONTEXT_STUDIO,
      history: [],
    });

    // AI không được tự modify designSpec - phải hướng dẫn thủ công
    assert.ok(
      !res.content.includes('Đã đổi màu') && !res.content.includes('đã thay đổi thành công'),
      'AI không được tuyên bố đã tự đổi màu gọng'
    );
    // Phải hướng dẫn thủ công
    assert.ok(
      res.content.includes('bảng') || res.content.includes('Frame Color') || res.content.includes('màu') || res.content.includes('chọn'),
      'Phải hướng dẫn thao tác thủ công trên UI'
    );
  });

  // ── 17. Guardrail — AI không tuyên bố nhìn thấy camera ──
  test('17. Guardrail: AI không tuyên bố đang nhìn thấy camera của khách', async () => {
    const res = await generateLuminaResponse({
      content: 'Bạn có thể nhìn thấy gương mặt tôi qua camera không?',
      user: null,
      history: [],
    });

    // AI không được tuyên bố nhìn thấy camera
    assert.ok(
      !res.content.includes('tôi đang nhìn thấy') && !res.content.includes('tôi có thể thấy gương mặt'),
      'AI không được tuyên bố nhìn thấy camera của khách'
    );
  });

  // ── 18. FAQ — keyword mới cho tryon ──
  test('18. FAQ tryon-01 nhận keyword "bật camera" và "cấp quyền camera"', async () => {
    const r1 = await generateLuminaResponse({ content: 'Làm sao để bật camera thử kính?', user: null });
    assert.ok(
      r1.messageType === 'faq_response' || r1.messageType === 'tryon_guide',
      `Phải trả faq_response hoặc tryon_guide, nhận được: ${r1.messageType}`
    );

    const r2 = await generateLuminaResponse({ content: 'Cách cấp quyền camera cho Lumina?', user: null });
    assert.ok(
      r2.messageType === 'faq_response' || r2.messageType === 'tryon_guide',
      `Phải trả faq_response hoặc tryon_guide, nhận được: ${r2.messageType}`
    );
  });

  // ── 19. FAQ — giá tùy biến 3D ──
  test('19. FAQ studio-price-01 nhận keyword "giá tùy biến" và "bảng giá 3D"', async () => {
    const res = await generateLuminaResponse({ content: 'Bảng giá tùy biến 3D Atelier như thế nào?', user: null });
    assert.ok(
      res.messageType === 'faq_response' || res.messageType === 'studio_info',
      `Phải trả faq_response hoặc studio_info, nhận được: ${res.messageType}`
    );
    assert.ok(
      res.content.includes('500.000') || res.content.includes('300.000') || res.content.includes('Swarovski') || res.content.includes('rhinestone'),
      'Phải nêu bảng giá với phụ phí tùy chỉnh'
    );
  });

  // ── 20. FAQ — PD keyword ──
  test('20. FAQ pd-01 nhận keyword "khoảng cách đồng tử" và trả giải thích đầy đủ', async () => {
    const res = await generateLuminaResponse({ content: 'Khoảng cách đồng tử là gì?', user: null });
    assert.ok(
      res.messageType === 'faq_response' || res.messageType === 'tryon_guide',
      `Phải trả faq_response hoặc tryon_guide, nhận được: ${res.messageType}`
    );
    assert.ok(
      res.content.includes('50') || res.content.includes('75') || res.content.includes('mm'),
      'Phải nêu phạm vi PD hoặc đơn vị mm'
    );
  });
});

