import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { FRAME_MODELS } from '../../data/frameModels';
import { BASE_MODEL_PRICES } from '../../utils/pricingCalculator';

const formatVND = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);

function ModelSilhouette({ id }) {
  const common = 'fill-none stroke-current stroke-[2.4] stroke-linecap-round stroke-linejoin-round';
  const bridge = <path d="M46 22 Q50 17 54 22" />;
  const silhouettes = {
    aviator: <><path d="M10 14 Q23 7 46 17 L48 26 Q42 39 24 36 Q11 34 10 14Z M54 17 Q77 7 90 14 Q89 34 76 36 Q58 39 52 26Z" />{bridge}</>,
    cateye: <><path d="M9 15 L16 7 Q35 8 46 17 L47 26 Q39 36 19 33 Q11 30 9 15Z M54 17 Q65 8 84 7 L91 15 Q89 30 81 33 Q61 36 53 26Z" />{bridge}</>,
    round: <><circle cx="28" cy="22" r="16" /><circle cx="72" cy="22" r="16" />{bridge}</>,
    square: <><rect x="10" y="8" width="37" height="28" rx="5" /><rect x="53" y="8" width="37" height="28" rx="5" />{bridge}</>,
    'modern-pilot': <><path d="M9 13 L21 9 L45 12 L48 27 Q42 38 25 36 Q13 34 9 13Z M55 12 L79 9 L91 13 Q87 34 75 36 Q58 38 52 27Z" />{bridge}<path d="M31 11 Q50 7 69 11" /></>,
    'sculpted-cateye': <><path d="M8 15 L19 6 L45 12 L48 24 L37 34 L17 31 Q10 27 8 15Z M55 12 L81 6 L92 15 Q90 27 83 31 L63 34 L52 24Z" />{bridge}</>,
    'oversized-square': <><path d="M7 10 Q7 7 12 7 L46 8 Q49 8 49 12 L48 31 Q47 38 40 38 L15 36 Q8 34 7 10Z M51 12 Q51 8 54 8 L88 7 Q93 7 93 10 Q92 34 85 36 L60 38 Q53 38 52 31Z" />{bridge}</>,
    'slim-oval': <><ellipse cx="28" cy="22" rx="19" ry="12" /><ellipse cx="72" cy="22" rx="19" ry="12" />{bridge}</>,
    'geometric-hexagon': <><path d="M10 22 L20 8 L41 8 L48 22 L41 36 L20 36 Z M52 22 L59 8 L80 8 L90 22 L80 36 L59 36 Z" />{bridge}</>,
    'bug-eye': <><path d="M6 18 Q7 5 26 5 Q46 5 49 18 L47 30 Q43 39 26 39 Q8 39 6 18Z M51 18 Q54 5 74 5 Q93 5 94 18 Q92 39 74 39 Q57 39 53 30Z" />{bridge}</>,
  };

  return (
    <svg viewBox="0 0 100 45" className={`w-[62px] h-7 ${common}`} aria-hidden="true">
      {silhouettes[id] || silhouettes.aviator}
    </svg>
  );
}

export default function ModelSelector({ currentModel, onSelectModel }) {
  const [activeGroup, setActiveGroup] = useState(() => FRAME_MODELS.find((model) => model.id === currentModel)?.group || 'classic');
  useEffect(() => {
    const selected = FRAME_MODELS.find((model) => model.id === currentModel);
    if (selected) setActiveGroup(selected.group);
  }, [currentModel]);
  const models = FRAME_MODELS.filter((model) => model.group === activeGroup);

  return (
    <section className="space-y-3" aria-label="Chọn kiểu gọng">
      <div className="flex items-baseline justify-between border-b border-[#D6D3CD]/15 pb-2">
        <div>
          <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            01 / FRAME SILHOUETTE
          </h2>
          <p className="text-[11px] text-[#FAF8F5]/60 mt-0.5">Preset kiểu dáng, không phải SKU bán lẻ</p>
        </div>
        <span className="text-[9px] font-mono text-[#FAF8F5]/45 uppercase tracking-widest">
          {activeGroup === 'classic' ? 'CLASSIC' : 'TRENDING 2026'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 bg-[#0D0D0D] border border-[#D6D3CD]/15 rounded-sm">
        {[
          { id: 'classic', label: 'Classic' },
          { id: 'trending', label: 'Trending 2026' },
        ].map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActiveGroup(group.id)}
            aria-pressed={activeGroup === group.id}
            className={`py-2 text-[10px] uppercase tracking-wider rounded-sm ${activeGroup === group.id ? 'bg-[#D4AF37] text-[#141413] font-bold' : 'text-[#FAF8F5]/60 hover:text-[#FAF8F5]'}`}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {models.map((model) => {
          const isSelected = currentModel === model.id;
          const price = BASE_MODEL_PRICES[model.id];
          return (
            <button
              key={model.id}
              type="button"
              onClick={() => onSelectModel(model.id)}
              aria-pressed={isSelected}
              className={`min-h-[116px] p-2.5 rounded-sm text-left border transition-colors ${isSelected ? 'bg-[#1C1B18] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#141413] border-[#D6D3CD]/15 text-[#FAF8F5] hover:border-[#D4AF37]/60'}`}
            >
              <div className="flex items-start justify-between gap-1">
                <ModelSilhouette id={model.id} />
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" aria-label="Đang chọn" />}
              </div>
              <span className="block mt-1 text-[10px] font-semibold uppercase leading-tight">{model.name}</span>
              <span className="block mt-1 text-[9px] text-[#FAF8F5]/55 leading-tight">{model.description}</span>
              <span className="block mt-1 text-[9px] font-mono text-[#FAF8F5]/75">Từ {formatVND(price?.basePrice)} ₫</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
