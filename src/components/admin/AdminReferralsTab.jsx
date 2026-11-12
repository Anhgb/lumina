import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, Clock, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { getAdminReferrals, adminReviewReferral } from '../../api/referralService';

/**
 * AdminReferralsTab component
 * 
 * Admin audit queue for referral attributions and anti-fraud monitoring.
 */
export default function AdminReferralsTab() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    loadReferrals();
  }, [statusFilter, page]);

  const loadReferrals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminReferrals({
        status: statusFilter,
        page,
        limit: 15,
      });
      if (res.success) {
        setReferrals(res.data.referrals || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError('Không thể tải danh sách giới thiệu.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (attributionId, newStatus) => {
    const reason = window.prompt(
      `Nhập lý do chuyển trạng thái sang "${newStatus}":`,
      newStatus === 'rejected' ? 'Phát hiện nghi vấn tự giới thiệu hoặc tài khoản trùng lặp.' : 'Kiểm tra thủ công bởi quản trị viên.'
    );
    if (!reason) return;

    try {
      await adminReviewReferral(attributionId, {
        status: newStatus,
        rejectionReason: reason,
      });
      loadReferrals();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Thao tác thất bại.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'rewarded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã trao thưởng
          </span>
        );
      case 'qualified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Đủ điều kiện (DRAFT rule)
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" /> Cần xem xét (Anti-fraud)
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Đã từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
            <Clock className="w-3.5 h-3.5" /> Chờ đơn hàng
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-brand text-xl text-stone-900">Quản Lý & Kiểm Toán Giới Thiệu Bạn Bè</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Theo dõi lượt giới thiệu, đối soát chống gian lận và trạng thái chi thưởng.
          </p>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-white border border-stone-300 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ đơn hàng</option>
            <option value="qualified">Đủ điều kiện (Chờ duyệt)</option>
            <option value="rewarded">Đã trao thưởng</option>
            <option value="review">Cần xem xét (Nghi vấn)</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-stone-500">Đang tải danh sách...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-rose-600 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center text-sm text-stone-500">Không có dữ liệu giới thiệu nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Mã giới thiệu</th>
                  <th className="py-3 px-4">Người giới thiệu</th>
                  <th className="py-3 px-4">Khách hàng mới</th>
                  <th className="py-3 px-4">Đơn hàng liên kết</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Ngày tạo / duyệt</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#D4AF37]">
                      {ref.referral_code || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-stone-900">
                      {ref.referrer_user_id}
                    </td>
                    <td className="py-3.5 px-4 text-stone-700">
                      {ref.referred_user_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-600">
                      {ref.order_code ? (
                        <span className="text-emerald-700 font-medium">{ref.order_code}</span>
                      ) : (
                        <span className="text-stone-400">Chưa phát sinh</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(ref.status)}
                      {ref.rejection_reason && (
                        <div className="text-[10px] text-rose-600 italic mt-0.5 max-w-[150px] truncate">
                          {ref.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-stone-500">
                      <div>{new Date(ref.created_at).toLocaleDateString('vi-VN')}</div>
                      {ref.rewarded_at && (
                        <div className="text-[10px] text-emerald-600">
                          Thưởng: {new Date(ref.rewarded_at).toLocaleDateString('vi-VN')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                      {ref.status !== 'rejected' && ref.status !== 'rewarded' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(ref.id, 'review')}
                            className="px-2 py-1 text-[11px] font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors"
                          >
                            Đánh dấu nghi vấn
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(ref.id, 'rejected')}
                            className="px-2 py-1 text-[11px] font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

