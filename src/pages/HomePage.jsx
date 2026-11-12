import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Box,
  ArrowRight,
  ShieldCheck,
  Eye,
  Layers,
  Star,
  ChevronRight,
  Cpu,
  Gem,
  Zap,
} from 'lucide-react';
import HeroSlider from '../components/common/HeroSlider';

/* ─────────────────────────────────────────────────
   Simple intersection-observer hook for reveal anims
───────────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─────────────────────────────────────────────────
   Data
───────────────────────────────────────────────── */
const COLLECTIONS = [
  {
    id: 'cateye',
    name: 'Cyber Cat-Eye',
    tagline: 'Sắc sảo & Nữ quyền',
    description:
      'Đường nét Browline vuốt ngược lấy cảm hứng từ biểu tượng Monogram L độc quyền.',
    link: '/catalog?category=cateye',
    badge: 'Bán chạy nhất',
    image: '/assets/hero-cateye.jpg',
    imageAlt: 'Cyber Cat-Eye sunglasses worn by model in boutique',
  },
  {
    id: 'aviator',
    name: 'Titanium Aviator',
    tagline: 'Phóng khoáng & Bất hủ',
    description:
      'Khung cầu đôi kim loại mạ vàng Champagne, nhẹ tênh và chống oxy hóa tuyệt đối.',
    link: '/catalog?category=aviator',
    badge: 'Cổ điển',
    image: '/assets/hero-aviator.jpg',
    imageAlt: 'Gold titanium aviator sunglasses on dark marble surface',
  },
  {
    id: 'round',
    name: 'Artisan Round',
    tagline: 'Trí thức & Tối giản',
    description:
      'Gọng tròn hoàn hảo cho khuôn mặt góc cạnh, đính đá pha lê Swarovski viền mắt.',
    link: '/catalog?category=round',
    badge: 'Nghệ thuật',
    image: '/assets/collection-round.jpg',
    imageAlt: 'Gold round eyeglasses on cream velvet fabric',
  },
  {
    id: 'square',
    name: 'Architect Square',
    tagline: 'Vững chãi & Hiện đại',
    description:
      'Dáng vuông vức kiến trúc, tạo điểm nhấn cá tính mạnh mẽ cho người sở hữu.',
    link: '/catalog?category=square',
    badge: 'Mới ra mắt',
    image: '/assets/collection-square.jpg',
    imageAlt: 'Black and gold square architect eyeglasses on stone surface',
  },
];

const FEATURES = [
  {
    icon: Cpu,
    title: 'AI Face Landmark',
    value: '478',
    unit: 'điểm mốc 3D',
    desc: 'Nhận diện khuôn mặt và ước lượng 5 nhóm dáng mặt theo chuẩn nhân trắc học y tế.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  {
    icon: Gem,
    title: 'Swarovski Crystal',
    value: '18K',
    unit: 'Gold / Titanium',
    desc: 'Vật liệu cao cấp từ vàng nguyên khối đến titan hàng không, bền và nhẹ tuyệt vời.',
    color: 'text-[#D4AF37]',
    bgColor: 'bg-[#D4AF37]/10',
  },
  {
    icon: Zap,
    title: 'Real-time 3D Render',
    value: '60',
    unit: 'FPS WebGL',
    desc: 'Trình duyệt 3D WebGL xử lý real-time, xoay 360° mượt mà trên mọi thiết bị.',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
  },
];

const TESTIMONIALS = [
  {
    id: 1,
    name: 'Nguyễn Minh Anh',
    role: 'Fashion Designer, Hà Nội',
    avatar: '👤',
    text: 'Trải nghiệm thử kính AI hoàn toàn thay đổi cách tôi chọn gọng. Chính xác đến kinh ngạc.',
    stars: 5,
  },
  {
    id: 2,
    name: 'Trần Phương Linh',
    role: 'Creative Director, TP. HCM',
    avatar: '👤',
    text: 'Xưởng 3D Bespoke cho phép tôi tùy chỉnh từng chi tiết nhỏ. Đây là tương lai của eyewear.',
    stars: 5,
  },
  {
    id: 3,
    name: 'Lê Bảo Khang',
    role: 'Architect, Đà Nẵng',
    avatar: '👤',
    text: 'Chất lượng vật liệu tuyệt vời. Khung Titanium nhẹ hơn tôi tưởng rất nhiều.',
    stars: 5,
  },
];

/* ─────────────────────────────────────────────────
   Component
───────────────────────────────────────────────── */
export default function HomePage() {
  const [manifestoRef, manifestoVisible] = useReveal();
  const [techRef, techVisible] = useReveal();
  const [collectionsRef, collectionsVisible] = useReveal();
  const [craftsRef, craftsVisible] = useReveal();
  const [statsRef, statsVisible] = useReveal();
  const [testimonialsRef, testimonialsVisible] = useReveal();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413] overflow-x-hidden">
      {/* ══════════════════ 1. HERO SLIDER ══════════════════ */}
      <section aria-label="Hero Showcase">
        <HeroSlider />
      </section>

      {/* ══════════════════ 2. SCROLLING TICKER ══════════════════ */}
      <div className="bg-[#D4AF37] py-2.5 overflow-hidden">
        <div className="flex animate-[ticker_20s_linear_infinite] whitespace-nowrap">
          {Array(3)
            .fill([
              'TITANIUM FRAMES',
              'SWAROVSKI CRYSTAL',
              'AI FACE ANALYSIS',
              '3D BESPOKE STUDIO',
              'WEBGL REAL-TIME',
              'EDGE AI ON-DEVICE',
            ])
            .flat()
            .map((text, i) => (
              <span
                key={`ticker-${text}-${i}`}
                className="text-[#141413] text-[11px] font-bold uppercase tracking-[0.3em] mx-8 flex-shrink-0"
              >
                ✦ {text}
              </span>
            ))}
        </div>
        {/* Keyframes chuyển vào index.css — không cần inline <style> nữa */}
      </div>

      {/* ══════════════════ 3. BRAND MANIFESTO ══════════════════ */}
      <section
        ref={manifestoRef}
        className={`py-24 lg:py-32 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-1000 ${
          manifestoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37] mb-4">
          ✦ LUMINA PHILOSOPHY
        </div>

        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-light leading-[1.1] text-[#141413] mb-6">
          Khi Kỹ Nghệ Thủ Công
          <br />
          <span className="italic font-normal">Chạm Ngõ Trí Tuệ Nhân Tạo</span>
        </h2>

        <div className="w-16 h-[1.5px] bg-[#D4AF37] mx-auto my-8" />

        <p className="text-sm sm:text-base text-[#141413]/70 font-body leading-relaxed max-w-3xl mx-auto mb-10">
          Tại Lumina Eyewear, chúng tôi tin rằng một cặp kính không đơn thuần là phụ kiện thị lực.
          Đó là lời tuyên ngôn phong cách độc bản. Bằng cách kết hợp mô hình phân tích nhân trắc học
          MediaPipe và phòng chế tác 3D WebGL thời gian thực, Lumina trao cho bạn toàn quyền kiến
          tạo tác phẩm nghệ thuật thuộc về riêng bạn.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold tracking-[0.2em] text-[#141413]/60 uppercase">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            Độ Chuẩn Xác Y Khoa
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            Cá Nhân Hóa 3D
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            Bảo Mật Webcam Tuyệt Đối
          </span>
        </div>
      </section>

      {/* ══════════════════ 4. STATS ROW ══════════════════ */}
      <section
        ref={statsRef}
        className="py-16 bg-[#141413] text-[#FAF8F5]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-8 text-center transition-all duration-1000 ${
            statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            {[
              { value: '478', label: 'Điểm Mốc Khuôn Mặt', desc: 'Face Landmarks AI' },
              { value: '5+', label: 'Dáng Mặt Phân Tích', desc: 'Face Shape Types' },
              { value: '360°', label: 'Xem Trước 3D', desc: 'Real-time WebGL' },
              { value: '100%', label: 'Bảo Mật Dữ Liệu', desc: 'On-device Processing' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-2">
                <div className="font-display text-4xl sm:text-5xl font-light text-[#D4AF37]">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-[#FAF8F5] tracking-wide">{stat.label}</div>
                <div className="text-[11px] text-[#FAF8F5]/40 uppercase tracking-[0.2em]">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ 5. DUAL TECH HIGHLIGHT ══════════════════ */}
      <section
        ref={techRef}
        className={`py-20 lg:py-28 transition-all duration-1000 ${
          techVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37] mb-4">
              ✦ Đột Phá Trải Nghiệm Mua Sắm Trực Tuyến
            </div>
            <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-light text-[#141413]">
              Hai Công Nghệ Độc Quyền
              <br />
              <span className="italic">Phía Trình Duyệt</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* AI Try-On Card */}
            <Link to="/try-on" className="group relative overflow-hidden rounded-sm bg-[#141413] border border-[#D6D3CD]/20 hover:border-[#D4AF37]/60 transition-all duration-500 block">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="/assets/hero-cateye.jpg"
                  alt="AI Virtual Try-On Feature"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141413] via-[#141413]/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase">
                    Edge AI · MediaPipe
                  </span>
                </div>
                <h4 className="font-display text-2xl sm:text-3xl font-light text-[#FAF8F5] mb-2">
                  AI Face Stylist &<br />Virtual Try-On
                </h4>
                <p className="text-xs text-[#FAF8F5]/60 font-body leading-relaxed mb-4">
                  478 điểm mốc 3D. 5 nhóm dáng mặt. Gợi ý gọng kính tức thì.
                </p>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37] group-hover:gap-3 transition-all">
                  Mở phòng thử <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>

            {/* 3D Studio Card */}
            <Link to="/studio-3d" className="group relative overflow-hidden rounded-sm bg-[#141413] border border-[#D6D3CD]/20 hover:border-[#D4AF37]/60 transition-all duration-500 block">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="/assets/hero-aviator.jpg"
                  alt="3D Bespoke Custom Studio"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141413] via-[#141413]/40 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center">
                    <Box className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase">
                    Three.js · WebGL
                  </span>
                </div>
                <h4 className="font-display text-2xl sm:text-3xl font-light text-[#FAF8F5] mb-2">
                  3D Bespoke<br />Custom Studio
                </h4>
                <p className="text-xs text-[#FAF8F5]/60 font-body leading-relaxed mb-4">
                  Tùy biến vật liệu, màu sắc, tông tối. Xuất snapshot watermark.
                </p>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37] group-hover:gap-3 transition-all">
                  Bắt đầu thiết kế <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════ 6. FEATURED COLLECTIONS ══════════════════ */}
      <section
        ref={collectionsRef}
        className={`py-20 border-t border-[#D6D3CD] transition-all duration-1000 ${
          collectionsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 pb-6 border-b border-[#D6D3CD]">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37] mb-2">
                ✦ CATALOG PREVIEW
              </div>
              <h3 className="font-display text-3xl sm:text-4xl font-light text-[#141413]">
                Bộ Sưu Tập Gọng Kính Biểu Tượng
              </h3>
            </div>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#141413] hover:text-[#D4AF37] transition-colors"
            >
              <span>Xem tất cả sản phẩm</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {COLLECTIONS.map((item, i) => (
              <div
                key={item.id}
                className="group bg-white border border-[#D6D3CD] rounded-sm overflow-hidden flex flex-col transition-all duration-400 hover:shadow-xl hover:border-[#141413] hover:-translate-y-1"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {/* Product Image */}
                <div className="relative aspect-[4/3] overflow-hidden bg-[#FAF8F5]">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-[#141413] text-[#FAF8F5] rounded-sm">
                      {item.badge}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex-1 space-y-2 mb-4">
                    <h4 className="font-brand text-base font-bold text-[#141413]">{item.name}</h4>
                    <p className="text-[11px] text-[#D4AF37] font-semibold tracking-wider uppercase">
                      {item.tagline}
                    </p>
                    <p className="text-xs text-[#141413]/65 font-body leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <Link
                    to={item.link}
                    className="w-full py-2.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-semibold uppercase tracking-wider rounded-sm flex items-center justify-center gap-2"
                  >
                    <span>Xem Chi Tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ 7. CRAFTSMANSHIP FULLWIDTH BANNER ══════════════════ */}
      <section
        ref={craftsRef}
        className="relative overflow-hidden"
      >
        <div className="relative h-[480px] sm:h-[560px] lg:h-[640px]">
          <img
            src="/assets/lifestyle-craftsmanship.jpg"
            alt="Lumina Eyewear artisan craftsman adjusting premium gold eyeglass frames"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1200 ${
              craftsVisible ? 'scale-100' : 'scale-110'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141413]/95 via-[#141413]/70 to-transparent" />

          <div className={`relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center max-w-xl transition-all duration-1000 delay-300 ${
            craftsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
          }`}>
            <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37] mb-5">
              ✦ LUMINA ATELIER
            </div>
            <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-light text-[#FAF8F5] leading-[1.1] mb-6">
              Từ Bàn Tay Người
              <br />
              <span className="italic">Thợ Thủ Công Lành Nghề</span>
            </h3>
            <div className="w-12 h-[1.5px] bg-[#D4AF37] mb-6" />
            <p className="text-sm text-[#FAF8F5]/75 font-body leading-relaxed mb-8 max-w-md">
              Mỗi cặp kính Lumina đều qua 47 công đoạn kiểm định tinh tế. Từ việc lựa chọn nguyên
              vật liệu cho đến lắp ráp thủ công cuối cùng, chúng tôi bảo đảm từng sản phẩm là
              một tác phẩm nghệ thuật hoàn hảo.
            </p>
            <Link
              to="/studio-3d"
              className="inline-flex items-center gap-3 px-6 py-3.5 bg-[#D4AF37] text-[#141413] hover:bg-[#FAF8F5] transition-all duration-300 font-semibold text-xs uppercase tracking-[0.25em] rounded-sm w-fit group"
            >
              <span>Thiết Kế Kính Của Bạn</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════ 8. TECH FEATURE CARDS ══════════════════ */}
      <section className="py-20 bg-[#141413] text-[#FAF8F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37] mb-4">
              ✦ TECHNOLOGY EDGE
            </div>
            <h3 className="font-display text-3xl sm:text-4xl font-light">
              Công Nghệ Phía Sau Lumina
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="group bg-[#0D0D0D] border border-[#D6D3CD]/15 p-7 rounded-sm hover:border-[#D4AF37]/50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-full ${feat.bgColor} border border-[${feat.color}]/30 flex items-center justify-center mb-5`}>
                  <feat.icon className={`w-5 h-5 ${feat.color}`} />
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`font-display text-4xl font-light ${feat.color}`}>{feat.value}</span>
                  <span className="text-xs text-[#FAF8F5]/50 uppercase tracking-wider">{feat.unit}</span>
                </div>
                <h5 className="font-brand text-sm font-semibold text-[#FAF8F5] mb-2 uppercase tracking-wide">{feat.title}</h5>
                <p className="text-xs text-[#FAF8F5]/55 font-body leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ 9. TESTIMONIALS ══════════════════ */}
      <section
        ref={testimonialsRef}
        className={`py-20 bg-[#FAF8F5] border-t border-[#D6D3CD] transition-all duration-1000 ${
          testimonialsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37] mb-4">
              ✦ KHÁCH HÀNG NÓI GÌ
            </div>
            <h3 className="font-display text-3xl sm:text-4xl font-light text-[#141413]">
              Trải Nghiệm Từ Cộng Đồng Lumina
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={t.id}
                className="bg-white border border-[#D6D3CD] p-7 rounded-sm space-y-4 hover:shadow-lg hover:border-[#141413]/30 transition-all duration-300"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex gap-1">
                  {Array(t.stars)
                    .fill(null)
                    .map((_, si) => (
                      <Star key={si} className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                    ))}
                </div>
                <p className="text-sm text-[#141413]/75 font-body leading-relaxed italic">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-[#D6D3CD]/60">
                  <div className="w-8 h-8 rounded-full bg-[#141413]/10 flex items-center justify-center text-base">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#141413]">{t.name}</div>
                    <div className="text-[11px] text-[#141413]/50">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ 10. STANDARDS BANNER ══════════════════ */}
      <section className="py-16 bg-white border-t border-[#D6D3CD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: 'Kiểm Định Chuẩn Nhãn Khoa',
                desc: 'Ràng buộc chặt chẽ độ lệch SPH < 4.0 Diop, kiểm tra PD 50–75mm và loại trừ gọng không tương thích độ cận cao.',
              },
              {
                icon: Eye,
                title: 'Watermark Độc Quyền',
                desc: 'Mỗi bản xuất 3D đều được gắn watermark LUMINA EYEWEAR xác thực bản quyền thiết kế trước khi đưa vào giỏ hàng.',
              },
              {
                icon: Layers,
                title: 'Kiến Trúc Đa Nguồn',
                desc: 'Kết hợp nhịp nhàng MockAPI, Postman Mock Server, LocalStorage và Backend Database XAMPP MySQL.',
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 group">
                <div className="p-3 bg-[#FAF8F5] border border-[#D6D3CD] rounded text-[#D4AF37] flex-shrink-0 group-hover:bg-[#141413] group-hover:border-[#141413] transition-colors duration-300">
                  <item.icon className="w-5 h-5 group-hover:text-[#D4AF37]" />
                </div>
                <div className="space-y-1.5">
                  <h5 className="font-brand text-sm font-bold uppercase tracking-wider text-[#141413]">
                    {item.title}
                  </h5>
                  <p className="text-xs text-[#141413]/65 leading-relaxed font-body">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ 11. CTA STRIP ══════════════════ */}
      <section className="py-20 bg-[#141413] text-center">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4AF37] mb-5">
            ✦ BẮT ĐẦU HÀNH TRÌNH CỦA BẠN
          </div>
          <h3 className="font-display text-4xl sm:text-5xl font-light text-[#FAF8F5] mb-6">
            Tạo Nên Cặp Kính
            <br />
            <span className="italic">Chỉ Dành Riêng Cho Bạn</span>
          </h3>
          <p className="text-sm text-[#FAF8F5]/60 font-body mb-10 leading-relaxed">
            Từ AI Face Stylist đến Xưởng Chế Tác 3D Độc Bản — Lumina cung cấp trải nghiệm
            mua sắm kính cao cấp chưa từng có trên môi trường trực tuyến.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/try-on"
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#D4AF37] text-[#141413] hover:bg-[#FAF8F5] transition-all duration-300 font-semibold text-xs uppercase tracking-[0.25em] rounded-sm group"
            >
              <Sparkles className="w-4 h-4" />
              Thử Kính AI Miễn Phí
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-3 px-8 py-4 border border-[#FAF8F5]/30 text-[#FAF8F5] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-300 font-semibold text-xs uppercase tracking-[0.25em] rounded-sm"
            >
              Xem Catalog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
