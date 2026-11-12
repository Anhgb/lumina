import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Sparkles,
  Box,
  ShoppingBag,
  ArrowRight,
  Eye,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { useCustomGlasses } from '../hooks/useCustomGlasses';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import AIVirtualTryOn from '../components/tryon/AIVirtualTryOn';
import FaceStylistPanel from '../components/tryon/FaceStylistPanel';
import { FRAME_MODELS } from '../data/frameModels';
import { FRAME_COLOR_ADDONS } from '../utils/pricingCalculator';

export default function TryOnPage() {
  const {
    designSpec,
    setBaseModel,
    setFrameColor,
    priceInfo,
  } = useCustomGlasses();

  const { addToCart } = useCart();
  const { requireAuth } = useAuth();

  const [faceAnalysis, setFaceAnalysis] = useState(null);
  const [justAdded, setJustAdded] = useState(false);
  const [activeModelGroup, setActiveModelGroup] = useState(() => FRAME_MODELS.find((model) => model.id === designSpec.baseModel)?.group || 'classic');
  useEffect(() => {
    const selected = FRAME_MODELS.find((model) => model.id === designSpec.baseModel);
    if (selected) setActiveModelGroup(selected.group);
  }, [designSpec.baseModel]);

  // Add current try-on design to cart
  const handleAddToCart = () => {
    requireAuth(
      () => {
        const cartItem = {
          id: `custom-tryon-${Date.now()}`,
          productId: `tryon-${designSpec.baseModel}`,
          name: `Lumina Try-On 3D — ${priceInfo.modelName}`,
          category: designSpec.baseModel,
          categoryLabel: `AI Try-On (${designSpec.baseModel})`,
          price: priceInfo.total,
          image: '/assets/logo-lumina.jpg',
          quantity: 1,
          stock: 99,
          productType: 'custom',
          designSpec: { ...designSpec },
          frameMaterial: priceInfo.frameColorName,
          dimensions: 'Tỷ lệ AI Webcam',
        };

        const res = addToCart(cartItem, 1);
        if (res?.success) {
          setJustAdded(true);
          setTimeout(() => setJustAdded(false), 2500);
        }
      },
      {
        requiredRole: 'customer',
        message:
          'Vui lòng đăng nhập Lumina Eyewear trước khi lưu cấu hình kính và thực hiện mua hàng.',
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#FAF8F5] pb-24 font-body">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <ol className="flex items-center space-x-2 text-xs text-[#FAF8F5]/60 font-body">
          <li>
            <Link to="/" className="hover:text-[#D4AF37] transition-colors">
              Trang chủ
            </Link>
          </li>
          <ChevronRight className="w-3.5 h-3.5 text-[#FAF8F5]/30" />
          <li>
            <Link to="/studio-3d" className="hover:text-[#D4AF37] transition-colors">
              3D Atelier
            </Link>
          </li>
          <ChevronRight className="w-3.5 h-3.5 text-[#FAF8F5]/30" />
          <li className="font-semibold text-[#D4AF37] tracking-wide" aria-current="page">
            AI Virtual Try-On
          </li>
        </ol>
      </nav>

      {/* 2. Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D6D3CD]/15 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-[11px] font-mono uppercase tracking-widest border border-[#D4AF37]/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GOOGLE MEDIAPIPE FACE LANDMARKER</span>
            </div>
            <h1 className="font-brand text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#FAF8F5]">
              AI Virtual Try-On & Face Stylist
            </h1>
            <p className="text-xs sm:text-sm text-[#FAF8F5]/70 max-w-2xl font-body leading-relaxed">
              Trải nghiệm ướm thử kính thời gian thực qua webcam với công nghệ nhận diện 478 điểm mốc,
              tự động phân tích 5 dáng mặt và tư vấn phong cách kính tôn vinh đường nét khuôn mặt của bạn.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-[#D4AF37]">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
            </span>
            <span>478-Point Face Mesh Live</span>
          </div>
        </div>
      </header>

      {/* 3. Quick Eyewear Model & Finish Switcher */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-[#141413] border border-[#D6D3CD]/20 p-4 rounded-sm space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase text-[#FAF8F5]/60">Dáng kính đang thử</span>
              <div className="flex gap-1 rounded-sm border border-[#D6D3CD]/20 p-1">
                {[
                  { id: 'classic', label: 'Classic' },
                  { id: 'trending', label: 'Trending 2026' },
                ].map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveModelGroup(group.id)}
                    aria-pressed={activeModelGroup === group.id}
                    className={`px-2.5 py-1 text-[9px] uppercase tracking-wider rounded-sm ${activeModelGroup === group.id ? 'bg-[#D4AF37] text-[#141413] font-bold' : 'text-[#FAF8F5]/60 hover:text-white'}`}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {FRAME_MODELS.filter((model) => model.group === activeModelGroup).map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setBaseModel(model.id)}
                  aria-pressed={designSpec.baseModel === model.id}
                  title={model.description}
                  className={`px-3 py-1.5 rounded-sm text-[10px] font-semibold uppercase tracking-wider border ${designSpec.baseModel === model.id ? 'bg-[#D4AF37] text-[#141413] border-[#D4AF37]' : 'bg-[#0D0D0D] border-[#D6D3CD]/30 text-[#FAF8F5] hover:border-[#D4AF37]'}`}
                >
                  {model.shortName}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-[#FAF8F5]/45 mt-2">Gợi ý kiểu dáng mang tính tham khảo; bạn có thể tự chọn bất kỳ mẫu nào.</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#D6D3CD]/10 pt-3">
            <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-[#FAF8F5]/60 mr-1">Màu gọng:</span>
            {[
              { id: '#D4AF37', label: 'Vàng 18K', color: '#D4AF37' },
              { id: '#141413', label: 'Đen Onyx', color: '#141413' },
              { id: '#C0C0C0', label: 'Bạc Titan', color: '#C0C0C0' },
              {
                id: 'tortoiseshell',
                label: 'Đồi Mồi',
                color: 'radial-gradient(circle, #E69C24, #964B00)',
              },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFrameColor(c.id, FRAME_COLOR_ADDONS[c.id].metalness, FRAME_COLOR_ADDONS[c.id].roughness)}
                className={`w-6 h-6 rounded-full border transition-transform ${
                  designSpec.frameColor === c.id
                    ? 'border-[#D4AF37] scale-125 shadow-md shadow-[#D4AF37]/30'
                    : 'border-white/20 hover:scale-110'
                }`}
                style={{ background: c.color }}
                title={c.label}
              />
            ))}
            </div>
            <div className="text-[10px] font-mono text-[#D4AF37]">Ước tính: {new Intl.NumberFormat('vi-VN').format(priceInfo.total)} ₫</div>
          </div>
        </div>
      </section>

      {/* 4. Main Try-On Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Webcam Try-On Viewport (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <AIVirtualTryOn
              designSpec={designSpec}
              onFaceAnalyzed={setFaceAnalysis}
              className="min-h-[480px] sm:min-h-[540px]"
            />

            {/* Quick Action Navigation Bar */}
            <div className="bg-[#141413] border border-[#D6D3CD]/20 p-4 rounded-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  to={`/studio-3d?model=${designSpec.baseModel}`}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white/5 border border-[#D6D3CD]/30 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors rounded-sm text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Box className="w-4 h-4 text-[#D4AF37]" />
                  <span>Mở Xưởng 3D Phối Màu Chi Tiết</span>
                </Link>

                <Link
                  to="/catalog"
                  className="hidden sm:inline-flex px-3 py-2.5 text-xs text-[#FAF8F5]/60 hover:text-[#FAF8F5] transition-colors"
                >
                  Xem Catalog
                </Link>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#FAF8F5] text-[#141413] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2 shadow-md"
              >
                <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                <span>{justAdded ? 'Đã thêm vào giỏ!' : 'Thêm mẫu đang thử vào giỏ'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: AI Face Stylist Analysis & Recommendations (5 cols) */}
          <div className="lg:col-span-5">
            <FaceStylistPanel
              faceAnalysis={faceAnalysis}
              currentModel={designSpec.baseModel}
              onSelectModel={setBaseModel}
              onSelectColor={setFrameColor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
