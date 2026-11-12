import React from 'react';
import { PenTool, Eye, EyeOff, Layers } from 'lucide-react';

export const ENGRAVING_PLACEMENTS = [
  {
    id: 'outer_temple',
    nameVi: 'Mặt Ngoài Càng',
    desc: 'Người đối diện nhìn thấy khi bạn đeo kính — thể hiện cá tính.',
    icon: Eye,
  },
  {
    id: 'inner_temple',
    nameVi: 'Mặt Trong Càng',
    desc: 'Hướng vào phần đầu người đeo — bí mật riêng tư, ý nghĩa cá nhân.',
    icon: EyeOff,
  },
  {
    id: 'two_temples',
    nameVi: 'Cả Hai Mặt',
    desc: 'Khắc đồng thời mặt ngoài và mặt trong càng kính (nếu vật liệu hỗ trợ).',
    icon: Layers,
  },
];

export default function EngravingControls({
  engravingText = '',
  engravingPlacement = 'outer_temple',
  onChangeEngravingText,
  onChangeEngravingPlacement,
}) {
  const selectedPlacement = ENGRAVING_PLACEMENTS.find((p) => p.id === engravingPlacement);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-[#D6D3CD]/15 pb-2">
        <div>
          <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-1.5">
            <PenTool className="w-3 h-3" />
            <span>04 / KHẮC CÁ NHÂN HÓA</span>
          </h2>
          <p className="text-[11px] font-body text-[#FAF8F5]/60 mt-0.5">
            Khắc laser 1064nm trực tiếp trên bề mặt 3D — hiển thị ngay trên mô hình
          </p>
        </div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
          +150.000 ₫
        </span>
      </div>

      {/* 1. Placement selection */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#FAF8F5]/50">
          Chọn vị trí khắc:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {ENGRAVING_PLACEMENTS.map((placement) => {
            const isSelected = engravingPlacement === placement.id;
            const Icon = placement.icon;
            return (
              <button
                key={placement.id}
                type="button"
                onClick={() => onChangeEngravingPlacement?.(placement.id)}
                className={`p-2.5 rounded-sm text-left transition-all border flex items-center gap-3 group ${
                  isSelected
                    ? 'bg-[#181816] border-[#D4AF37] shadow-sm shadow-[#D4AF37]/10'
                    : 'bg-[#141413]/70 border-[#D6D3CD]/15 hover:border-[#D4AF37]/40 hover:bg-[#181816]/80'
                }`}
                aria-pressed={isSelected}
              >
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/5 text-[#FAF8F5]/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[11px] font-semibold transition-colors ${
                      isSelected ? 'text-[#D4AF37]' : 'text-[#FAF8F5] group-hover:text-[#FAF8F5]'
                    }`}
                  >
                    {placement.nameVi}
                  </p>
                  <p className="text-[9px] text-[#FAF8F5]/45 font-body mt-0.5 leading-snug">
                    {placement.desc}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-[#D4AF37] text-[10px] font-mono flex-shrink-0">✦</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Text input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={engravingText}
            onChange={(e) => onChangeEngravingText?.(e.target.value)}
            placeholder="Nhập chữ khắc (tối đa 15 ký tự)..."
            maxLength={15}
            className="flex-1 px-3 py-2 text-xs bg-[#0D0D0D] text-[#FAF8F5] border border-[#D6D3CD]/25 rounded-sm outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 font-brand uppercase tracking-wider placeholder:text-[#FAF8F5]/30"
            aria-label="Nội dung chữ khắc laser"
          />
          {engravingText && (
            <button
              type="button"
              onClick={() => onChangeEngravingText?.('')}
              className="px-3 text-xs text-[#FAF8F5]/50 hover:text-[#DC2626] border border-[#D6D3CD]/20 rounded-sm transition-colors"
              title="Xóa chữ khắc"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex justify-between text-[10px] text-[#FAF8F5]/50 font-body">
          <span>
            {selectedPlacement
              ? `Khắc lên: ${selectedPlacement.nameVi.toLowerCase()}`
              : 'Chữ hiển thị trực tiếp trên mô hình 3D'}
          </span>
          <span
            className={`font-mono font-semibold ${
              engravingText.length >= 15 ? 'text-[#D97706]' : 'text-[#D4AF37]'
            }`}
          >
            {engravingText.length} / 15
          </span>
        </div>

        {engravingText.length >= 15 && (
          <p className="text-[10px] text-[#D97706] font-body flex items-center gap-1">
            <span>⚠</span>
            <span>Đã đạt giới hạn tối đa 15 ký tự.</span>
          </p>
        )}
      </div>
    </div>
  );
}

