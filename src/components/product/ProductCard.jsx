import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Box, Eye, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

/**
 * ProductCard — Individual eyewear card conforming to PRD 5.3 & Prompt 3:
 * - Image with SVG vector fallback
 * - Formatted VND pricing with discount badge
 * - Stock badge & status
 * - '✦ AI Gợi ý' badge when matching face shape filter
 * - Quick View Modal action
 * - "Thêm vào giỏ" action with RBAC & stock boundary checking
 * - Dual action buttons (3D Studio, AI Try-On)
 */
export default function ProductCard({
  product,
  activeFaceShape = 'all',
  onQuickView,
}) {
  const [imageError, setImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { addToCart } = useCart();
  const { requireAuth } = useAuth();

  const isOutOfStock = product.stock === 0;
  const isAiRecommended =
    activeFaceShape !== 'all' &&
    Array.isArray(product.recommendedFaces) &&
    product.recommendedFaces.includes(activeFaceShape);

  // Format VND currency
  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    // RBAC Guard: Intercept Guest before modifying CartContext (PRD 6.3)
    requireAuth(() => {
      const result = addToCart(product, 1);
      if (result?.success) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
      }
    });
  };

  return (
    <article
      className="group relative bg-white border border-[#D6D3CD] rounded-sm overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-[#141413] hover:shadow-xl"
      aria-label={product.name}
    >
      {/* Top Media Area */}
      <div className="relative aspect-[4/3] bg-[#FAF8F5] overflow-hidden flex items-center justify-center p-4">
        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
          {/* AI Recommendation Badge */}
          {isAiRecommended && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#141413] text-[#FAF8F5] text-[10px] font-bold uppercase tracking-wider shadow-sm border border-[#D4AF37]/60">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>✦ AI Gợi Ý</span>
            </span>
          )}

          {/* New Arrival Badge */}
          {product.isNew && !isAiRecommended && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#D4AF37] text-[#141413] text-[10px] font-bold uppercase tracking-wider">
              Mới Ra Mắt
            </span>
          )}

          {/* Discount Badge */}
          {product.discountPercent > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#DC2626] text-[#FAF8F5] text-[10px] font-bold">
              -{product.discountPercent}%
            </span>
          )}
        </div>

        {/* Stock Badge */}
        <div className="absolute top-3 right-3 z-10">
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[#141413]/80 text-[#FAF8F5] text-[10px] font-medium tracking-wide">
              <AlertCircle className="w-3 h-3 text-[#DC2626]" />
              <span>Hết hàng</span>
            </span>
          ) : product.stock <= 5 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#D97706]/15 text-[#D97706] text-[10px] font-semibold border border-[#D97706]/30">
              Chỉ còn {product.stock} chiếc
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[#FAF8F5]/80 text-[#141413]/70 text-[10px] font-medium border border-[#D6D3CD]/50">
              <Check className="w-2.5 h-2.5 text-[#141413]" />
              <span>Sẵn hàng</span>
            </span>
          )}
        </div>

        {/* Product Image with Error Fallback */}
        {!imageError ? (
          <img
            src={product.image}
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          /* Elegant Vector Eyewear Silhouette Fallback */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-[#141413]/60 bg-[#FAF8F5]">
            <svg
              viewBox="0 0 200 80"
              className="w-32 h-14 stroke-[#141413] fill-none transition-transform duration-300 group-hover:scale-110"
              strokeWidth="2.5"
            >
              {product.category === 'cateye' && (
                <path d="M20 30 C 30 15, 75 15, 85 45 C 85 65, 30 65, 20 40 Z M115 45 C 125 15, 170 15, 180 30 C 170 65, 115 65, 115 45 Z M85 40 L 115 40" />
              )}
              {product.category === 'aviator' && (
                <path d="M25 25 C 40 18, 75 18, 85 40 C 85 70, 30 70, 25 40 Z M115 40 C 125 18, 160 18, 175 25 C 170 70, 115 70, 115 40 Z M85 28 L 115 28 M85 38 L 115 38" />
              )}
              {product.category === 'round' && (
                <path d="M30 40 A 25 25 0 1 0 80 40 A 25 25 0 1 0 30 40 M120 40 A 25 25 0 1 0 170 40 A 25 25 0 1 0 120 40 M80 40 L 120 40" />
              )}
              {product.category === 'square' && (
                <path d="M25 20 H85 V60 H25 Z M115 20 H175 V60 H115 Z M85 40 L 115 40" />
              )}
            </svg>
            <span className="text-[11px] font-mono tracking-wider mt-2 text-[#D4AF37]">
              ✦ LUMINA BESPOKE
            </span>
          </div>
        )}

        {/* Quick View Button (Desktop Hover) */}
        <button
          type="button"
          onClick={() => onQuickView?.(product)}
          className="absolute inset-x-4 bottom-3 z-10 py-2.5 bg-[#FAF8F5]/95 backdrop-blur-sm text-[#141413] text-xs font-semibold uppercase tracking-wider rounded-sm shadow-md border border-[#D6D3CD] flex items-center justify-center gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-[#141413] hover:text-[#FAF8F5]"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Xem chi tiết nhanh</span>
        </button>
      </div>

      {/* Information Area */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Category & Material Line */}
          <div className="flex items-center justify-between text-[11px] text-[#141413]/60 font-body">
            <span className="uppercase tracking-wider font-medium text-[#D4AF37]">
              {product.categoryLabel}
            </span>
            <span className="truncate max-w-[130px]">{product.dimensions}</span>
          </div>

          {/* Product Title */}
          <h3 className="font-brand text-base sm:text-lg font-bold text-[#141413] leading-snug line-clamp-1 group-hover:text-[#D4AF37] transition-colors">
            {product.name}
          </h3>

          {/* Material & Specs */}
          <p className="text-xs text-[#141413]/70 font-body line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* Recommended Face Shapes Tag List */}
          <div className="pt-1 flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-[#141413]/50 font-medium">Dáng mặt:</span>
            {product.recommendedFaces?.map((face) => {
              const isMatch = face === activeFaceShape;
              return (
                <span
                  key={face}
                  className={`text-[9px] px-1.5 py-0.5 rounded ${
                    isMatch
                      ? 'bg-[#141413] text-[#FAF8F5] font-bold'
                      : 'bg-[#FAF8F5] text-[#141413]/70 border border-[#D6D3CD]/60'
                  }`}
                >
                  {face}
                </span>
              );
            })}
          </div>
        </div>

        {/* Pricing, Add To Cart & Dual CTAs */}
        <div className="pt-3 border-t border-[#D6D3CD]/60 space-y-3">
          {/* Price display */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-brand text-lg font-bold text-[#141413]">
                {formatVND(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-[#141413]/40 line-through">
                  {formatVND(product.originalPrice)}
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-[#D4AF37]">
              ★ {product.rating} ({product.reviewCount})
            </span>
          </div>

          {/* Primary Action: Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full py-2.5 px-3 rounded-sm text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
              isOutOfStock
                ? 'bg-[#D6D3CD]/60 text-[#141413]/40 cursor-not-allowed border border-[#D6D3CD]'
                : justAdded
                ? 'bg-[#141413] text-[#D4AF37] border border-[#141413]'
                : 'bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] border border-[#141413] shadow-sm'
            }`}
          >
            {isOutOfStock ? (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Tạm hết hàng</span>
              </>
            ) : justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Đã thêm vào giỏ!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Thêm vào giỏ</span>
              </>
            )}
          </button>

          {/* Dual Secondary Action Buttons (3D Atelier & AI Try-On) */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <Link
              to={`/studio-3d?model=${product.category}`}
              className="py-1.5 px-2 rounded-sm border border-[#D6D3CD] text-[#141413]/80 hover:border-[#141413] hover:text-[#141413] transition-colors text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 text-center"
            >
              <Box className="w-3 h-3 text-[#D4AF37]" />
              <span>Phòng 3D</span>
            </Link>

            <Link
              to={`/try-on?product=${product.id}`}
              className="py-1.5 px-2 rounded-sm border border-[#D6D3CD] text-[#141413]/80 hover:border-[#D4AF37] hover:text-[#141413] transition-colors text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 text-center"
            >
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>Thử AI</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
