import React from 'react';
import { Sparkles, Gem, Plus, Trash2, PenTool, AlertCircle } from 'lucide-react';
import { CHARM_PRICES, RHINESTONE_PRICE, ENGRAVING_PRICE } from '../../utils/pricingCalculator';

export default function AccessoriesControls({
  hasRhinestones,
  onToggleRhinestones,
  charms = [],
  onAddCharm,
  onRemoveCharm,
  engravingText,
  onChangeEngravingText,
}) {
  const availableCharms = [
    {
      id: 'lumina-star',
      name: 'Lumina Star (✦)',
      desc: 'Ngôi sao 4 cánh mạ vàng 18K',
      price: CHARM_PRICES['lumina-star'].price,
      color: '#D4AF37',
      icon: '✦',
    },
    {
      id: 'ruby-heart',
      name: 'Ruby Heart (♥)',
      desc: 'Pha lê đỏ cắt giác hình trái tim',
      price: CHARM_PRICES['ruby-heart'].price,
      color: '#DC2626',
      icon: '♥',
    },
    {
      id: 'silver-butterfly',
      name: 'Silver Butterfly (🦋)',
      desc: 'Hồ điệp bạch kim đúc nổi',
      price: CHARM_PRICES['silver-butterfly'].price,
      color: '#E2E8F0',
      icon: '🦋',
    },
  ];

  const canAddMoreCharms = charms.length < 2;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-[#D6D3CD]/15 pb-2">
        <div>
          <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-1.5">
            <span>04 / SIGNATURE DETAILS</span>
          </h2>
          <p className="text-[11px] font-body text-[#FAF8F5]/60 mt-0.5">
            Swarovski crystal, bespoke charms & laser engraving
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#D4AF37]/80 uppercase tracking-widest">
          CÁ NHÂN HÓA
        </span>
      </div>

      {/* 1. Rhinestones Option (Đính đá pha lê Swarovski) */}
      <div className="p-3.5 bg-[#141413]/70 border border-[#D6D3CD]/15 rounded-sm flex items-center justify-between gap-3 group hover:border-[#D4AF37]/30 transition-all">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
              hasRhinestones
                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37] shadow-lg shadow-[#D4AF37]/20'
                : 'bg-white/5 border-white/15 text-[#FAF8F5]/40'
            }`}
          >
            <Gem className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#FAF8F5]">
                Đính Đá Pha Lê Swarovski Viền Trên
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                +450.000 ₫
              </span>
            </div>
            <p className="text-[10px] text-[#FAF8F5]/60 font-body mt-0.5">
              Hàng đá cắt giác tinh xảo chạy dọc đường cong chân mày gọng kính
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleRhinestones}
          className={`px-3.5 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded-sm transition-all border ${
            hasRhinestones
              ? 'bg-[#D4AF37] text-[#141413] border-[#D4AF37] font-bold shadow-md shadow-[#D4AF37]/20'
              : 'border-[#D6D3CD]/30 text-[#FAF8F5]/70 hover:border-[#D4AF37] hover:text-[#D4AF37]'
          }`}
        >
          {hasRhinestones ? '✓ ĐÃ BẬT' : 'BẬT ĐÍNH ĐÁ'}
        </button>
      </div>

      {/* 2. 3D Charms Section (Tối đa 2 charm) */}
      <div className="p-3.5 bg-[#141413]/70 border border-[#D6D3CD]/15 rounded-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#D6D3CD]/10 pb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-xs font-semibold text-[#FAF8F5]">
              Charm Điêu Khắc Kim Loại & Pha Lê
            </span>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              charms.length >= 2
                ? 'bg-[#D97706]/20 text-[#D97706] border border-[#D97706]/40 font-bold'
                : 'bg-white/10 text-[#FAF8F5]/70'
            }`}
          >
            {charms.length}/2 CHARM (TỐI ĐA)
          </span>
        </div>

        {/* Selected Charms List */}
        {charms.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            <span className="text-[9px] uppercase font-mono tracking-wider text-[#FAF8F5]/40">
              Charm đang gắn trên kính:
            </span>
            <div className="flex flex-wrap gap-2">
              {charms.map((charmId, index) => {
                const info = availableCharms.find((c) => c.id === charmId);
                return (
                  <div
                    key={`${charmId}-${index}`}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-[#181816] border border-[#D4AF37]/40 rounded-sm text-xs text-[#FAF8F5] shadow-sm"
                  >
                    <span style={{ color: info?.color }}>{info?.icon || '✦'}</span>
                    <span className="text-[11px] font-medium">{info?.name}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveCharm(index)}
                      className="text-[#FAF8F5]/40 hover:text-[#DC2626] transition-colors p-0.5 ml-1"
                      title="Gỡ Charm này"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Charms Buttons to Add */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {availableCharms.map((charm) => (
            <button
              key={charm.id}
              type="button"
              disabled={!canAddMoreCharms}
              onClick={() => onAddCharm(charm.id)}
              className={`p-2.5 rounded-sm text-left border transition-all flex flex-col justify-between group ${
                canAddMoreCharms
                  ? 'border-[#D6D3CD]/20 hover:border-[#D4AF37] hover:bg-[#181816] text-[#FAF8F5]'
                  : 'border-white/5 opacity-40 cursor-not-allowed text-[#FAF8F5]/40 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-base" style={{ color: charm.color }}>
                  {charm.icon}
                </span>
                <span className="text-[10px] font-mono text-[#D4AF37]">
                  +{new Intl.NumberFormat('vi-VN').format(charm.price)} ₫
                </span>
              </div>
              <p className="text-[11px] font-semibold truncate group-hover:text-[#D4AF37] transition-colors">{charm.name}</p>
              <span className="text-[9px] text-[#FAF8F5]/50 mt-1.5 flex items-center gap-1 font-mono">
                <Plus className="w-2.5 h-2.5 text-[#D4AF37]" />
                <span>Gắn vào càng</span>
              </span>
            </button>
          ))}
        </div>

        {!canAddMoreCharms && (
          <p className="text-[10px] text-[#D97706] font-body flex items-center gap-1.5 pt-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Theo quy chuẩn PRD 7.3: Mỗi kính gắn tối đa 2 Charm (1 Charm mỗi bên càng) để cân bằng trọng lượng.
            </span>
          </p>
        )}
      </div>

      {/* 3. Laser Engraving Input (Khắc tên độc bản) */}
      <div className="p-3.5 bg-[#141413]/70 border border-[#D6D3CD]/15 rounded-sm space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#D6D3CD]/10 pb-2">
          <div className="flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-xs font-semibold text-[#FAF8F5]">
              Khắc Chữ Laser Trên Càng Kính (Laser Engraving)
            </span>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
            +150.000 ₫
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={engravingText}
            onChange={(e) => onChangeEngravingText(e.target.value)}
            placeholder="Nhập tên / ký hiệu (Tối đa 15 chữ)..."
            maxLength={15}
            className="flex-1 px-3 py-2 text-xs bg-[#0D0D0D] text-[#FAF8F5] border border-[#D6D3CD]/25 rounded-sm outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/40 font-brand uppercase tracking-wider placeholder:text-[#FAF8F5]/30"
          />
          {engravingText && (
            <button
              type="button"
              onClick={() => onChangeEngravingText('')}
              className="px-3 text-xs text-[#FAF8F5]/50 hover:text-[#DC2626] border border-[#D6D3CD]/20 rounded-sm transition-colors"
              title="Xóa chữ khắc"
            >
              Xóa
            </button>
          )}
        </div>

        <div className="flex justify-between text-[10px] text-[#FAF8F5]/50 font-body">
          <span>Khắc sắc nét bằng tia laser sợi quang 1064nm lên mặt trong gọng kính.</span>
          <span className="font-mono text-[#D4AF37] font-semibold">{engravingText.length} / 15</span>
        </div>
      </div>
    </div>
  );
}
