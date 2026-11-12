import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  Star,
  Award,
  Share2,
  Bell,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Info,
  Calendar,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { fetchAdminRetentionAnalytics } from '../../api/adminService';

const CARE_TYPE_LABELS = {
  warranty_claim: 'Bảo hành / Lỗi kỹ thuật',
  fit_adjustment: 'Điều chỉnh ve mũi / gọng',
  deep_cleaning: 'Vệ sinh siêu âm định kỳ',
  repair_service: 'Sửa chữa phụ kiện',
  usage_consultation: 'Tư vấn sử dụng kính',
  catalog_return: 'Đổi trả kính catalog',
  other: 'Vấn đề khác',
};

const CARE_STATUS_LABELS = {
  submitted: 'Mới gửi',
  reviewing: 'Đang xem xét',
  waiting_customer: 'Chờ khách phản hồi',
  approved: 'Đã duyệt tiếp nhận',
  in_progress: 'Đang xử lý kỹ thuật',
  resolved: 'Đã hoàn tất',
  closed_other: 'Đã đóng / Từ chối',
};

export default function AdminRetentionTab() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all');
  const [windowDays, setWindowDays] = useState(90);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminRetentionAnalytics({ period, windowDays });
      if (res?.success) {
        setAnalytics(res.data);
      } else {
        setError(res?.message || 'Không thể tải dữ liệu Retention Analytics.');
      }
    } catch (err) {
      console.error('[AdminRetentionTab] Error:', err);
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [period, windowDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !analytics) {
    return (
      <div className="bg-white border border-[#D6D3CD] rounded-sm p-12 text-center shadow-sm">
        <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto mb-3" />
        <div className="text-sm font-medium text-[#141413]">Đang tính toán các chỉ số Giữ Chân & Chăm Sóc Khách Hàng...</div>
        <div className="text-xs text-[#141413]/50 mt-1">Truy vấn trực tiếp từ cơ sở dữ liệu MySQL</div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="bg-white border border-rose-200 rounded-sm p-8 text-center shadow-sm">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
        <div className="text-sm font-semibold text-rose-800 mb-1">Không thể tải báo cáo Retention</div>
        <div className="text-xs text-rose-600 mb-4">{error}</div>
        <button
          type="button"
          onClick={loadData}
          className="px-4 py-2 bg-[#141413] text-[#FAF8F5] text-xs font-semibold rounded-sm hover:bg-[#D4AF37] hover:text-[#141413] transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const {
    repeatPurchase,
    secondPurchaseConversion,
    reviews,
    afterSales,
    loyalty,
    referral,
    notifications,
    cohortMethodologyNotice,
  } = analytics || {};

  return (
    <div className="space-y-6">
      {/* ── HEADER & CONTROL TOOLBAR ── */}
      <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#141413] font-mono">
              CUSTOMER RETENTION & OPERATIONS ANALYTICS
            </h2>
          </div>
          <p className="text-xs text-[#141413]/60">
            Hệ thống đo lường hiệu quả giữ chân, tần suất mua lại và chất lượng dịch vụ chăm sóc sau mua của Lumina Atelier.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Period selector */}
          <div className="flex items-center border border-[#D6D3CD] rounded-sm overflow-hidden text-xs">
            <span className="px-2.5 py-1.5 bg-[#FAF8F5] text-[#141413]/60 border-r border-[#D6D3CD] font-mono text-[11px]">
              Kỳ lọc:
            </span>
            <button
              type="button"
              onClick={() => setPeriod('30d')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                period === '30d' ? 'bg-[#141413] text-[#FAF8F5]' : 'bg-white text-[#141413]/70 hover:bg-[#FAF8F5]'
              }`}
            >
              30 ngày
            </button>
            <button
              type="button"
              onClick={() => setPeriod('90d')}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-[#D6D3CD] ${
                period === '90d' ? 'bg-[#141413] text-[#FAF8F5]' : 'bg-white text-[#141413]/70 hover:bg-[#FAF8F5]'
              }`}
            >
              90 ngày
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-[#D6D3CD] ${
                period === 'all' ? 'bg-[#141413] text-[#FAF8F5]' : 'bg-white text-[#141413]/70 hover:bg-[#FAF8F5]'
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Window Days selector */}
          <div className="flex items-center border border-[#D6D3CD] rounded-sm overflow-hidden text-xs">
            <span className="px-2.5 py-1.5 bg-[#FAF8F5] text-[#141413]/60 border-r border-[#D6D3CD] font-mono text-[11px]">
              Cửa sổ đơn 2:
            </span>
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setWindowDays(d)}
                className={`px-2.5 py-1.5 font-medium transition-colors border-l first:border-l-0 border-[#D6D3CD] ${
                  windowDays === d ? 'bg-[#D4AF37] text-[#141413] font-bold' : 'bg-white text-[#141413]/70 hover:bg-[#FAF8F5]'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Reload button */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-[#D6D3CD] rounded-sm hover:border-[#D4AF37] text-[#141413]/70 hover:text-[#141413] transition-colors bg-white cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 8 KPI CARDS GRID (MINH BẠCH & CÓ CÔNG THỨC) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Repeat Purchase Rate */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-[#D4AF37] transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]" />
          <div className="pl-3">
            <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">Tỷ lệ mua lại (Repeat)</span>
              <Users className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="text-3xl font-display font-light text-[#141413] mb-1">
              {repeatPurchase?.rateFormatted || '0%'}
            </div>
            <div className="text-xs text-[#141413]/60 font-medium mb-2">
              <span className="text-[#141413] font-bold font-mono">{repeatPurchase?.repeatCustomers || 0}</span> / {repeatPurchase?.totalCustomers || 0} khách hàng có ≥ 2 đơn
            </div>
            <div className="text-[10px] text-[#141413]/40 border-t border-[#D6D3CD]/50 pt-2 font-mono leading-tight">
              ✦ {repeatPurchase?.formula}
            </div>
          </div>
        </div>

        {/* KPI 2: Second Purchase Conversion */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-blue-400 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="pl-3">
            <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">Chuyển đổi đơn 2 ({windowDays}d)</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-display font-light text-blue-600 mb-1">
              {secondPurchaseConversion?.rateFormatted || '0%'}
            </div>
            <div className="text-xs text-[#141413]/60 font-medium mb-2">
              <span className="text-[#141413] font-bold font-mono">{secondPurchaseConversion?.convertedCount || 0}</span> / {secondPurchaseConversion?.totalFirstTimeBuyers || 0} khách mua lại (TB: {secondPurchaseConversion?.avgDaysFormatted})
            </div>
            <div className="text-[10px] text-[#141413]/40 border-t border-[#D6D3CD]/50 pt-2 font-mono leading-tight">
              ✦ {secondPurchaseConversion?.formula}
            </div>
          </div>
        </div>

        {/* KPI 3: Review Rate & Star Rating */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-amber-400 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
          <div className="pl-3">
            <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">Tỷ lệ đánh giá (Review)</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-display font-light text-amber-700">{reviews?.reviewRateFormatted || '0%'}</span>
              <span className="text-xs font-mono text-[#141413]/60">({reviews?.averageRating || 0} ★)</span>
            </div>
            <div className="text-xs text-[#141413]/60 font-medium mb-2">
              <span className="text-[#141413] font-bold font-mono">{reviews?.verifiedReviewsCount || 0}</span> review xác minh / {reviews?.totalDeliveredItems || 0} SP đã giao
            </div>
            <div className="text-[10px] text-[#141413]/40 border-t border-[#D6D3CD]/50 pt-2 font-mono leading-tight">
              ✦ {reviews?.formula}
            </div>
          </div>
        </div>

        {/* KPI 4: Mean Time to Resolution (MTTR) */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div className="pl-3">
            <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">Thời gian giải quyết (MTTR)</span>
              <Clock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-display font-light text-emerald-600 mb-1">
              {afterSales?.resolutionTime?.averageHoursFormatted || '0 giờ'}
            </div>
            <div className="text-xs text-[#141413]/60 font-medium mb-2">
              Đã giải quyết: <span className="text-[#141413] font-bold font-mono">{afterSales?.resolvedCount || 0}</span> / {afterSales?.totalRequests || 0} phiếu tiếp nhận
            </div>
            <div className="text-[10px] text-[#141413]/40 border-t border-[#D6D3CD]/50 pt-2 font-mono leading-tight">
              ✦ {afterSales?.resolutionTime?.formula}
            </div>
          </div>
        </div>

        {/* KPI 5: Loyalty Liability / Outstanding Points */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-purple-400 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <div className="pl-3">
            <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">Nghĩa vụ điểm thưởng</span>
              <Award className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-display font-light text-purple-700 mb-1 truncate">
              {loyalty?.liabilityVndFormatted || '0đ'}
            </div>
            <div className="text-xs text-[#141413]/60 font-medium mb-2">
              Tồn: <span className="text-[#141413] font-bold font-mono">{loyalty?.outstandingPointsFormatted}</span> (Tỷ lệ đổi: {loyalty?.redemptionRateFormatted})
            </div>
            <div className="text-[10px] text-[#141413]/40 border-t border-[#D6D3CD]/50 pt-2 font-mono leading-tight">
              ✦ {loyalty?.formula}
            </div>
          </div>
        </div>

        {/* KPI 6: Referral Conversion */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-indigo-400 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <div className="pl-3">
            <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">Chuyển đổi giới thiệu</span>
              <Share2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-3xl font-display font-light text-indigo-600 mb-1">
              {referral?.conversionRateFormatted || '0%'}
            </div>
            <div className="text-xs text-[#141413]/60 font-medium mb-2">
              <span className="text-[#141413] font-bold font-mono">{referral?.convertedAttributions || 0}</span> / {referral?.totalAttributions || 0} lượt giới thiệu hợp lệ (+{referral?.totalRewardedPoints || 0} điểm)
            </div>
            <div className="text-[10px] text-[#141413]/40 border-t border-[#D6D3CD]/50 pt-2 font-mono leading-tight">
              ✦ {referral?.formula}
            </div>
          </div>
        </div>

        {/* KPI 7: Notification Marketing Opt-in */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-teal-400 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-teal-500" />
          <div className="pl-3">
            <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">Chấp thuận Marketing (Opt-in)</span>
              <Bell className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-3xl font-display font-light text-teal-600 mb-1">
              {notifications?.marketingOptInRateFormatted || '0%'}
            </div>
            <div className="text-xs text-[#141413]/60 font-medium mb-2">
              Chăm sóc: <span className="font-bold text-[#141413]">{notifications?.careRemindersOptInRateFormatted}</span> | Phát thành công: {notifications?.deliverySuccessRateFormatted}
            </div>
            <div className="text-[10px] text-[#141413]/40 border-t border-[#D6D3CD]/50 pt-2 font-mono leading-tight">
              ✦ {notifications?.formula}
            </div>
          </div>
        </div>

        {/* KPI 8: Active Care Tickets Volume */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-rose-400 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <div className="pl-3">
            <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-2">
              <span className="font-mono uppercase tracking-wider">Phiếu hỗ trợ đang xử lý</span>
              <ShieldCheck className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-3xl font-display font-light text-rose-600 mb-1">
              {afterSales?.activeCount || 0}
            </div>
            <div className="text-xs text-[#141413]/60 font-medium mb-2">
              Tổng tiếp nhận: <span className="text-[#141413] font-bold font-mono">{afterSales?.totalRequests || 0}</span> phiếu
            </div>
            <div className="text-[10px] text-[#141413]/40 border-t border-[#D6D3CD]/50 pt-2 font-mono leading-tight">
              ✦ Bao gồm trạng thái: Mới gửi, Xem xét, Chờ khách, Đang làm
            </div>
          </div>
        </div>
      </div>

      {/* ── CHI TIẾT PHÂN BỔ (OPERATIONS BREAKDOWNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Box 1: After-sales Volume by Request Type */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6D3CD]/60 pb-3">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-[#141413]">
              ✦ PHÂN BỔ LOẠI PHIẾU LUMINA CARE
            </div>
            <span className="text-[11px] font-mono text-[#141413]/50">
              Tổng: {afterSales?.totalRequests || 0} phiếu
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(afterSales?.breakdownByType || {}).length === 0 ? (
              <div className="py-6 text-center text-xs text-[#141413]/40">Chưa ghi nhận phiếu Lumina Care nào.</div>
            ) : (
              Object.entries(afterSales?.breakdownByType || {}).map(([typeKey, count]) => {
                const total = afterSales?.totalRequests || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={typeKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#141413]/70 font-medium">{CARE_TYPE_LABELS[typeKey] || typeKey}</span>
                      <span className="font-mono text-[#141413] font-bold">
                        {count} <span className="text-[#141413]/40 font-normal">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#FAF8F5] border border-[#D6D3CD]/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Box 2: Care Status Funnel */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6D3CD]/60 pb-3">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-[#141413]">
              ✦ TIẾN TRÌNH XỬ LÝ PHIẾU (FUNNEL TRẠNG THÁI)
            </div>
            <span className="text-[11px] font-mono text-emerald-600 font-bold">
              Hoàn tất: {afterSales?.resolvedCount || 0}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Object.entries(afterSales?.breakdownByStatus || {}).map(([stKey, stCount]) => (
              <div key={stKey} className="bg-[#FAF8F5] border border-[#D6D3CD]/60 p-3 rounded-sm space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#141413]/50 truncate">
                  {CARE_STATUS_LABELS[stKey] || stKey}
                </div>
                <div className="text-xl font-display font-light text-[#141413]">{stCount}</div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50/70 border border-amber-200/60 p-3 rounded-sm text-[11px] text-amber-900/80 leading-relaxed">
            💡 <strong>Quy tắc loại trừ MTTR:</strong> Phiếu đang ở trạng thái <em>"Chờ khách phản hồi" ({afterSales?.breakdownByStatus?.waiting_customer || 0} phiếu)</em> không tính vào thời gian trễ của nhân viên kỹ thuật.
          </div>
        </div>

        {/* Box 3: Loyalty Tier Distribution */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6D3CD]/60 pb-3">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-[#141413]">
              ✦ CƠ CẤU HẠNG THÀNH VIÊN LUMINA MEMBERSHIP
            </div>
            <span className="text-[11px] font-mono text-purple-700 font-bold">
              {loyalty?.totalAccounts || 0} tài khoản
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Member', code: 'member', color: 'border-[#8E8A82] text-[#8E8A82] bg-stone-50', count: loyalty?.tierDistribution?.member || 0 },
              { label: 'Silver', code: 'silver', color: 'border-slate-400 text-slate-700 bg-slate-50', count: loyalty?.tierDistribution?.silver || 0 },
              { label: 'Gold', code: 'gold', color: 'border-amber-400 text-amber-700 bg-amber-50', count: loyalty?.tierDistribution?.gold || 0 },
              { label: 'Diamond', code: 'diamond', color: 'border-sky-400 text-sky-700 bg-sky-50', count: loyalty?.tierDistribution?.diamond || 0 },
            ].map((t) => (
              <div key={t.code} className={`border ${t.color} p-3 rounded-sm text-center space-y-1`}>
                <div className="text-[10px] font-mono uppercase tracking-wider font-bold">{t.label}</div>
                <div className="text-2xl font-display font-light">{t.count}</div>
                <div className="text-[10px] opacity-70">hội viên</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-[#141413]/60 flex items-center justify-between border-t border-[#D6D3CD]/50 pt-3">
            <span>Tổng điểm tích lũy trọn đời:</span>
            <span className="font-mono font-bold text-[#141413]">
              {(loyalty?.lifetimePoints || 0).toLocaleString('vi-VN')} điểm
            </span>
          </div>
        </div>

        {/* Box 4: Star Rating Distribution */}
        <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D6D3CD]/60 pb-3">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-[#141413]">
              ✦ PHÂN BỔ ĐÁNH GIÁ SẢN PHẨM (RATING)
            </div>
            <span className="text-[11px] font-mono text-amber-600 font-bold">
              {reviews?.totalReviews || 0} đánh giá
            </span>
          </div>

          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = reviews?.ratingDistribution?.[stars] || 0;
              const total = Math.max(reviews?.totalReviews || 0, 1);
              const pct = Math.round((count / total) * 100);
              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <span className="w-10 font-mono text-amber-700 font-bold flex items-center gap-1">
                    {stars} <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  </span>
                  <div className="flex-1 h-2 bg-[#FAF8F5] border border-[#D6D3CD]/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-[#141413]/70">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-[#141413]/60 flex items-center justify-between border-t border-[#D6D3CD]/50 pt-3">
            <span>Đánh giá đã duyệt hiển thị:</span>
            <span className="font-mono font-bold text-emerald-600">
              {reviews?.approvedReviewsCount || 0} / {reviews?.totalReviews || 0}
            </span>
          </div>
        </div>
      </div>

      {/* ── METHODOLOGY & COHORT CAVEAT (TRUNG THỰC & MINH BẠCH DỮ LIỆU) ── */}
      <div className="bg-stone-50 border border-stone-300 p-4 rounded-sm flex items-start gap-3">
        <Info className="w-5 h-5 text-stone-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-stone-700 leading-relaxed space-y-1">
          <div className="font-bold text-[#141413] uppercase tracking-wider font-mono text-[11px]">
            ✦ NGUYÊN TẮC MINH BẠCH DỮ LIỆU & GIỚI HẠN PHƯƠNG PHÁP LUẬN
          </div>
          <div>{cohortMethodologyNotice}</div>
          <div className="text-[11px] text-stone-500 font-mono">
            Mọi số liệu trên được tính toán tự động dựa trên giao dịch thực tế đã qua xác minh tại máy chủ Backend MySQL Lumina Eyewear.
          </div>
        </div>
      </div>
    </div>
  );
}

