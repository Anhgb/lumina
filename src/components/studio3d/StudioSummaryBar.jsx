import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, Camera, RotateCcw, ArrowRight, Check, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import { addWatermarkToSnapshot } from '../../utils/watermarkHelper';

export default function StudioSummaryBar({
  designSpec,
  priceInfo,
  onReset,
  onCaptureSnapshot,
}) {
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const { addToCart, showToast } = useCart();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Format VND currency
  const formatVND = (num) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  // 1. CTA: Navigate to AI Try-On with current design (PRD 5.6)
  const handleTryOnDesign = () => {
    navigate('/try-on');
  };

  // 2. CTA: Export design with watermark & Add to Cart (PRD 5.7 & Prompt 4 RBAC)
  const handleExportToCart = () => {
    // Intercept with RBAC guard before modifying CartContext
    requireAuth(
      async () => {
        setIsExporting(true);
        try {
          // Capture raw 3D snapshot from WebGL canvas
          const rawSnapshot = onCaptureSnapshot ? onCaptureSnapshot() : null;

          // Stamp watermark: LUMINA EYEWEAR (PRD 2.4 & 5.7)
          const watermarkedSnapshot = rawSnapshot
            ? await addWatermarkToSnapshot(rawSnapshot)
            : null;

          // Create custom cart item conforming to PRD 8.3
          const customCartItem = {
            id: `custom-${Date.now()}`,
            productId: `bespoke-${designSpec.baseModel}`,
            name: `Lumina Bespoke 3D — ${priceInfo.modelName}`,
            category: designSpec.baseModel,
            categoryLabel: `Bespoke 3D (${designSpec.baseModel})`,
            price: priceInfo.total,
            originalPrice: null,
            image: watermarkedSnapshot || '/assets/logo-lumina.jpg',
            quantity: 1,
            stock: 99,
            productType: 'custom',
            designSpec: { ...designSpec },
            snapshotDataUrl: watermarkedSnapshot,
            frameMaterial: priceInfo.frameColorName,
            dimensions: 'Tùy biến theo tỷ lệ 3D',
          };

          const res = addToCart(customCartItem, 1);
          if (res?.success) {
            setExportSuccess(true);
            setTimeout(() => setExportSuccess(false), 2500);
          }
        } catch (err) {
          console.error('[StudioSummaryBar] Export error:', err);
          showToast('Lỗi khi xuất ảnh thiết kế 3D. Vui lòng thử lại.', 'error');
        } finally {
          setIsExporting(false);
        }
      },
      {
        requiredRole: 'customer',
        message:
          'Vui lòng đăng nhập Lumina Eyewear trước khi lưu cấu hình kính và thực hiện mua hàng.',
      }
    );
  };

  return (
    <div className="bg-[#121212] border border-[#D6D3CD]/20 p-6 rounded-sm shadow-2xl space-y-5">
      {/* Price Summary Breakdown */}
      <div className="space-y-2.5 pb-4 border-b border-[#D6D3CD]/15">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37]">
            ✦ BẢNG DỰ TOÁN THIẾT KẾ
          </span>
          <span className="text-[10px] font-mono text-[#FAF8F5]/40">
            CHẾ TÁC THỦ CÔNG
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] font-body text-[#FAF8F5]/80">
          <span className="text-[#FAF8F5]/60">
            Khung cơ bản ({priceInfo.modelName}):
          </span>
          <span className="font-mono text-[#FAF8F5] font-medium">
            {formatVND(priceInfo.basePrice)}
          </span>
        </div>

        {priceInfo.frameColorAddon > 0 && (
          <div className="flex items-center justify-between text-[11px] font-body text-[#FAF8F5]/80">
            <span className="text-[#FAF8F5]/60">Màu hoàn thiện ({priceInfo.frameColorName}):</span>
            <span className="font-mono text-[#D4AF37]">
              +{formatVND(priceInfo.frameColorAddon)}
            </span>
          </div>
        )}

        {priceInfo.rhinestonesAddon > 0 && (
          <div className="flex items-center justify-between text-[11px] font-body text-[#FAF8F5]/80">
            <span className="text-[#FAF8F5]/60">Đính đá Swarovski viền trên:</span>
            <span className="font-mono text-[#D4AF37]">
              +{formatVND(priceInfo.rhinestonesAddon)}
            </span>
          </div>
        )}

        {priceInfo.charmsAddon > 0 && (
          <div className="flex items-center justify-between text-[11px] font-body text-[#FAF8F5]/80">
            <span className="text-[#FAF8F5]/60">Charm điêu khắc ({priceInfo.charmsBreakdown.length} charm):</span>
            <span className="font-mono text-[#D4AF37]">
              +{formatVND(priceInfo.charmsAddon)}
            </span>
          </div>
        )}

        {priceInfo.hasEngraving && (
          <div className="flex items-center justify-between text-[11px] font-body text-[#FAF8F5]/80">
            <span className="text-[#FAF8F5]/60">Khắc laser tên &quot;{designSpec.engravingText}&quot;:</span>
            <span className="font-mono text-[#D4AF37]">
              +{formatVND(priceInfo.engravingAddon)}
            </span>
          </div>
        )}

        {/* Final Total */}
        <div className="pt-3 border-t border-[#D6D3CD]/10 flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#FAF8F5]/50 block">
              TỔNG CHI PHÍ THIẾT KẾ
            </span>
            <span className="text-[11px] text-[#FAF8F5]/40 font-body">
              Kèm hộp Bespoke & thẻ chứng thực
            </span>
          </div>
          <span className="font-brand text-3xl font-bold text-[#D4AF37] tracking-tight">
            {formatVND(priceInfo.total)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        {/* Export & Add to Cart Button */}
        <button
          type="button"
          onClick={handleExportToCart}
          disabled={isExporting}
          className={`w-full py-4 px-5 rounded-sm text-xs font-mono uppercase tracking-[0.2em] flex items-center justify-center gap-2.5 transition-all duration-300 shadow-xl group ${
            exportSuccess
              ? 'bg-[#15803D] text-white'
              : 'bg-[#D4AF37] text-[#141413] font-bold hover:bg-[#FAF8F5] shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/30 hover:scale-[1.01]'
          }`}
        >
          {isExporting ? (
            <>
              <Camera className="w-4 h-4 animate-spin text-[#141413]" />
              <span>Đang chụp Snapshot & Đóng Watermark...</span>
            </>
          ) : exportSuccess ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Đã lưu vào giỏ hàng thành công!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>XUẤT THIẾT KẾ & THÊM VÀO GIỎ</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>

        {/* Try-On Button & Reset */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          <button
            type="button"
            onClick={handleTryOnDesign}
            className="py-3 px-3 bg-white/[0.04] border border-[#D6D3CD]/25 text-[#FAF8F5] hover:border-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all rounded-sm text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
            title="Chuyển sang buồng thử AI Try-On để ướm thử mẫu thiết kế này lên khuôn mặt bạn qua webcam"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Thử AI lên mặt</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="py-3 px-3 bg-white/[0.04] border border-[#D6D3CD]/25 text-[#FAF8F5]/70 hover:border-white/40 hover:text-[#FAF8F5] hover:bg-white/[0.06] transition-all rounded-sm text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
            title="Đặt lại các thông số về mặc định"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại mẫu</span>
          </button>
        </div>
      </div>

      <p className="text-[9px] text-center text-[#FAF8F5]/40 font-mono tracking-wider leading-relaxed pt-1 border-t border-[#D6D3CD]/10">
        WebGL Snapshot buffer kết xuất kèm Watermark độc quyền LUMINA ATELIER (PRD 5.7).
      </p>
    </div>
  );
}
