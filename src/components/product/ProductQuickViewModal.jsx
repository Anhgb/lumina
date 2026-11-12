import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Sparkles, Box, Check, ShoppingBag, Plus, Minus, AlertCircle, Star, MessageSquare } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import ReviewList from '../reviews/ReviewList';

export default function ProductQuickViewModal({ product, onClose }) {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('details'); // 'details' | 'reviews'
  const { addToCart } = useCart();
  const { requireAuth } = useAuth();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const isOutOfStock = product.stock === 0;

  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    // RBAC Guard: Intercept Guest before modifying CartContext (PRD 6.3)
    requireAuth(() => {
      const result = addToCart(product, qty);
      if (result?.success) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickview-title"
    >
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-3xl bg-white border border-[#D6D3CD] rounded-sm shadow-2xl overflow-hidden max-h-[90vh] flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-[#141413]/60 hover:text-[#141413] bg-white/80 rounded-full border border-[#D6D3CD]/60 transition-colors"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Product Image */}
        <div className="md:w-1/2 bg-[#FAF8F5] relative p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-[#D6D3CD]">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-64 md:h-80 object-cover rounded-sm shadow-sm"
          />
          <div className="absolute bottom-4 left-4">
            <span className="text-[10px] font-mono tracking-widest uppercase bg-[#141413] text-[#FAF8F5] px-2.5 py-1 rounded">
              {product.categoryLabel}
            </span>
          </div>
        </div>

        {/* Right: Specifications & CTAs */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-[#D4AF37] font-semibold uppercase tracking-wider">
                ✦ BẢN GỐC THIẾT KẾ LUMINA
              </span>
              <h2 id="quickview-title" className="font-brand text-2xl font-bold text-[#141413]">
                {product.name}
              </h2>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="font-brand text-2xl font-bold text-[#141413]">
                {formatVND(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-[#141413]/40 line-through">
                  {formatVND(product.originalPrice)}
                </span>
              )}
              {product.discountPercent > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#DC2626] text-white font-bold">
                  -{product.discountPercent}%
                </span>
              )}
            </div>

            {/* Tab Switcher: Details vs Reviews */}
            <div className="flex items-center gap-4 border-b border-[#D6D3CD] pb-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveModalTab('details')}
                className={`pb-1 transition-colors cursor-pointer ${
                  activeModalTab === 'details'
                    ? 'border-b-2 border-[#D4AF37] text-[#141413]'
                    : 'text-[#141413]/50 hover:text-[#141413]'
                }`}
              >
                Thông tin & Đặt hàng
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('reviews')}
                className={`pb-1 transition-colors flex items-center gap-1 cursor-pointer ${
                  activeModalTab === 'reviews'
                    ? 'border-b-2 border-[#D4AF37] text-[#141413]'
                    : 'text-[#141413]/50 hover:text-[#141413]'
                }`}
              >
                <Star className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
                <span>Đánh giá khách hàng</span>
              </button>
            </div>

            {activeModalTab === 'reviews' ? (
              <div className="py-2 overflow-y-auto max-h-[60vh]">
                <ReviewList productId={product.id} />
              </div>
            ) : (
              <>
                {/* Description */}
                <p className="text-xs text-[#141413]/80 leading-relaxed font-body">
                  {product.description}
                </p>

                {/* Tech Specs */}
                <div className="pt-2 border-t border-[#D6D3CD]/60 space-y-2 text-xs text-[#141413]/80 font-body">
                  <div className="flex items-center justify-between">
                    <span className="text-[#141413]/50">Chất liệu gọng:</span>
                    <span className="font-medium text-[#141413]">{product.frameMaterial}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#141413]/50">Kích thước chuẩn:</span>
                    <span className="font-mono text-[#141413]">{product.dimensions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#141413]/50">Tình trạng kho:</span>
                    <span className="font-medium text-[#141413]">
                      {product.stock > 0 ? `Còn ${product.stock} chiếc` : 'Tạm hết hàng'}
                    </span>
                  </div>
                </div>

                {/* Recommended Face Shapes */}
                <div className="pt-2 space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#141413]/70">
                    Dáng mặt tối ưu:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.recommendedFaces?.map((face) => (
                      <span
                        key={face}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#D4AF37]/50 text-[#141413] font-medium"
                      >
                        ✦ {face}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Area: Quantity Selector & Add to Cart */}
          <div className="pt-4 border-t border-[#D6D3CD] space-y-3">
            {!isOutOfStock ? (
              <div className="flex items-center gap-3">
                {/* Quantity controller */}
                <div className="flex items-center border border-[#D6D3CD] rounded-sm bg-[#FAF8F5]">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="p-2 text-[#141413]/70 hover:text-[#141413] disabled:opacity-30"
                    aria-label="Giảm số lượng"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 py-1 text-xs font-mono font-bold min-w-[32px] text-center">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                    disabled={qty >= product.stock}
                    className="p-2 text-[#141413]/70 hover:text-[#141413] disabled:opacity-30"
                    aria-label="Tăng số lượng"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Add to Cart button */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`flex-1 py-2.5 px-4 rounded-sm text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    justAdded
                      ? 'bg-[#141413] text-[#D4AF37] border border-[#141413]'
                      : 'bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413]'
                  }`}
                >
                  {justAdded ? (
                    <>
                      <Check className="w-4 h-4 text-[#D4AF37]" />
                      <span>Đã thêm vào giỏ!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Thêm {qty} vào giỏ</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-[#141413]/5 border border-[#D6D3CD] rounded text-center text-xs text-[#DC2626] font-medium flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Mẫu kính này hiện đã hết hàng trong kho.</span>
              </div>
            )}

            {/* Direct Dual CTAs */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                to={`/try-on?product=${product.id}`}
                onClick={onClose}
                className="py-2.5 px-2 bg-[#FAF8F5] border border-[#D4AF37]/60 text-[#141413] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-[11px] font-semibold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 text-center"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Thử Kính AI</span>
              </Link>

              <Link
                to={`/studio-3d?model=${product.category}`}
                onClick={onClose}
                className="py-2.5 px-2 bg-white border border-[#141413] text-[#141413] hover:bg-[#FAF8F5] transition-colors text-[11px] font-semibold uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 text-center"
              >
                <Box className="w-3.5 h-3.5" />
                <span>Phòng 3D</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
