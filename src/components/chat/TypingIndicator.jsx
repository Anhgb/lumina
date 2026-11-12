import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex flex-col gap-1 items-start w-fit animate-fade-in">
      <div className="flex items-center gap-1.5 ml-1 text-[11px] text-[#8E8A82]">
        <div className="w-3.5 h-3.5 rounded-full bg-[#141413] flex items-center justify-center text-[#D4AF37] flex-shrink-0">
          <span className="text-[8px] font-bold">✦</span>
        </div>
        <span className="font-brand font-semibold text-[#141413] text-[10px] tracking-widest uppercase">
          LUMINA CONCIERGE
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-[rgba(20,20,19,0.08)] rounded-2xl rounded-tl-xs shadow-2xs">
        <span className="text-[11px] font-medium text-[#8E8A82] mr-0.5">Đang phản hồi</span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce" />
        </div>
      </div>
    </div>
  );
}
