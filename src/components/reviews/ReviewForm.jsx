import React, { useState } from 'react';
import { Star, ShieldCheck, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import StarRating from './StarRating';
import { createReview } from '../../api/reviewService';

/**
 * ReviewForm Modal
 * 
 * Allows verified buyers to write a product review.
 */
export default function ReviewForm({
  productId,
  productName,
  orderId,
  orderCode,
  orderItemId,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!rating || rating < 1 || rating > 5) {
      setError('Vui lòng chọn mức đánh giá từ 1 đến 5 sao.');
      return;
    }
    if (!content || content.trim().length < 5) {
      setError('Nội dung đánh giá cần tối thiểu 5 ký tự.');
      return;
    }

    setLoading(true);
    try {
      await createReview({
        productId,
        orderId,
        orderItemId,
        rating,
        title: title.trim(),
        content: content.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể gửi đánh giá lúc này.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FAF8F5] rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#141413] text-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-brand text-lg text-[#FAF8F5]">Đánh Giá Sản Phẩm</h3>
            <p className="text-xs text-[#D4AF37] flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Đơn mua đã xác thực: <span className="font-mono text-stone-300">{orderCode || `#${orderId}`}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-100 transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-3" />
              <h4 className="font-brand text-xl text-stone-900">Gửi đánh giá thành công!</h4>
              <p className="text-sm text-stone-600 mt-1">
                Cảm ơn bạn đã chia sẻ trải nghiệm chân thực về sản phẩm Lumina.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Product Info */}
              <div className="p-3 bg-stone-100/70 rounded-xl text-sm border border-stone-200/60">
                <span className="text-stone-500 text-xs">Sản phẩm:</span>
                <p className="font-medium text-stone-900 truncate">
                  {productName || `Mã sản phẩm #${productId}`}
                </p>
              </div>

              {/* Rating Star Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  Mức độ hài lòng <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <StarRating rating={rating} onChange={setRating} size="lg" />
                  <span className="text-xs font-medium text-stone-600">
                    {rating === 5 && 'Tuyệt vời, vượt mong đợi'}
                    {rating === 4 && 'Rất tốt, hài lòng'}
                    {rating === 3 && 'Bình thường'}
                    {rating === 2 && 'Chưa hài lòng'}
                    {rating === 1 && 'Rất thất vọng'}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  Tiêu đề đánh giá
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Thiết kế sang trọng, đeo rất nhẹ..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                  maxLength={150}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  Nội dung đánh giá chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Hãy chia sẻ cảm nhận về chất lượng gọng kính, ve kính, độ nhẹ và trải nghiệm đóng gói bao bì Atelier..."
                  rows={4}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                  minLength={5}
                  required
                />
                <span className="text-[11px] text-stone-400">
                  Tối thiểu 5 ký tự. Đánh giá từ người mua đã xác thực sẽ được hiển thị công khai.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900 font-medium transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium bg-[#141413] text-[#FAF8F5] hover:bg-[#2A2927] rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  {loading ? 'Đang gửi...' : 'Gửi Đánh Giá'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

