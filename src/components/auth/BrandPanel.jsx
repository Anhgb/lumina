import React from 'react';

export default function BrandPanel() {
  return (
    <div
      className="relative h-full min-h-[560px] flex flex-col justify-between p-8 sm:p-9 overflow-hidden select-none bg-[#141008] md:rounded-l-2xl"
      aria-hidden="true"
    >
      {/* 1. Full-bleed background image with scale 1.05 -> 1 animation */}
      <img
        src="/assets/collection-round.jpg"
        alt="Kính mắt cao cấp Lumina Eyewear Aura Round mạ vàng champagne"
        loading="eager"
        className="absolute inset-0 w-full h-full object-cover animate-modal-bg-zoom pointer-events-none"
        style={{ objectPosition: 'center 40%' }}
      />

      {/* 2. Gradient overlay ensuring high contrast >= 4.5:1 for text */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'linear-gradient(180deg, rgba(20,16,8,0.55) 0%, rgba(20,16,8,0.05) 35%, rgba(20,16,8,0.15) 60%, rgba(20,16,8,0.75) 100%)',
        }}
      />

      {/* 3. Foreground content layered above the image (z-10) */}
      <div className="relative z-10 flex flex-col justify-between h-full min-h-[500px]">
        {/* Top: Brand Header & Bespoke Badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.3em] text-[#F8F6F1]/75 uppercase mb-1 font-mono">
              Since 2024 · Atelier
            </p>
            <h1 className="font-display text-3xl font-bold text-[#F8F6F1] leading-tight drop-shadow-md">
              Lumina<br />Eyewear
            </h1>
          </div>
          <div
            className="px-3 py-1 rounded-full text-[#F8F6F1] text-[10px] font-medium flex items-center gap-1.5 shadow-sm shrink-0"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.14)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
            }}
          >
            <span className="text-[#D4AF37]">✦</span> Bespoke 2026
          </div>
        </div>

        {/* Center / Middle: Slogan */}
        <div className="my-auto py-8">
          <blockquote className="font-display text-2xl sm:text-[28px] font-light italic text-[#F8F6F1] leading-snug drop-shadow-md">
            "Nhìn thế giới<br />theo cách của bạn."
          </blockquote>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-5 h-px bg-[#D4AF37]" />
            <p className="text-[11px] tracking-[0.2em] uppercase text-[#F8F6F1]/80 font-semibold font-mono">
              Bespoke Eyewear Atelier
            </p>
          </div>
        </div>

        {/* Bottom: Product label & 3 Glassmorphism tags */}
        <div className="space-y-3">
          {/* Product Label */}
          <div className="flex items-center gap-2 text-xs font-medium text-[#F8F6F1] drop-shadow-sm font-body">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
            <span>Aura Round – Champagne Gold Titanium – 3.490.000₫</span>
          </div>

          {/* 3 Frosted glass pills */}
          <div className="flex flex-wrap gap-2">
            {['AI Stylist', '3D Tùy chỉnh', 'Chuẩn nhãn khoa'].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium text-[#F8F6F1] shadow-xs"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.14)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                <span className="text-[#D4AF37]">✦</span>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
