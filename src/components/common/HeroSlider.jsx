import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkles, Box, ArrowRight } from 'lucide-react';

const SLIDES = [
  {
    id: 1,
    tag: 'CLIENT-SIDE EDGE AI',
    title: 'AI Face Stylist',
    subtitle: 'Định hình phong cách qua 478 điểm mốc nhân trắc học',
    description:
      'Hệ thống Computer Vision chạy trực tiếp trên trình duyệt, ước lượng 5 nhóm dáng mặt chuẩn xác và gợi ý mẫu gọng tôn vinh đường nét tự nhiên của bạn.',
    ctaText: 'Khám phá AI Stylist',
    ctaLink: '/try-on',
    ctaIcon: <Sparkles className="w-4 h-4" />,
    bgImage: '/assets/hero-cateye.jpg',
    overlayColor: 'from-[#0D0D0D]/90 via-[#141413]/70 to-transparent',
  },
  {
    id: 2,
    tag: '3D BESPOKE ATELIER',
    title: 'Xưởng Chế Tác 3D',
    subtitle: 'Cá nhân hóa mọi chi tiết gọng kính theo sở thích của bạn',
    description:
      'Phối màu gọng Vàng Champagne, Đen Obsidian hay Bạc Titanium. Tùy chỉnh độ tối tròng 0.10–0.95, đính đá pha lê và khắc tên riêng với đồ họa WebGL thời gian thực.',
    ctaText: 'Vào Xưởng Thiết Kế',
    ctaLink: '/studio-3d',
    ctaIcon: <Box className="w-4 h-4" />,
    bgImage: '/assets/hero-aviator.jpg',
    overlayColor: 'from-[#0D0D0D]/85 via-[#0D0D0D]/50 to-transparent',
  },
  {
    id: 3,
    tag: 'SEASONAL LOOKBOOK',
    title: 'Cyber Cat-Eye',
    subtitle: 'Giao thoa giữa nét cổ điển Parisian và hơi thở vị lai',
    description:
      'Đường nét Cat-Eye Browline vuốt cao sắc sảo kết hợp phụ kiện Lumina Star độc quyền. Mẫu kính đại diện cho tinh thần kiêu hãnh của người phụ nữ hiện đại.',
    ctaText: 'Xem Bộ Sưu Tập',
    ctaLink: '/catalog',
    ctaIcon: <ArrowRight className="w-4 h-4" />,
    bgImage: '/assets/lifestyle-craftsmanship.jpg',
    overlayColor: 'from-[#0D0D0D]/90 via-[#141413]/60 to-transparent',
  },
];

const AUTO_SLIDE_INTERVAL = 5500;
const TRANSITION_DURATION = 800;

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clearAutoSlideTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goToNextSlide = useCallback(() => {
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
  }, []);

  const goToPrevSlide = useCallback(() => {
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
  }, []);

  const goToSlide = useCallback(
    (index) => {
      if (index === currentSlide) return;
      setIsTransitioning(true);
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
    },
    [currentSlide]
  );

  const resetTimer = useCallback(() => {
    clearAutoSlideTimer();
    if (!prefersReducedMotion) {
      timerRef.current = setInterval(() => {
        goToNextSlide();
      }, AUTO_SLIDE_INTERVAL);
    }
  }, [clearAutoSlideTimer, goToNextSlide, prefersReducedMotion]);

  const handleManualNext = () => {
    goToNextSlide();
    resetTimer();
  };

  const handleManualPrev = () => {
    goToPrevSlide();
    resetTimer();
  };

  const handleManualPillClick = (index) => {
    goToSlide(index);
    resetTimer();
  };

  useEffect(() => {
    resetTimer();
    return () => clearAutoSlideTimer();
  }, [resetTimer, clearAutoSlideTimer]);

  const activeSlideData = SLIDES[currentSlide];

  return (
    <div
      className="relative w-full h-[620px] sm:h-[700px] lg:h-[760px] overflow-hidden bg-[#0D0D0D] text-[#FAF8F5] select-none"
      role="region"
      aria-roledescription="carousel"
      aria-label="Lumina Eyewear Featured Campaigns"
    >
      {/* Background Image Panels */}
      {SLIDES.map((slide, index) => {
        const isActive = index === currentSlide;
        return (
          <div
            key={slide.id}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-[800ms] ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Real Photo Background */}
            <img
              src={slide.bgImage}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${
                isActive ? 'scale-105' : 'scale-100'
              }`}
            />
            {/* Gradient Overlay for text legibility */}
            <div
              className={`absolute inset-0 bg-gradient-to-r ${slide.overlayColor}`}
            />
            {/* Bottom vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D]/60 via-transparent to-transparent" />
          </div>
        );
      })}

      {/* Foreground Content */}
      <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div className="max-w-2xl space-y-6">
          {/* Tag badge */}
          <div
            key={`tag-${currentSlide}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF8F5]/10 border border-[#D4AF37]/50 backdrop-blur-sm animate-[fadeInUp_0.6s_ease_forwards]"
          >
            <span className="text-[#D4AF37] text-xs font-bold">✦</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#FAF8F5]">
              {activeSlideData.tag}
            </span>
          </div>

          {/* Main Title */}
          <div
            key={`title-${currentSlide}`}
            className="space-y-3 animate-[fadeInUp_0.7s_0.1s_ease_forwards] opacity-0"
          >
            <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-light tracking-tight leading-[1.0] text-[#FAF8F5]">
              {activeSlideData.title}
            </h1>
            <p className="font-brand text-sm sm:text-base tracking-[0.2em] text-[#D4AF37] uppercase">
              {activeSlideData.subtitle}
            </p>
          </div>

          {/* Description */}
          <p
            key={`desc-${currentSlide}`}
            className="text-xs sm:text-sm text-[#FAF8F5]/80 font-body leading-relaxed max-w-xl animate-[fadeInUp_0.7s_0.2s_ease_forwards] opacity-0"
          >
            {activeSlideData.description}
          </p>

          {/* CTAs */}
          <div
            key={`cta-${currentSlide}`}
            className="pt-2 flex flex-wrap items-center gap-4 animate-[fadeInUp_0.7s_0.3s_ease_forwards] opacity-0"
          >
            <Link
              to={activeSlideData.ctaLink}
              className="inline-flex items-center gap-3 px-6 py-3.5 bg-[#D4AF37] text-[#141413] hover:bg-[#FAF8F5] transition-all duration-300 font-semibold text-xs uppercase tracking-[0.25em] rounded-sm shadow-lg group"
            >
              {activeSlideData.ctaIcon}
              <span>{activeSlideData.ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-5 py-3.5 border border-[#FAF8F5]/40 text-[#FAF8F5] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-300 font-medium text-xs uppercase tracking-[0.2em] rounded-sm backdrop-blur-sm"
            >
              Xem Lookbook
            </Link>
          </div>
        </div>
      </div>

      {/* Slide Counter (top-right) */}
      <div className="absolute z-30 top-8 right-8 hidden sm:flex items-center gap-2">
        <span className="text-[11px] font-mono tracking-widest text-[#FAF8F5]/50">
          0{currentSlide + 1}
        </span>
        <div className="w-8 h-px bg-[#FAF8F5]/30" />
        <span className="text-[11px] font-mono tracking-widest text-[#FAF8F5]/30">
          0{SLIDES.length}
        </span>
      </div>

      {/* Navigation Controls (bottom-right) */}
      <div className="absolute z-30 bottom-10 right-4 sm:right-8 lg:right-12 flex items-center space-x-2">
        <button
          type="button"
          onClick={handleManualPrev}
          disabled={isTransitioning}
          aria-label="Slide trước"
          className="p-3 rounded-full bg-[#FAF8F5]/10 border border-[#FAF8F5]/20 hover:bg-[#D4AF37] hover:border-[#D4AF37] hover:text-[#141413] text-[#FAF8F5] transition-all duration-200 disabled:opacity-40 backdrop-blur-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleManualNext}
          disabled={isTransitioning}
          aria-label="Slide tiếp theo"
          className="p-3 rounded-full bg-[#FAF8F5]/10 border border-[#FAF8F5]/20 hover:bg-[#D4AF37] hover:border-[#D4AF37] hover:text-[#141413] text-[#FAF8F5] transition-all duration-200 disabled:opacity-40 backdrop-blur-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Pill Pagination (bottom-left) */}
      <div className="absolute z-30 bottom-10 left-4 sm:left-8 lg:left-12 flex items-center space-x-2">
        {SLIDES.map((slide, index) => {
          const isActive = index === currentSlide;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => handleManualPillClick(index)}
              aria-label={`Slide ${index + 1}: ${slide.title}`}
              className="group relative py-2 focus:outline-none"
            >
              <div
                className={`h-[3px] rounded-full transition-all duration-500 ease-out ${
                  isActive
                    ? 'w-10 bg-[#D4AF37]'
                    : 'w-4 bg-[#FAF8F5]/30 group-hover:bg-[#FAF8F5]/60'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Keyframe animations via style tag */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
