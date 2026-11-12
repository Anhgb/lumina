import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Box, Calendar, Tag, ArrowRight } from 'lucide-react';

const TEMPLE_STYLE_LABELS = {
  'classic-acetate': 'Acetate Cổ Điển',
  'slim-metal': 'Kim Loại Thanh Mảnh',
  'statement-wide': 'Bản Rộng Phong Cách',
  'sculpted-comfort': 'Điêu Khắc Comfort',
};

const PLACEMENT_LABELS = {
  outer_temple: 'Mặt ngoài càng',
  inner_temple: 'Mặt trong càng',
  two_temples: 'Cả hai mặt',
};

export default function BespokeModal({ design, onClose }) {
  const navigate = useNavigate();
  if (!design) return null;

  const spec = design.designSpec || {};
  const formatVND = (num) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  const handleOpenInStudio = () => {
    onClose();
    navigate(`/studio-3d?model=${encodeURIComponent(spec.baseModel || 'aviator')}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div
        className="bg-[#FAF8F5] border border-[#D6D3CD] rounded-sm max-w-xl w-full shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#141413] text-[#FAF8F5] flex items-center justify-between border-b border-[#D4AF37]/30">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-mono">
              Chi tiết tác phẩm độc bản
            </span>
            <h3 className="font-brand font-bold text-base text-[#FAF8F5]">
              {design.productName || `Lumina Bespoke ${spec.baseModel?.toUpperCase()}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/60 hover:text-white rounded"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Snapshot Image */}
          {design.snapshotPath ? (
            <div className="w-full h-48 bg-white border border-[#D4AF37]/30 rounded flex items-center justify-center overflow-hidden relative group">
              <img
                src={
                  design.snapshotPath.startsWith('http')
                    ? design.snapshotPath
                    : `http://localhost:3000${design.snapshotPath}`
                }
                alt="3D Bespoke Snapshot"
                className="w-full h-full object-contain p-2"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white font-mono text-[9px] rounded">
                Snapshot độc bản
              </span>
            </div>
          ) : (
            <div className="w-full h-36 bg-white border border-[#D6D3CD] rounded flex flex-col items-center justify-center text-[#141413]/40">
              <Box className="w-8 h-8 mb-1" />
              <span className="text-xs font-mono">Không có ảnh snapshot 2D</span>
            </div>
          )}

          {/* Specs Grid */}
          <div className="p-3.5 bg-white rounded border border-[#D6D3CD] space-y-3">
            <h4 className="font-mono text-xs uppercase font-bold text-[#D4AF37] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Thông số cấu hình 3D</span>
            </h4>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-[#141413]/50 block text-[10px]">Dáng gọng:</span>
                <strong className="capitalize">{spec.baseModel || 'Aviator'}</strong>
              </div>

              <div>
                <span className="text-[#141413]/50 block text-[10px]">Màu gọng:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-3 h-3 rounded-full border border-black/20"
                    style={{ backgroundColor: spec.frameColor || '#D4AF37' }}
                  />
                  <span className="font-mono">{spec.frameColor || '#D4AF37'}</span>
                </div>
              </div>

              <div>
                <span className="text-[#141413]/50 block text-[10px]">Kiểu càng kính:</span>
                <strong>{TEMPLE_STYLE_LABELS[spec.templeStyle] || 'Acetate Cổ Điển'}</strong>
              </div>

              <div>
                <span className="text-[#141413]/50 block text-[10px]">Tròng kính:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-3 h-3 rounded-full border border-black/20"
                    style={{ backgroundColor: spec.lensColor || '#1F2937' }}
                  />
                  <span>Độ tối: {Math.round((spec.lensOpacity || 0.45) * 100)}%</span>
                </div>
              </div>

              <div>
                <span className="text-[#141413]/50 block text-[10px]">Đính đá Swarovski:</span>
                <strong className={spec.hasRhinestones ? 'text-[#D4AF37]' : 'text-[#141413]/60'}>
                  {spec.hasRhinestones ? 'Có đính đá cao cấp' : 'Không'}
                </strong>
              </div>

              <div>
                <span className="text-[#141413]/50 block text-[10px]">Charms gắn kèm:</span>
                <strong>
                  {Array.isArray(spec.charms) && spec.charms.length > 0
                    ? spec.charms.join(', ')
                    : 'Không'}
                </strong>
              </div>

              {spec.engravingText && (
                <div className="col-span-2 p-2 bg-[#FAF8F5] rounded border border-[#D4AF37]/30">
                  <span className="text-[#141413]/50 block text-[10px]">Chữ khắc Laser cá nhân:</span>
                  <strong className="font-mono text-[#D4AF37]">
                    &quot;{spec.engravingText}&quot;{' '}
                    <span className="font-sans font-normal text-[#141413]/60 text-[11px]">
                      ({PLACEMENT_LABELS[spec.engravingPlacement] || 'Mặt ngoài càng'})
                    </span>
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Associated Order Reference */}
          {design.orderCode && (
            <div className="flex items-center justify-between text-xs text-[#141413]/70 font-mono px-1">
              <span>Mã đơn hàng: <strong>{design.orderCode}</strong></span>
              {design.unitPrice && (
                <span>Giá trị: <strong className="text-[#141413]">{formatVND(design.unitPrice)}</strong></span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#D6D3CD] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleOpenInStudio}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] text-[#141413] hover:bg-[#D4AF37]/90 font-bold rounded-sm text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mở trong 3D Studio</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 text-[#141413] hover:bg-neutral-300 rounded-sm text-xs font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

