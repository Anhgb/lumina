import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Sparkles, CheckCircle2 } from 'lucide-react';

function formatVND(amount) {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

export default function ProductRecommendationCard({ product, onActionClick }) {
  if (!product) return null;

  return (
    <div className="bg-white border border-[rgba(20,20,19,0.1)] hover:border-[#D4AF37]/70 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 text-left w-full max-w-[320px] group">
      {/* Product Image */}
      <div className="relative aspect-[16/10] bg-[#FAF8F5] overflow-hidden">
        <img
          src={product.image || '/assets/logo-lumina.jpg'}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />
        {/* Frame Shape Badge */}
        {product.categoryLabel && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-[#141413]/85 text-[#FAF8F5] rounded-full backdrop-blur-xs border border-[#D4AF37]/30">
            {product.categoryLabel}
          </div>
        )}
      </div>

      {/* Editorial Content */}
      <div className="p-3.5 space-y-2.5">
        <div>
          <h4 className="font-brand text-xs font-semibold text-[#141413] tracking-wide line-clamp-1 group-hover:text-[#D4AF37] transition-colors">
            {product.name}
          </h4>
          {product.frameMaterial && (
            <p className="text-[10px] text-[#8E8A82] font-mono mt-0.5 truncate">
              {product.frameMaterial}
            </p>
          )}
        </div>

        {/* Short Description */}
        {product.description && (
          <p className="text-[11px] text-[#6B6B6B] leading-relaxed line-clamp-2 font-body">
            {product.description}
          </p>
        )}

        {/* Price & Stock */}
        <div className="flex items-center justify-between pt-1 border-t border-[rgba(20,20,19,0.06)]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-bold text-[#D4AF37] font-mono">
              {formatVND(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-[10px] text-[#A8A49C] line-through font-mono">
                {formatVND(product.originalPrice)}
              </span>
            )}
          </div>

          {typeof product.stock === 'number' && (
            <span className="text-[9px] text-emerald-700 font-medium flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
              {product.stock > 0 ? `Còn ${product.stock} chiếc` : 'Sẵn Atelier'}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Link
            to={product.tryOnUrl || `/try-on?model=${product.category || 'aviator'}`}
            onClick={onActionClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#D4AF37] hover:bg-[#C29D29] text-[#141413] font-semibold text-[11px] rounded-lg transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-98"
          >
            <Sparkles className="w-3 h-3 text-[#141413]" />
            <span>Thử ngay</span>
          </Link>

          <Link
            to={product.actionUrl || '/catalog'}
            onClick={onActionClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#FAF8F5] hover:bg-[#F0EDE6] text-[#141413] border border-[#D6D3CD] font-medium text-[11px] rounded-lg transition-colors active:scale-98"
          >
            <Eye className="w-3 h-3 text-[#6B6B6B]" />
            <span>Xem chi tiết</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
