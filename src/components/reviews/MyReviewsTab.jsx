import React, { useState, useEffect } from 'react';
import { Star, ShieldCheck, Trash2, Edit3, AlertCircle, MessageSquare } from 'lucide-react';
import StarRating from './StarRating';
import { getMyReviews, deleteReview } from '../../api/reviewService';

/**
 * MyReviewsTab component
 * 
 * Displays customer's review history with edit/delete options.
 */
export default function MyReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMyReviews();
  }, []);

  const loadMyReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyReviews();
      if (res.success) {
        setReviews(res.data.reviews || []);
      }
    } catch (err) {
      setError('Không thể tải lịch sử đánh giá của bạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
    try {
      await deleteReview(reviewId);
      loadMyReviews();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể xóa đánh giá.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">
        Đang tải lịch sử đánh giá...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-rose-600 flex items-center justify-center gap-2">
        <AlertCircle className="w-5 h-5" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h3 className="font-brand text-xl text-stone-900 mb-1">Đánh Giá Của Tôi ({reviews.length})</h3>
        <p className="text-xs text-stone-500">
          Danh sách các đánh giá bạn đã đóng góp cho cộng đồng Lumina Eyewear.
        </p>

        {reviews.length === 0 ? (
          <div className="py-12 text-center text-stone-500">
            <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm">Bạn chưa có đánh giá nào.</p>
            <p className="text-xs text-stone-400 mt-1">
              Hãy vào mục "Đơn hàng của tôi" và bấm "Đánh giá sản phẩm" cho các đơn đã nhận hàng thành công.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 mt-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-stone-900 text-sm">
                      {rev.productName || `Mã sản phẩm #${rev.productId}`}
                    </span>
                    <span className="text-xs text-stone-400 font-mono ml-2">
                      (Đơn: {rev.orderCode || `#${rev.orderId}`})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {rev.status === 'approved' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đã duyệt
                      </span>
                    ) : rev.status === 'hidden' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                        Đã ẩn
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Chờ duyệt
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(rev.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                      title="Xóa đánh giá"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StarRating rating={rev.rating} size="sm" />
                  {rev.title && (
                    <span className="text-xs font-semibold text-stone-800">{rev.title}</span>
                  )}
                  <span className="text-[11px] text-stone-400 ml-auto">
                    {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">{rev.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

