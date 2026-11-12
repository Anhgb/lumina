import React from 'react';

export default function QuickActions({ actions = [], onSelectAction, disabled = false }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {actions.map((action, index) => (
        <button
          key={`quick-${index}-${action}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelectAction(action)}
          className="text-[11px] font-medium text-[#141413] bg-white hover:bg-[#FAF8F5] active:bg-[#F0EDE6] border border-[rgba(20,20,19,0.12)] hover:border-[#D4AF37] hover:text-[#D4AF37] px-2.5 py-1 rounded-full transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs hover:shadow-xs text-left select-none flex items-center gap-1 active:scale-98"
        >
          <span className="text-[#D4AF37] text-[10px]">✦</span>
          <span>{action}</span>
        </button>
      ))}
    </div>
  );
}
