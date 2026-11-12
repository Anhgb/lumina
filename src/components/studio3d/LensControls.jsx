import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';

export default function LensControls({
  lensColor,
  lensOpacity,
  onSelectLensColor,
  onChangeLensOpacity,
  isHighOpacityWarning,
}) {
  const lensTints = [
    {
      id: '#1F2937',
      name: 'Khói Obsidian (Smoke)',
      colorCss: '#1F2937',
    },
    {
      id: '#1E3A8A',
      name: 'Lam Sapphire (Deep Blue)',
      colorCss: '#1E3A8A',
    },
    {
      id: '#065F46',
      name: 'Lục Emerald (Forest)',
      colorCss: '#065F46',
    },
    {
      id: '#78350F',
      name: 'Nâu Hổ Phách (Amber)',
      colorCss: '#78350F',
    },
    {
      id: '#831843',
      name: 'Hồng Hoàng Hôn (Rose Gold)',
      colorCss: '#831843',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-[#D6D3CD]/15 pb-2">
        <div>
          <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-1.5">
            <span>03 / LENS TINT</span>
          </h2>
          <p className="text-[11px] font-body text-[#FAF8F5]/60 mt-0.5">
            Optical UV400 & bespoke transparency
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#D4AF37]/80 uppercase tracking-widest">
          5 SẮC ĐỘ TRÒNG
        </span>
      </div>

      {/* Lens Tint Palette */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
        {lensTints.map((tint) => {
          const isSelected = lensColor === tint.id;
          return (
            <button
              key={tint.id}
              type="button"
              onClick={() => onSelectLensColor(tint.id)}
              className={`p-2.5 rounded-sm text-left transition-all border flex items-center gap-2.5 group relative overflow-hidden ${
                isSelected
                  ? 'bg-[#181816] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10 ring-1 ring-[#D4AF37]/50'
                  : 'bg-[#141413]/70 border-[#D6D3CD]/15 hover:border-[#D4AF37]/50 hover:bg-[#181816]/90'
              }`}
            >
              <div
                className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform"
                style={{ backgroundColor: tint.colorCss }}
              />
              <span
                className={`text-[10px] font-semibold truncate transition-colors ${
                  isSelected ? 'text-[#D4AF37]' : 'text-[#FAF8F5] group-hover:text-[#FAF8F5]'
                }`}
              >
                {tint.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lens Opacity Slider */}
      <div className="p-3.5 bg-[#141413]/70 border border-[#D6D3CD]/15 rounded-sm space-y-3">
        <div className="flex items-center justify-between text-[11px] font-body text-[#FAF8F5]/80">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Độ tối / Độ mờ tròng kính (Lens Opacity)</span>
          </div>
          <span className="font-mono text-[#D4AF37] font-bold text-xs">
            {Math.round(lensOpacity * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="0.10"
          max="0.95"
          step="0.05"
          value={lensOpacity}
          onChange={(e) => onChangeLensOpacity(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-[#FAF8F5]/15 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
        />

        <div className="flex justify-between text-[9px] font-mono text-[#FAF8F5]/40 pt-0.5">
          <span>10% (Trong suốt)</span>
          <span>45% (Râm tiêu chuẩn)</span>
          <span>95% (Râm đậm)</span>
        </div>

        {/* PRD 7.3 Night driving safety warning when opacity > 85% */}
        {isHighOpacityWarning && (
          <div className="p-3 bg-[#D97706]/10 border-l-2 border-[#D97706] rounded-sm flex items-start gap-2.5 text-[10px] text-[#FAF8F5] leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
            <p className="text-[#FAF8F5]/90">
              <strong className="text-[#D97706]">Cảnh báo quang học (PRD 7.3):</strong> Độ tối tròng kính đang ở mức{' '}
              <span className="font-mono font-bold text-[#D97706]">{Math.round(lensOpacity * 100)}%</span>. Không khuyến nghị sử dụng khi lái xe ban đêm hoặc trong điều kiện thiếu sáng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
