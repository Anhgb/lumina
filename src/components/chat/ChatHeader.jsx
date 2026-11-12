import React from 'react';
import { X, Minus, Maximize2, Minimize2, ChevronDown } from 'lucide-react';

export default function ChatHeader({
  onMinimize,
  onClose,
  isMinimized = false,
  onToggleMaximize,
  isMaximized = false,
}) {
  return (
    <div
      onDoubleClick={(e) => {
        // Tránh kích hoạt khi bấm trúng các nút điều khiển
        if (e.target.closest('button')) return;
        if (isMinimized) {
          onMinimize?.();
        } else if (onToggleMaximize) {
          onToggleMaximize();
        }
      }}
      title={isMinimized ? 'Nhấp đúp để mở lại cửa sổ' : 'Nhấp đúp thanh tiêu đề để phóng to/thu nhỏ'}
      className="bg-[#141413] text-[#FAF8F5] px-4 py-3 border-b border-[#D4AF37]/25 flex items-center justify-between select-none relative z-10 cursor-default"
    >
      {/* Brand & Status */}
      <div className="flex items-center gap-2.5">
        {/* Monogram Star Badge */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#262624] to-[#141413] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shadow-xs">
            <span className="font-brand font-bold text-sm">✦</span>
          </div>
          {/* Online Indicator with pulse ripple */}
          <span className="absolute bottom-0 right-0 flex h-2.5 w-2.5" title="Trực tuyến">
            <span className="animate-status-radar absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="animate-status-dot relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-1.5 ring-[#141413]" />
          </span>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-brand text-xs font-semibold tracking-[0.15em] text-[#FAF8F5] uppercase">
              LUMINA CONCIERGE
            </h3>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#D4AF37]/15 text-[#D4AF37] font-mono border border-[#D4AF37]/30 font-medium">
              AI
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-status-radar absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="animate-status-dot relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <p className="text-[10px] text-[#A8A49C] tracking-wide">
              Trực tuyến ✦ Sẵn sàng phục vụ
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1">
        {/* Phóng to / Khôi phục kích thước (Desktop) */}
        {!isMinimized && onToggleMaximize && (
          <button
            type="button"
            onClick={onToggleMaximize}
            title={isMaximized ? 'Khôi phục kích thước chuẩn' : 'Phóng to cửa sổ'}
            aria-label={isMaximized ? 'Khôi phục kích thước chuẩn' : 'Phóng to cửa sổ chat'}
            className="p-1.5 rounded-lg text-[#A8A49C] hover:text-[#D4AF37] hover:bg-[#262624] transition-colors cursor-pointer"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Thu nhỏ về thanh tiêu đề */}
        <button
          type="button"
          onClick={onMinimize}
          title={isMinimized ? 'Mở rộng cửa sổ' : 'Thu nhỏ thanh tiêu đề'}
          aria-label={isMinimized ? 'Mở rộng cửa sổ chat' : 'Thu nhỏ thanh tiêu đề'}
          className="p-1.5 rounded-lg text-[#A8A49C] hover:text-[#FAF8F5] hover:bg-[#262624] transition-colors cursor-pointer"
        >
          {isMinimized ? (
            <ChevronDown className="w-4 h-4 rotate-180 text-[#D4AF37]" />
          ) : (
            <Minus className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Đóng cửa sổ */}
        <button
          type="button"
          onClick={onClose}
          title="Đóng cửa sổ"
          aria-label="Đóng cửa sổ chat"
          className="p-1.5 rounded-lg text-[#A8A49C] hover:text-[#FAF8F5] hover:bg-[#262624] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
