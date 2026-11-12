import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, Filter, ThumbsUp, MessageSquare, AlertCircle } from 'lucide-react';
import StarRating from './StarRating';
import { getProductReviews, getProductRatingSummary } from '../../api/reviewService';

/**
 * ReviewList component
 * 
 * Displays verified reviews, rating distribution, and filters for a product.
 */
export default function ReviewList({ productId, onOpenWriteReview, hasPurchased = false }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStar, setSelectedStar] = useState(null);
  const [sortBy, setSortBy] = useState('latest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    if (!productId) return;
    loadSummary();
    loadReviews();
  }, [productId, selectedStar, sortBy, page]);

  const loadSummary = async () => {
    try {
      const res = await getProductRatingSummary(productId);
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.warn('Could not load review summary:', err);
    }
  };

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProductReviews(productId, {
        page,
        limit: 10,
        sort: sortBy,
        star: selectedStar || undefined,
      });
      if (res.success) {
        setReviews(res.data.reviews || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError('Không thể tải danh sách đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  const totalReviews = summary?.totalReviews || 0;
  const averageRating = summary?.averageRating || 0;
  const distribution = summary?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <h3 className="font-brand text-2xl text-stone-900">Đánh Giá & Nhận Xét Từ Khách Hàng</h3>
          <p className="text-sm text-stone-500 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            100% đánh giá từ khách hàng đã mua và nhận hàng thực tế
          </p>
        </div>

        {onOpenWriteReview && (
          <button
            onClick={onOpenWriteReview}
            className="px-5 py-2.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#2A2927] rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center gap-2 self-start md:self-auto"
          >
            <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
            Viết Đánh Giá
          </button>
        )}
      </div>

      {/* Summary Score & Distribution Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-6 border-b border-stone-200">
        {/* Score box */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-stone-50 rounded-2xl border border-stone-100 text-center">
          <div className="text-5xl font-brand font-bold text-stone-900">
            {averageRating > 0 ? averageRating.toFixed(1) : '—'}
          </div>
          <div className="my-2">
            <StarRating rating={averageRating} size="md" />
          </div>
          <p className="text-xs text-stone-500">
            Dựa trên <span className="font-semibold text-stone-800">{totalReviews}</span> lượt đánh giá xác thực
          </p>
        </div>

        {/* Breakdown bars */}
        <div className="md:col-span-8 flex flex-col justify-center space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star] || 0;
            const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            const isSelected = selectedStar === star;

            return (
              <button
                key={star}
                type="button"
                onClick={() => setSelectedStar(isSelected ? null : star)}
                className={`flex items-center gap-3 text-xs w-full text-left py-1 px-2 rounded-lg transition-colors ${
                  isSelected ? 'bg-amber-50 font-medium' : 'hover:bg-stone-50'
                }`}
              >
                <span className="w-12 flex items-center gap-1 text-stone-700">
                  {star} <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                </span>
                <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D4AF37] rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-10 text-right text-stone-500">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-6 pb-4">
        {/* Star filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-stone-500 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Lọc:
          </span>
          <button
            onClick={() => setSelectedStar(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedStar === null
                ? 'bg-[#141413] text-stone-100'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Tất cả ({totalReviews})
          </button>
          {[5, 4, 3, 2, 1].map((star) => (
            <button
              key={star}
              onClick={() => setSelectedStar(selectedStar === star ? null : star)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                selectedStar === star
                  ? 'bg-[#D4AF37] text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {star} <Star className="w-3 h-3 fill-current" /> ({distribution[star] || 0})
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-stone-700 focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="latest">Mới nhất</option>
            <option value="highest">Đánh giá cao nhất</option>
            <option value="lowest">Đánh giá thấp nhất</option>
          </select>
        </div>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="py-12 text-center text-sm text-stone-500">Đang tải đánh giá...</div>
      ) : error ? (
        <div className="py-8 text-center text-sm text-rose-600 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center text-stone-500">
          <MessageSquare className="w-10 h-10 mx-auto text-stone-300 mb-2" />
          <p className="text-sm">Chưa có đánh giá nào phù hợp với bộ lọc.</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {reviews.map((rev) => (
            <div key={rev.id} className="py-5 first:pt-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 font-semibold text-xs flex items-center justify-center uppercase">
                    {rev.userIdMasked.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-stone-900">{rev.userIdMasked}</span>
                    {rev.isVerifiedPurchase && (
                      <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Đã mua hàng
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-stone-400">
                  {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <StarRating rating={rev.rating} size="sm" />
                {rev.title && (
                  <span className="text-sm font-semibold text-stone-800">{rev.title}</span>
                )}
              </div>

              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                {rev.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 border-t border-stone-100">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-lg disabled:opacity-40"
          >
            Trang trước
          </button>
          <span className="text-xs text-stone-500">
            {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1.5 text-xs font-medium border border-stone-200 rounded-lg disabled:opacity-40"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}

