import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Package,
  RotateCcw,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

export default function CartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cartItems,
    totalCount,
    totalPrice,
    increaseQuantity,
    decreaseQuantity,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { requireAuth, openAuthModal } = useAuth();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // If redirected from protected checkout route, auto-open AuthModal
  useEffect(() => {
    if (location.state?.requireLogin) {
      openAuthModal({
        hint: 'Đăng nhập để tiếp tục mua hàng và theo dõi đơn hàng của bạn.',
      });
    }
  }, [location.state, openAuthModal]);

  // Format VND currency
  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) return;

    // RBAC Guard: Intercept Guest or Admin before navigating to Checkout (PRD 6.3)
    requireAuth(
      () => {
        navigate('/checkout');
      },
      {
        requiredRole: 'customer',
        message: 'Vui lòng đăng nhập Lumina Eyewear trước khi lưu cấu hình kính và thực hiện mua hàng.',
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413] pb-24">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <ol className="flex items-center space-x-2 text-xs text-[#141413]/60 font-body">
          <li>
            <Link to="/" className="hover:text-[#D4AF37] transition-colors">
              Trang chủ
            </Link>
          </li>
          <ChevronRight className="w-3.5 h-3.5 text-[#141413]/40" />
          <li className="font-semibold text-[#141413] tracking-wide" aria-current="page">
            Giỏ hàng ({totalCount})
          </li>
        </ol>
      </nav>

      {/* 2. Page Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-b border-[#D6D3CD]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="lumina-descriptor">YOUR SELECTION</div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-light text-[#141413] tracking-tight">
              Giỏ Hàng Của Bạn
            </h1>
          </div>
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="text-xs text-[#DC2626] hover:underline font-medium self-start sm:self-auto flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ giỏ hàng</span>
            </button>
          )}
        </div>
      </header>

      {/* 3. Main Content: Empty vs Non-Empty State */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {cartItems.length === 0 ? (
          /* Empty Cart State */
          <div className="py-20 text-center max-w-lg mx-auto bg-white border border-[#D6D3CD] rounded-sm p-8 sm:p-12 shadow-sm space-y-6">
            <div className="w-16 h-16 bg-[#FAF8F5] border border-[#D4AF37]/50 rounded-full mx-auto flex items-center justify-center text-[#D4AF37]">
              <ShoppingBag className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-light text-[#141413]">
                Giỏ hàng của bạn đang trống
              </h2>
              <p className="text-xs sm:text-sm text-[#141413]/70 font-body leading-relaxed">
                Chưa có mẫu kính nào trong giỏ. Hãy khám phá bộ sưu tập kính thời trang cao cấp
                kết hợp công nghệ AI Stylist của Lumina để tìm thiết kế hoàn hảo cho bạn.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-semibold uppercase tracking-[0.2em] rounded-sm shadow-md"
              >
                <span>Khám phá bộ sưu tập</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Non-Empty Cart Layout (Grid: Items List + Order Summary) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Cart Items List (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="hidden sm:grid grid-cols-12 pb-3 border-b border-[#D6D3CD] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#141413]/60 px-4">
                <span className="col-span-6">Sản phẩm</span>
                <span className="col-span-2 text-center">Đơn giá</span>
                <span className="col-span-2 text-center">Số lượng</span>
                <span className="col-span-2 text-right">Thành tiền</span>
              </div>

              {cartItems.map((item) => {
                const isMaxStock = item.quantity >= item.stock;
                const lineTotal = (item.price || 0) * (item.quantity || 1);

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-[#D6D3CD] p-4 sm:p-5 rounded-sm shadow-sm flex flex-col sm:grid sm:grid-cols-12 items-center gap-4 transition-all hover:border-[#141413]/70"
                  >
                    {/* Product Details (6 cols on sm) */}
                    <div className="w-full sm:col-span-6 flex items-center gap-4">
                      {/* Image Thumbnail */}
                      <div className="w-20 h-20 bg-[#FAF8F5] rounded-sm border border-[#D6D3CD]/60 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-sm"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4AF37]">
                            {item.categoryLabel}
                          </span>
                          {item.productType === 'custom' && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 rounded">
                              ✦ 3D Bespoke
                            </span>
                          )}
                        </div>
                        <h3 className="font-brand text-sm sm:text-base font-bold text-[#141413] truncate">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-[#141413]/60 font-body truncate">
                          {item.frameMaterial || item.dimensions}
                        </p>
                        {item.designSpec && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {item.designSpec.hasRhinestones && (
                              <span className="text-[9px] font-mono bg-[#FAF8F5] border border-[#D6D3CD] px-1 rounded text-[#141413]/80">
                                💎 Đá Swarovski
                              </span>
                            )}
                            {item.designSpec.charms?.length > 0 && (
                              <span className="text-[9px] font-mono bg-[#FAF8F5] border border-[#D6D3CD] px-1 rounded text-[#141413]/80">
                                ✦ {item.designSpec.charms.length} Charm
                              </span>
                            )}
                            {item.designSpec.templeStyle && item.designSpec.templeStyle !== 'classic-acetate' && (
                              <span className="text-[9px] font-mono bg-[#FAF8F5] border border-[#D6D3CD] px-1 rounded text-[#141413]/80">
                                ⬛ {
                                  { 'slim-metal': 'Kim Loại Thanh Mảnh', 'statement-wide': 'Bản Rộng', 'sculpted-comfort': 'Điêu Khắc' }[item.designSpec.templeStyle]
                                  || item.designSpec.templeStyle
                                }
                              </span>
                            )}
                            {item.designSpec.engravingText && (
                              <span className="text-[9px] font-mono bg-[#FAF8F5] border border-[#D6D3CD] px-1 rounded text-[#D4AF37]">
                                ✒ &quot;{item.designSpec.engravingText}&quot;{item.designSpec.engravingPlacement === 'inner_temple' ? ' (trong)' : item.designSpec.engravingPlacement === 'two_temples' ? ' (2 mặt)' : ''}
                              </span>
                            )}
                          </div>
                        )}
                        {item.stock <= 5 && (
                          <span className="inline-block text-[10px] text-[#D97706] font-medium">
                            Chỉ còn {item.stock} chiếc trong kho
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unit Price (2 cols on sm) */}
                    <div className="w-full sm:col-span-2 flex sm:justify-center items-center justify-between text-xs text-[#141413]">
                      <span className="sm:hidden text-[#141413]/60">Đơn giá:</span>
                      <span className="font-mono font-medium">{formatVND(item.price)}</span>
                    </div>

                    {/* Quantity Selector (2 cols on sm) */}
                    <div className="w-full sm:col-span-2 flex sm:justify-center items-center justify-between">
                      <span className="sm:hidden text-[#141413]/60 text-xs">Số lượng:</span>
                      <div className="flex items-center border border-[#D6D3CD] rounded-sm bg-[#FAF8F5]">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          disabled={item.quantity <= 1}
                          className="p-1.5 text-[#141413]/70 hover:text-[#141413] disabled:opacity-30 transition-colors"
                          aria-label={`Giảm số lượng ${item.name}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, e.target.value)}
                          className="w-8 text-center text-xs font-mono font-bold bg-transparent outline-none"
                          aria-label={`Số lượng của ${item.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          disabled={isMaxStock}
                          className="p-1.5 text-[#141413]/70 hover:text-[#141413] disabled:opacity-30 transition-colors"
                          aria-label={`Tăng số lượng ${item.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Subtotal & Remove (2 cols on sm) */}
                    <div className="w-full sm:col-span-2 flex sm:flex-col items-center justify-between sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D6D3CD]/40">
                      <div className="text-right">
                        <span className="sm:hidden text-xs text-[#141413]/60 mr-2">Tổng:</span>
                        <span className="font-brand font-bold text-sm sm:text-base text-[#141413]">
                          {formatVND(lineTotal)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-[#141413]/40 hover:text-[#DC2626] transition-colors p-1"
                        aria-label={`Xóa ${item.name} khỏi giỏ`}
                        title="Xóa khỏi giỏ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Back to catalog link */}
              <div className="pt-4">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#141413] hover:text-[#D4AF37] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Tiếp tục khám phá bộ sưu tập</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Order Summary (4 cols) */}
            <div className="lg:col-span-4 sticky top-24 space-y-6">
              <div className="bg-white border border-[#D6D3CD] p-6 rounded-sm shadow-sm space-y-6">
                <h3 className="font-brand text-lg font-bold uppercase tracking-wider text-[#141413] pb-3 border-b border-[#D6D3CD]">
                  Tóm Tắt Đơn Hàng
                </h3>

                <div className="space-y-3 text-xs font-body">
                  <div className="flex justify-between text-[#141413]/70">
                    <span>Tổng số lượng sản phẩm:</span>
                    <span className="font-mono font-medium text-[#141413]">{totalCount} chiếc</span>
                  </div>

                  <div className="flex justify-between text-[#141413]/70">
                    <span>Tạm tính tiền hàng:</span>
                    <span className="font-mono font-medium text-[#141413]">
                      {formatVND(totalPrice)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[#141413]/70">
                    <span>Vận chuyển tiêu chuẩn:</span>
                    <span className="font-semibold text-[#141413]">Miễn phí</span>
                  </div>

                  <div className="flex justify-between text-[#141413]/70">
                    <span>Hộp quà & Khăn lau Lumina:</span>
                    <span className="font-semibold text-[#D4AF37]">✦ Tặng kèm</span>
                  </div>
                </div>

                {/* Final Total Amount */}
                <div className="pt-4 border-t border-[#D6D3CD] flex items-baseline justify-between">
                  <span className="font-brand text-base font-bold text-[#141413]">
                    Tổng thanh toán:
                  </span>
                  <span className="font-brand text-2xl font-bold text-[#141413]">
                    {formatVND(totalPrice)}
                  </span>
                </div>

                {/* Proceed to Checkout CTA */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleProceedToCheckout}
                    className="w-full py-3.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-semibold uppercase tracking-[0.2em] rounded-sm flex items-center justify-center gap-2 shadow-md group"
                  >
                    <span>Tiến hành thanh toán</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <p className="text-[10px] text-center text-[#141413]/60 font-body">
                    Hỗ trợ kiểm tra đơn hàng & nhập thông số tròng ở bước sau
                  </p>
                </div>
              </div>

              {/* Brand Assurance Box */}
              <div className="bg-[#FAF8F5] border border-[#D6D3CD] p-5 rounded-sm space-y-3">
                <div className="flex items-center gap-3 text-xs text-[#141413]/80">
                  <Package className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                  <span>Đóng gói cao cấp có tem niêm phong độc quyền</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#141413]/80">
                  <RotateCcw className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                  <span>Đổi trả miễn phí trong 30 ngày nếu không vừa vặn</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#141413]/80">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                  <span>Bảo hành kết cấu gọng kính 12 tháng chính hãng</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clear Cart */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-[#D6D3CD] rounded-sm p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-[#DC2626]">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="font-brand text-lg font-bold">Xác nhận làm trống giỏ hàng?</h4>
            </div>
            <p className="text-xs text-[#141413]/70 font-body leading-relaxed">
              Thao tác này sẽ xóa tất cả {totalCount} sản phẩm đang có trong giỏ hàng của bạn. Bạn có
              chắc chắn muốn tiếp tục không?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 border border-[#D6D3CD] text-xs font-semibold uppercase tracking-wider rounded-sm text-[#141413] hover:bg-[#FAF8F5]"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setConfirmClearOpen(false);
                }}
                className="px-5 py-2 bg-[#DC2626] text-white text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#B91C1C]"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
