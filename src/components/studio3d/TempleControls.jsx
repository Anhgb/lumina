import React from 'react';

export const TEMPLE_STYLES = [
  {
    id: 'classic-acetate',
    name: 'Classic Acetate',
    nameVi: 'Acetate Cổ Điển',
    desc: 'Càng bản vừa chắc chắn, đầu càng ôm sát tai — phong cách bền bỉ kinh điển.',
    icon: '▬',
    iconColor: '#D4AF37',
  },
  {
    id: 'slim-metal',
    name: 'Slim Metal',
    nameVi: 'Kim Loại Thanh Mảnh',
    desc: 'Càng kim loại mảnh thanh thoát, tinh tế hiện đại, siêu nhẹ.',
    icon: '━',
    iconColor: '#C0C0C0',
  },
  {
    id: 'statement-wide',
    name: 'Statement Wide',
    nameVi: 'Bản Rộng Phong Cách',
    desc: 'Càng rộng thời trang, diện tích lý tưởng để khắc chữ laser nổi bật.',
    icon: '█',
    iconColor: '#D4AF37',
  },
  {
    id: 'sculpted-comfort',
    name: 'Sculpted Comfort',
    nameVi: 'Điêu Khắc Comfort',
    desc: 'Đường cong điêu khắc ergonomic, đầu càng thuôn ôm êm vùng tai.',
    icon: '◗',
    iconColor: '#A8A49C',
  },
];

export default function TempleControls({ templeStyle = 'classic-acetate', onSelectTempleStyle }) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-[#D6D3CD]/15 pb-2">
        <div>
          <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#D4AF37] flex items-center gap-1.5">
            <span>03 / THIẾT KẾ TEMPLE</span>
          </h2>
          <p className="text-[11px] font-body text-[#FAF8F5]/60 mt-0.5">
            Kiểu dáng càng kính 3D — kết nối bản lề, cong về tai
          </p>
        </div>
        <span className="text-[10px] font-mono text-[#D4AF37]/80 uppercase tracking-widest">
          4 KIỂU CÀNG
        </span>
      </div>

      {/* 2×2 grid of temple style presets */}
      <div className="grid grid-cols-2 gap-2.5">
        {TEMPLE_STYLES.map((style) => {
          const isSelected = templeStyle === style.id;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelectTempleStyle?.(style.id)}
              className={`p-3 rounded-sm text-left transition-all border flex flex-col gap-2 group relative overflow-hidden ${
                isSelected
                  ? 'bg-[#181816] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10 ring-1 ring-[#D4AF37]/40'
                  : 'bg-[#141413]/70 border-[#D6D3CD]/15 hover:border-[#D4AF37]/50 hover:bg-[#181816]/90'
              }`}
              aria-pressed={isSelected}
              title={style.desc}
            >
              {/* Selected indicator */}
              {isSelected && (
                <span className="absolute top-2 right-2 text-[#D4AF37] text-[8px] font-mono">✦</span>
              )}

              {/* Icon */}
              <span
                className="text-xl font-mono leading-none"
                style={{ color: isSelected ? style.iconColor : '#A8A49C' }}
              >
                {style.icon}
              </span>

              {/* Label */}
              <div>
                <p
                  className={`text-[11px] font-semibold leading-tight transition-colors ${
                    isSelected ? 'text-[#D4AF37]' : 'text-[#FAF8F5] group-hover:text-[#FAF8F5]'
                  }`}
                >
                  {style.nameVi}
                </p>
                <p className="text-[9px] font-mono text-[#FAF8F5]/40 mt-0.5 uppercase tracking-wider">
                  {style.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Description of selected style */}
      {(() => {
        const selected = TEMPLE_STYLES.find((s) => s.id === templeStyle);
        return selected ? (
          <div className="p-2.5 bg-[#D4AF37]/8 border border-[#D4AF37]/20 rounded-sm">
            <p className="text-[10px] text-[#FAF8F5]/75 font-body leading-relaxed">
              <span className="text-[#D4AF37] mr-1">✦</span>
              {selected.desc}
            </p>
          </div>
        ) : null;
      })()}
    </div>
  );
}

