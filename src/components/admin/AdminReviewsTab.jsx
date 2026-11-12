import React, { useState, useEffect } from 'react';
import { ShieldCheck, EyeOff, Check, RotateCcw, AlertCircle, Search, Filter } from 'lucide-react';
import { getAdminReviews, adminModerateReview } from '../../api/reviewService';
import StarRating from '../reviews/StarRating';

/**
 * AdminReviewsTab component
 * 
 * Moderation queue for product reviews with audit logging.
 */
export default function AdminReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Moderate modal state
  const [selectedReview, setSelectedReview] = useState(null);
  const [modalAction, setModalAction] = useState('hide'); // 'hide', 'approve', 'restore'
  const [modalReason, setModalReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    loadReviews();
  }, [statusFilter, page]);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminReviews({
        status: statusFilter,
        page,
        limit: 15,
        search: searchTerm,
      });
      if (res.success) {
        setReviews(res.data.reviews || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError('Không thể tải danh sách kiểm duyệt đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadReviews();
  };

  const openModerateModal = (review, action) => {
    setSelectedReview(review);
    setModalAction(action);
    setModalReason('');
    setActionError(null);
  };

  const handleModerateSubmit = async (e) => {
    e.preventDefault();
    if (!modalReason.trim() || modalReason.trim().length < 3) {
      setActionError('Vui lòng nhập lý do kiểm duyệt (tối thiểu 3 ký tự).');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      await adminModerateReview(selectedReview.id, {
        action: modalAction,
        reason: modalReason.trim(),
      });
      setSelectedReview(null);
      loadReviews();
    } catch (err) {
      setActionError(err.response?.data?.message || err.message || 'Thao tác thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã duyệt
          </span>
        );
      case 'hidden':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
            Đã ẩn
          </span>
        );
      case 'deleted':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Đã xóa
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-brand text-xl text-stone-900">Kiểm Duyệt Đánh Giá Sản Phẩm</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Mọi thao tác ẩn/duyệt đều được ghi nhật ký kiểm toán (audit log) bắt buộc.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="approved">Đã duyệt (Công khai)</option>
            <option value="hidden">Đã ẩn (Vi phạm)</option>
            <option value="pending">Chờ duyệt</option>
          </select>

          {/* Search box */}
          <form onSubmit={handleSearch} className="flex items-center gap-1.5">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mã đơn / Nội dung..."
              className="text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 w-48 focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              className="p-2 bg-[#141413] text-stone-100 rounded-xl hover:bg-stone-800 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-stone-500">Đang tải đánh giá...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-sm text-stone-500">Không có đánh giá nào phù hợp.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Mã / Sản phẩm</th>
                  <th className="py-3 px-4">Người mua</th>
                  <th className="py-3 px-4">Đánh giá</th>
                  <th className="py-3 px-4">Nội dung</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {reviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-stone-900 font-semibold">{rev.reviewCode}</div>
                      <div className="text-[11px] text-stone-500 truncate max-w-[160px]">
                        {rev.productName || `SP #${rev.productId}`}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                        Đơn: {rev.orderCode || `#${rev.orderId}`}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-stone-900">{rev.userId}</div>
                      {rev.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-medium">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Đã xác thực
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StarRating rating={rev.rating} size="sm" showText />
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {rev.title && (
                        <div className="font-semibold text-stone-900 text-[11px] truncate">
                          {rev.title}
                        </div>
                      )}
                      <p className="text-stone-600 line-clamp-2 mt-0.5">{rev.content}</p>
                      {rev.moderationReason && (
                        <div className="text-[10px] text-stone-500 italic mt-1 bg-stone-100/70 p-1 rounded">
                          Lý do: {rev.moderationReason}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(rev.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      {rev.status === 'approved' ? (
                        <button
                          type="button"
                          onClick={() => openModerateModal(rev, 'hide')}
                          className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <EyeOff className="w-3 h-3 text-amber-600" /> Ẩn
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openModerateModal(rev, 'approve')}
                          className="px-2.5 py-1 text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-emerald-600" /> Duyệt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Moderation Reason Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-stone-200">
            <h4 className="font-brand text-lg text-stone-900 mb-1">
              {modalAction === 'hide' ? 'Ẩn Đánh Giá Sản Phẩm' : 'Phê Duyệt Đánh Giá'}
            </h4>
            <p className="text-xs text-stone-500 mb-4">
              Hành động này sẽ được ghi vào nhật ký kiểm toán hệ thống.
            </p>

            {actionError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleModerateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-stone-600 mb-1">
                  Lý do kiểm duyệt <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="Ví dụ: Nội dung chứa ngôn từ spam, quảng cáo bên ngoài hoặc sai sự thật..."
                  rows={3}
                  className="w-full text-xs p-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`px-5 py-2 text-xs font-medium rounded-xl text-white transition-colors ${
                    modalAction === 'hide'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {actionLoading ? 'Đang lưu...' : 'Xác Nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

