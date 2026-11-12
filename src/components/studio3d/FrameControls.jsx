import React from 'react';
import { FRAME_COLOR_ADDONS } from '../../utils/pricingCalculator';
import { Sliders } from 'lucide-react';

export default function FrameControls({
  frameColor,
  metalness,
  roughness,
  onSelectColor,
  onChangeMetalness,
  onChangeRoughness,
}) {
  const colors = [
    {
      id: '#D4AF37',
      name: 'Vàng Champagne 18K',
      subtitle: 'Mạ vàng 18K sang trọng',
      colorCss: '#D4AF37',
      defaultMetalness: 0.9,
      defaultRoughness: 0.2,
      borderClass: 'border-[#D4AF37]',
    },
    {
      id: '#141413',
      name: 'Đen Obsidian Onyx',
      subtitle: 'Đen tuyền bóng mờ quyền lực',
      colorCss: '#141413',
      defaultMetalness: 0.3,
      defaultRoughness: 0.35,
      borderClass: 'border-[#141413]',
    },
    {
      id: '#C0C0C0',
      name: 'Bạc Titanium Silver',
      subtitle: 'Hợp kim Titanium siêu nhẹ',
      colorCss: '#C0C0C0',
      defaultMetalness: 0.95,
      defaultRoughness: 0.15,
      borderClass: 'border-[#C0C0C0]',
    },
    {
      id: 'tortoiseshell',
      name: 'Họa Tiết Đồi Mồi Ý',
      subtitle: 'Vân hổ phách cổ điển thủ công',
      colorCss: 'radial-gradient(circle, #E69C24 20%, #964B00 60%, #141413 100%)',
      defaultMetalness: 0.1,
      defaultRoughness: 0.4,
      borderClass: 'border-[#964B00]',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-[#D6D3CD]/15 pb-2">
        <div>
          <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-1.5">
            <span>02 / FRAME FINISH</span>
          </h2>
          <p className="text-[11px] font-body text-[#FAF8F5]/60 mt-0.5">
            Precious metals & artisanal acetate
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#D4AF37]/80 uppercase tracking-widest">
          4 MÀU HOÀN THIỆN
        </span>
      </div>

      {/* Frame Colors Palette */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {colors.map((c) => {
          const isSelected = frameColor === c.id;
          const addonInfo = FRAME_COLOR_ADDONS[c.id];

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectColor(c.id, c.defaultMetalness, c.defaultRoughness)}
              className={`p-3 rounded-sm text-left transition-all border flex items-center gap-3 relative overflow-hidden group ${
                isSelected
                  ? 'bg-[#181816] border-[#D4AF37] shadow-xl shadow-[#D4AF37]/10 ring-1 ring-[#D4AF37]/50'
                  : 'bg-[#141413]/70 border-[#D6D3CD]/15 hover:border-[#D4AF37]/50 hover:bg-[#181816]/90'
              }`}
            >
              <div
                className="w-8 h-8 rounded-full border border-white/20 flex-shrink-0 shadow-md group-hover:scale-105 transition-transform"
                style={{
                  background: c.colorCss,
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[11px] font-semibold truncate transition-colors ${
                    isSelected ? 'text-[#D4AF37]' : 'text-[#FAF8F5] group-hover:text-[#FAF8F5]'
                  }`}
                >
                  {c.name}
                </p>
                <p className="text-[10px] font-mono text-[#FAF8F5]/50 mt-0.5">
                  {addonInfo?.addon > 0
                    ? `+${new Intl.NumberFormat('vi-VN').format(addonInfo.addon)} ₫`
                    : 'Tiêu chuẩn'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Material sliders: Metalness & Roughness */}
      <div className="p-3.5 bg-[#141413]/70 border border-[#D6D3CD]/15 rounded-sm space-y-3.5">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#FAF8F5]/80 border-b border-[#D6D3CD]/10 pb-2">
          <div className="flex items-center gap-1.5 text-[#D4AF37]">
            <Sliders className="w-3.5 h-3.5" />
            <span className="font-semibold">TINH CHỈNH VẬT LIỆU (PBR TEXTURE)</span>
          </div>
          <span className="text-[#FAF8F5]/40 text-[9px]">PBR SHADER</span>
        </div>

        {/* Metalness */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-body text-[#FAF8F5]/70">
            <span>Độ phản chiếu kim loại (Metalness)</span>
            <span className="font-mono text-[#D4AF37] font-bold">
              {Math.round(metalness * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={metalness}
            onChange={(e) => onChangeMetalness(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#FAF8F5]/15 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
          />
        </div>

        {/* Roughness */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-body text-[#FAF8F5]/70">
            <span>Độ nhám mờ bề mặt (Roughness)</span>
            <span className="font-mono text-[#D4AF37] font-bold">
              {Math.round(roughness * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={roughness}
            onChange={(e) => onChangeRoughness(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#FAF8F5]/15 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
          />
        </div>
      </div>
    </div>
  );
}
