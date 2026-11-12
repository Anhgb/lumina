import React, { useState } from 'react';

const VIEW_PRESETS = [
  {
    id: 'front',
    label: 'Chính Diện',
    labelEn: 'Front',
    pos: [0, 0.4, 3.6],
    target: [0, 0, 0],
    icon: '◉',
  },
  {
    id: 'side',
    label: 'Góc Cạnh',
    labelEn: 'Side',
    pos: [4.0, 0.3, 1.5],
    target: [0, 0, 0],
    icon: '◀',
  },
  {
    id: 'threequarter',
    label: '3/4',
    labelEn: '3/4 View',
    pos: [2.5, 0.6, 2.8],
    target: [0, 0, 0],
    icon: '◈',
  },
  {
    id: 'inner-temple',
    label: 'Mặt Trong Càng',
    labelEn: 'Inner Temple',
    pos: [3.2, 0.2, -1.0],
    target: [0, 0, 0],
    icon: '◑',
  },
  {
    id: 'reset',
    label: 'Đặt Lại',
    labelEn: 'Reset',
    pos: [0, 0.4, 3.6],
    target: [0, 0, 0],
    icon: '↺',
  },
];

export default function ViewPresetControls({ onSetView }) {
  const [activeView, setActiveView] = useState('front');

  const handleView = (preset) => {
    setActiveView(preset.id);
    onSetView?.({ pos: preset.pos, target: preset.target });
  };

  return (
    <div className="bg-[#121212]/90 border border-[#D6D3CD]/15 rounded-sm px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]/80">
          GÓC NHÌN NHANH
        </span>
        <span className="flex-1 h-px bg-[#D6D3CD]/10" />
        <span className="text-[9px] font-mono text-[#FAF8F5]/30">CAMERA PRESETS</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {VIEW_PRESETS.map((preset) => {
          const isActive = activeView === preset.id && preset.id !== 'reset';
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleView(preset)}
              title={preset.labelEn}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all border ${
                isActive
                  ? 'bg-[#D4AF37] text-[#141413] border-[#D4AF37] font-bold shadow-md shadow-[#D4AF37]/20'
                  : preset.id === 'reset'
                  ? 'border-[#D6D3CD]/20 text-[#FAF8F5]/50 hover:text-[#FAF8F5] hover:border-[#D6D3CD]/40'
                  : 'border-[#D6D3CD]/15 text-[#FAF8F5]/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5'
              }`}
              aria-pressed={isActive}
            >
              <span className="text-[11px] leading-none">{preset.icon}</span>
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

