import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Package,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Calendar,
  Eye,
  ArrowRight,
  RefreshCw,
  Sliders,
  Bell,
  Box,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Award,
  Star,
  Share2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchMyProfile,
  fetchMyOrders,
  fetchMyOrderDetails,
  fetchMyBespokeDesigns,
} from '../api/customerService';
import {
  fetchMyCareRequests,
  confirmCustomerReceipt,
} from '../api/careService';
import OrderDetailModal from '../components/account/OrderDetailModal';
import BespokeModal from '../components/account/BespokeModal';
import CreateCareRequestModal from '../components/care/CreateCareRequestModal';
import CareTicketDetailModal from '../components/care/CareTicketDetailModal';
import LoyaltyTab from '../components/loyalty/LoyaltyTab';
import ReviewForm from '../components/reviews/ReviewForm';
import MyReviewsTab from '../components/reviews/MyReviewsTab';
import ReferralCard from '../components/referral/ReferralCard';
import PreferencesTab from '../components/account/PreferencesTab';

const STATUS_LABELS = {
  pending: { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  processing: { label: 'Đang chế tác', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  completed: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  cancelled: { label: 'Đã hủy', color: 'bg-rose-100 text-rose-800 border-rose-300' },
};

const TEMPLE_STYLE_LABELS = {
  'classic-acetate': 'Acetate Cổ Điển',
  'slim-metal': 'Kim Loại Thanh Mảnh',
  'statement-wide': 'Bản Rộng Phong Cách',
  'sculpted-comfort': 'Điêu Khắc Comfort',
};

export default function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'overview' | 'orders' | 'designs' | 'care' | 'preferences'
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [designs, setDesigns] = useState([]);
  const [draftDesign, setDraftDesign] = useState(null);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [isCreateCareOpen, setIsCreateCareOpen] = useState(false);
  const [selectedCareTicketCode, setSelectedCareTicketCode] = useState(null);
  const [initialCareOrderCode, setInitialCareOrderCode] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null); // { productId, productName, orderId, orderCode, orderItemId }

  // Care requests state
  const [careRequests, setCareRequests] = useState([]);
  const [loadingCare, setLoadingCare] = useState(false);

  // Consent states (local toggles)
  const [consents, setConsents] = useState({
    orderUpdates: true,
    careReminders: true,
    marketingEmail: false,
  });

  const formatVND = (num) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  // Load initial profile & recent orders
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, ordersRes, designsRes, careRes] = await Promise.all([
        fetchMyProfile(),
        fetchMyOrders({ page: 1, limit: 10 }),
        fetchMyBespokeDesigns(),
        fetchMyCareRequests().catch(() => ({ data: [] })),
      ]);

      if (profileRes?.data) setProfile(profileRes.data);
      if (ordersRes?.data) {
        setOrders(ordersRes.data);
        if (ordersRes.pagination) setOrdersPagination(ordersRes.pagination);
      }
      if (designsRes?.data) setDesigns(designsRes.data);
      if (careRes?.data) setCareRequests(careRes.data);

      // Check for local Studio draft
      try {
        const rawDraft = localStorage.getItem('lumina_studio_design');
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft);
          if (parsed && parsed.baseModel) {
            setDraftDesign(parsed);
          }
        }
      } catch {
        // Ignore localStorage error
      }
    } catch (err) {
      console.error('[AccountPage] Error loading customer data:', err);
      setError(err.message || 'Không thể tải dữ liệu tài khoản từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load orders when filter changes
  const loadFilteredOrders = useCallback(async (status) => {
    setOrdersLoading(true);
    try {
      const res = await fetchMyOrders({ page: 1, limit: 10, status });
      if (res?.data) {
        setOrders(res.data);
        if (res.pagination) setOrdersPagination(res.pagination);
      }
    } catch (err) {
      console.error('[AccountPage] Error filtering orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const handleStatusFilterChange = (status) => {
    setOrderStatusFilter(status);
    loadFilteredOrders(status);
  };

  const loadCareRequests = useCallback(async () => {
    setLoadingCare(true);
    try {
      const res = await fetchMyCareRequests();
      if (res?.data) {
        setCareRequests(res.data);
      }
    } catch (err) {
      console.error('[AccountPage] Error loading care requests:', err);
    } finally {
      setLoadingCare(false);
    }
  }, []);

  const handleConfirmReceipt = async (orderCode) => {
    if (!window.confirm(`Xác nhận quý khách đã nhận hàng an toàn cho đơn "${orderCode}"?\n\nThao tác này sẽ kích hoạt đầy đủ quyền lợi bảo hành chính hãng Lumina Care.`)) {
      return;
    }
    try {
      await confirmCustomerReceipt(orderCode);
      alert('Cảm ơn quý khách đã xác nhận nhận hàng! Quyền lợi bảo hành đã được kích hoạt thành công.');
      loadInitialData();
    } catch (err) {
      alert(err.message || 'Không thể xác nhận nhận hàng.');
    }
  };

  const handleOpenCreateCare = (orderCode = null) => {
    setInitialCareOrderCode(orderCode || (orders[0]?.orderCode || ''));
    setIsCreateCareOpen(true);
  };

  const handleOpenOrderDetails = async (orderCode) => {
    try {
      const res = await fetchMyOrderDetails(orderCode);
      if (res?.data) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      alert(err.message || 'Không thể tải chi tiết đơn hàng.');
    }
  };

  const handleOpenCareRequest = (order) => {
    setSelectedOrder(null);
    handleOpenCreateCare(order?.orderCode);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin mb-3" />
        <h2 className="font-brand font-bold text-lg text-[#141413]">Đang tải không gian My Lumina...</h2>
        <p className="text-xs text-[#141413]/60 mt-1 font-body">Xác thực hồ sơ và lịch sử đơn hàng cá nhân.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-600 mb-3" />
        <h2 className="font-brand font-bold text-lg text-[#141413]">Đã xảy ra lỗi</h2>
        <p className="text-xs text-[#141413]/70 my-2 font-body">{error}</p>
        <button
          type="button"
          onClick={loadInitialData}
          className="mt-3 px-4 py-2 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors rounded text-xs font-semibold"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const stats = profile?.stats || {
    totalOrders: 0,
    totalSpent: 0,
    activeOrders: 0,
    completedOrders: 0,
    customOrdersCount: 0,
  };

  const loyalty = profile?.loyalty || {
    points: 0,
    tier: 'member',
    tierLabel: 'Thành Viên Lumina',
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header & Customer Identity */}
        <div className="bg-white border border-[#D6D3CD] rounded-sm p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#141413] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] flex-shrink-0 shadow-md">
              <User className="w-7 h-7" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="font-brand font-bold text-xl text-[#141413]">
                  {profile?.name || user?.name || 'Khách Hàng Lumina'}
                </h1>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-[#D4AF37]/15 text-[#B8860B] border border-[#D4AF37]/40 rounded font-semibold">
                  {loyalty.tierLabel}
                </span>
              </div>
              <p className="text-xs text-[#141413]/60 font-body">
                {profile?.email || user?.email} {profile?.phone ? `• ${profile.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/studio-3d"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#D4AF37] text-[#141413] hover:bg-[#D4AF37]/90 transition-colors rounded text-xs font-bold shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>3D Atelier</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="px-3.5 py-2 bg-white border border-[#D6D3CD] hover:border-[#DC2626] hover:text-[#DC2626] text-[#141413]/70 transition-colors rounded text-xs font-semibold"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#D6D3CD] overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-4 font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-[#D4AF37] text-[#141413]'
                : 'border-transparent text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            Tổng quan
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-2.5 px-4 font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'border-[#D4AF37] text-[#141413]'
                : 'border-transparent text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <span>Đơn hàng của tôi</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#141413]/10 rounded-full">
              {stats.totalOrders}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('designs')}
            className={`pb-2.5 px-4 font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'designs'
                ? 'border-[#D4AF37] text-[#141413]'
                : 'border-transparent text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <span>Bộ sưu tập 3D</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#D4AF37]/20 text-[#B8860B] rounded-full">
              {designs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('care')}
            className={`pb-2.5 px-4 font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'care'
                ? 'border-[#D4AF37] text-[#141413]'
                : 'border-transparent text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Lumina Care</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('loyalty')}
            className={`pb-2.5 px-4 font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'loyalty'
                ? 'border-[#D4AF37] text-[#141413]'
                : 'border-transparent text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Lumina Membership</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`pb-2.5 px-4 font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-[#D4AF37] text-[#141413]'
                : 'border-transparent text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Đánh Giá Của Tôi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('referral')}
            className={`pb-2.5 px-4 font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'referral'
                ? 'border-[#D4AF37] text-[#141413]'
                : 'border-transparent text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Giới Thiệu Bạn Bè</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`pb-2.5 px-4 font-semibold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${
              activeTab === 'preferences'
                ? 'border-[#D4AF37] text-[#141413]'
                : 'border-transparent text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            Cài đặt & Nhận tin
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Membership Digital Card & Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Digital Membership Card (Obsidian & Gold Luxury Style) */}
              <div className="p-6 bg-gradient-to-br from-[#1C1C1A] to-[#141413] text-[#FAF8F5] rounded-sm border border-[#D4AF37]/40 shadow-xl flex flex-col justify-between relative overflow-hidden min-h-[200px]">
                {/* Background watermarked emblem */}
                <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full border border-[#D4AF37]/10 pointer-events-none" />

                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4AF37]">
                      Lumina Privileged Club
                    </span>
                    <h3 className="font-brand font-bold text-lg tracking-wider text-[#FAF8F5]">
                      {loyalty.tierLabel}
                    </h3>
                  </div>
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                </div>

                <div className="my-4 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-[#D4AF37]">
                      {loyalty.points}
                    </span>
                    <span className="text-xs text-white/70 font-mono">điểm tích lũy</span>
                    <span className="text-[9px] font-mono text-[#D4AF37]/80 bg-[#D4AF37]/10 px-1 rounded border border-[#D4AF37]/30">
                      [DRAFT]
                    </span>
                  </div>
                  <p className="text-[10px] text-white/60 font-body">
                    Tương đương ~{formatVND(loyalty.points * 1000)} giá trị quy đổi ưu đãi
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/60 font-mono border-t border-white/10 pt-3">
                  <span>Mã hội viên: {profile?.id?.slice(0, 14)}</span>
                  <span>Tổng chi: {formatVND(stats.totalSpent)}</span>
                </div>
              </div>

              {/* Stats Highlights (2 cols) */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded border border-[#D6D3CD] shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#141413]/50">Tổng đơn hàng</span>
                  <strong className="font-mono text-2xl text-[#141413] mt-2">{stats.totalOrders}</strong>
                  <span className="text-[10px] text-[#141413]/60 font-body">Ghi nhận MySQL</span>
                </div>

                <div className="p-4 bg-white rounded border border-[#D6D3CD] shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase text-amber-700">Đang xử lý</span>
                  <strong className="font-mono text-2xl text-amber-700 mt-2">{stats.activeOrders}</strong>
                  <span className="text-[10px] text-[#141413]/60 font-body">Đang chế tác/giao</span>
                </div>

                <div className="p-4 bg-white rounded border border-[#D6D3CD] shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase text-emerald-700">Hoàn thành</span>
                  <strong className="font-mono text-2xl text-emerald-700 mt-2">{stats.completedOrders}</strong>
                  <span className="text-[10px] text-[#141413]/60 font-body">Đã nhận hàng</span>
                </div>

                <div className="p-4 bg-white rounded border border-[#D6D3CD] shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#B8860B]">Kính 3D độc bản</span>
                  <strong className="font-mono text-2xl text-[#B8860B] mt-2">{stats.customOrdersCount}</strong>
                  <span className="text-[10px] text-[#141413]/60 font-body">Đã chế tác riêng</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                to="/studio-3d"
                className="p-4 bg-white hover:bg-[#FAF8F5] border border-[#D6D3CD] hover:border-[#D4AF37] rounded transition-all flex items-center justify-between group shadow-sm"
              >
                <div className="space-y-1">
                  <div className="font-brand font-bold text-sm text-[#141413] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>3D Bespoke Studio</span>
                  </div>
                  <p className="text-[11px] text-[#141413]/60 font-body">Tự tạo gọng kính khắc tên riêng độc bản</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#141413]/40 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
              </Link>

              <button
                type="button"
                onClick={() => setActiveTab('designs')}
                className="p-4 bg-white hover:bg-[#FAF8F5] border border-[#D6D3CD] hover:border-[#D4AF37] rounded transition-all flex items-center justify-between group shadow-sm text-left"
              >
                <div className="space-y-1">
                  <div className="font-brand font-bold text-sm text-[#141413] flex items-center gap-1.5">
                    <Box className="w-4 h-4 text-[#D4AF37]" />
                    <span>Xem lại kính đã mua</span>
                  </div>
                  <p className="text-[11px] text-[#141413]/60 font-body">Chiêm ngưỡng ảnh chụp 2D và cấu hình 3D</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#141413]/40 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('care')}
                className="p-4 bg-white hover:bg-[#FAF8F5] border border-[#D6D3CD] hover:border-[#D4AF37] rounded transition-all flex items-center justify-between group shadow-sm text-left"
              >
                <div className="space-y-1">
                  <div className="font-brand font-bold text-sm text-[#141413] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>Lumina Care sau mua</span>
                  </div>
                  <p className="text-[11px] text-[#141413]/60 font-body">Bảo dưỡng, vệ sinh siêu âm và cân chỉnh</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#141413]/40 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            {/* Recent Orders Preview (3 most recent) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-brand font-bold text-base text-[#141413]">Đơn hàng gần đây</h3>
                {orders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-[#D4AF37] hover:underline flex items-center gap-1"
                  >
                    <span>Xem tất cả ({stats.totalOrders})</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {orders.length === 0 ? (
                <div className="p-8 bg-white border border-[#D6D3CD] rounded text-center space-y-3">
                  <Package className="w-10 h-10 text-[#141413]/30 mx-auto" />
                  <p className="text-xs text-[#141413]/60 font-body">Bạn chưa có đơn hàng nào tại Lumina.</p>
                  <Link
                    to="/catalog"
                    className="inline-block px-4 py-2 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors rounded text-xs font-semibold"
                  >
                    Khám phá bộ sưu tập kính
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {orders.slice(0, 3).map((ord) => {
                    const statusConfig = STATUS_LABELS[ord.status] || {
                      label: ord.status,
                      color: 'bg-neutral-100 text-neutral-800 border-neutral-300',
                    };

                    return (
                      <div
                        key={ord.id}
                        className="p-4 bg-white rounded border border-[#D6D3CD] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-[#141413]">
                              {ord.orderCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                            {ord.hasBespoke && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#D4AF37]/20 text-[#B8860B] rounded">
                                ✦ 3D Bespoke
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#141413]/60 font-body">
                            {ord.totalItems} món • Đặt ngày{' '}
                            {new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="font-mono font-bold text-sm text-[#141413]">
                            {formatVND(ord.totalAmount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenOrderDetails(ord.orderCode)}
                            className="px-3 py-1.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors rounded text-xs font-semibold"
                          >
                            Chi tiết
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Buttons */}
            <div className="p-3 bg-white border border-[#D6D3CD] rounded flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#141413]/60 font-semibold mr-1">Bộ lọc trạng thái:</span>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'confirmed', label: 'Đã xác nhận' },
                { id: 'processing', label: 'Đang chế tác' },
                { id: 'completed', label: 'Hoàn thành' },
                { id: 'cancelled', label: 'Đã hủy' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => handleStatusFilterChange(filter.id)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    orderStatusFilter === filter.id
                      ? 'bg-[#141413] text-[#FAF8F5]'
                      : 'bg-[#FAF8F5] text-[#141413]/70 hover:bg-[#141413]/10'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Orders List */}
            {ordersLoading ? (
              <div className="p-12 text-center text-[#141413]/60 font-body">
                <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37] mx-auto mb-2" />
                <p className="text-xs">Đang tải danh sách đơn hàng...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 bg-white border border-[#D6D3CD] rounded text-center space-y-3">
                <Package className="w-10 h-10 text-[#141413]/30 mx-auto" />
                <h4 className="font-brand font-bold text-base text-[#141413]">
                  {orderStatusFilter === 'all'
                    ? 'Bạn chưa có đơn hàng nào'
                    : 'Không tìm thấy đơn hàng với trạng thái này'}
                </h4>
                <p className="text-xs text-[#141413]/60 font-body">
                  Khám phá các bộ sưu tập kính xu hướng 2026 hoặc tự thiết kế kính 3D độc bản.
                </p>
                <Link
                  to="/catalog"
                  className="inline-block px-4 py-2 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors rounded text-xs font-semibold"
                >
                  Xem Catalog kính
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => {
                  const statusConfig = STATUS_LABELS[ord.status] || {
                    label: ord.status,
                    color: 'bg-neutral-100 text-neutral-800 border-neutral-300',
                  };
                  const isPaid = ord.paymentStatus === 'paid';

                  return (
                    <div
                      key={ord.id}
                      className="p-5 bg-white rounded border border-[#D6D3CD] shadow-sm space-y-4 hover:border-[#D4AF37]/50 transition-colors"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D6D3CD]/60 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-[#141413]">
                            {ord.orderCode}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${statusConfig.color}`}
                          >
                            {statusConfig.label}
                          </span>
                          {ord.hasBespoke && (
                            <span className="text-[9px] font-mono px-2 py-0.5 bg-[#D4AF37] text-[#141413] font-bold rounded">
                              ✦ 3D Bespoke
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#141413]/60 font-mono">
                          Đặt lúc: {new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>

                      {/* Items Snapshot Thumbnails & Overview */}
                      <div className="flex flex-wrap items-center gap-3">
                        {ord.items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-1.5 bg-[#FAF8F5] rounded border border-[#D6D3CD]/50"
                          >
                            {item.customSpec?.snapshotPath ? (
                              <img
                                src={
                                  item.customSpec.snapshotPath.startsWith('http')
                                    ? item.customSpec.snapshotPath
                                    : `http://localhost:3000${item.customSpec.snapshotPath}`
                                }
                                alt={item.productName}
                                className="w-10 h-10 object-contain rounded bg-white"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded bg-white flex items-center justify-center text-[#141413]/30">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div className="text-[11px] leading-tight">
                              <span className="font-semibold text-[#141413] block max-w-[140px] truncate">
                                {item.productName}
                              </span>
                              <span className="text-[#141413]/60 font-mono">
                                x{item.quantity} • {formatVND(item.unitPrice)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Financial Footer & Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D6D3CD]/40 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-[#141413]/60">
                            Thanh toán:{' '}
                            <strong className="text-[#141413]">
                              {ord.paymentMethod?.toUpperCase()}
                            </strong>{' '}
                            ({isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'})
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[11px] text-[#141413]/60 block">Tổng tiền</span>
                            <span className="font-mono font-bold text-sm text-[#D4AF37]">
                              {formatVND(ord.totalAmount)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {ord.status !== 'completed' && ord.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => handleConfirmReceipt(ord.orderCode)}
                                className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors rounded text-xs font-semibold flex items-center gap-1.5"
                                title="Xác nhận bạn đã nhận kiện hàng an toàn để kích hoạt bảo hành"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Đã nhận hàng an toàn</span>
                              </button>
                            )}

                            {ord.status === 'completed' && ord.items && ord.items.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const firstItem = ord.items[0];
                                  setReviewTarget({
                                    productId: firstItem.productId,
                                    productName: firstItem.productName,
                                    orderId: ord.id,
                                    orderCode: ord.orderCode,
                                    orderItemId: firstItem.id,
                                  });
                                }}
                                className="px-3 py-2 bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors rounded text-xs font-semibold flex items-center gap-1.5"
                                title="Viết đánh giá cho sản phẩm đã nhận"
                              >
                                <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                                <span>Đánh giá</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenCreateCare(ord.orderCode)}
                              className="px-3 py-2 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/20 transition-colors rounded text-xs font-semibold"
                            >
                              Bảo hành / Lumina Care
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenOrderDetails(ord.orderCode)}
                              className="px-4 py-2 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors rounded text-xs font-semibold"
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BESPOKE ATELIER COLLECTION */}
        {activeTab === 'designs' && (
          <div className="space-y-6">
            {/* Section A: Purchased Bespoke Designs (From MySQL) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-brand font-bold text-base text-[#141413] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>Thiết kế đã chế tác ({designs.length})</span>
                  </h3>
                  <p className="text-xs text-[#141413]/60 font-body">
                    Các tác phẩm kính 3D Bespoke chính thức được bạn đặt may đo tại Lumina.
                  </p>
                </div>
              </div>

              {designs.length === 0 ? (
                <div className="p-8 bg-white border border-[#D6D3CD] rounded text-center space-y-3">
                  <Box className="w-10 h-10 text-[#141413]/30 mx-auto" />
                  <p className="text-xs text-[#141413]/60 font-body">
                    Bạn chưa có tác phẩm kính 3D Bespoke nào trong đơn hàng.
                  </p>
                  <Link
                    to="/studio-3d"
                    className="inline-block px-4 py-2 bg-[#D4AF37] text-[#141413] font-bold rounded text-xs hover:bg-[#D4AF37]/90"
                  >
                    Bắt đầu tùy biến 3D Atelier
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {designs.map((design) => {
                    const spec = design.designSpec || {};

                    return (
                      <div
                        key={design.id}
                        className="bg-white border border-[#D6D3CD] hover:border-[#D4AF37] rounded overflow-hidden shadow-sm transition-all group flex flex-col justify-between"
                      >
                        {/* Snapshot Preview */}
                        <div className="relative h-44 bg-[#FAF8F5] border-b border-[#D6D3CD]/50 flex items-center justify-center p-3">
                          {design.snapshotPath ? (
                            <img
                              src={
                                design.snapshotPath.startsWith('http')
                                  ? design.snapshotPath
                                  : `http://localhost:3000${design.snapshotPath}`
                              }
                              alt={design.productName}
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Box className="w-10 h-10 text-[#141413]/30" />
                          )}
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#141413] text-[#D4AF37] text-[9px] font-mono rounded">
                            ✦ {spec.baseModel?.toUpperCase() || 'BESPOKE'}
                          </span>
                        </div>

                        {/* Specs Summary */}
                        <div className="p-4 space-y-2 flex-grow">
                          <h4 className="font-brand font-bold text-sm text-[#141413] truncate">
                            {design.productName}
                          </h4>

                          <div className="space-y-1 text-xs text-[#141413]/70 font-body">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-[#141413]/50">Màu:</span>
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/20"
                                style={{ backgroundColor: spec.frameColor }}
                              />
                              <span className="font-mono text-[11px]">{spec.frameColor}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-[#141413]/50">Càng kính: </span>
                              <strong className="text-[11px]">
                                {TEMPLE_STYLE_LABELS[spec.templeStyle] || spec.templeStyle}
                              </strong>
                            </div>

                            {spec.engravingText && (
                              <div>
                                <span className="text-[10px] text-[#141413]/50">Khắc tên: </span>
                                <strong className="font-mono text-[11px] text-[#D4AF37]">
                                  &quot;{spec.engravingText}&quot;
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="p-3 bg-[#FAF8F5] border-t border-[#D6D3CD]/50 flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedDesign(design)}
                            className="text-[#141413] hover:text-[#D4AF37] font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem chi tiết</span>
                          </button>

                          <Link
                            to={`/studio-3d?model=${encodeURIComponent(spec.baseModel || 'aviator')}`}
                            className="text-[#D4AF37] hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>Tùy biến lại</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section B: In-progress Studio Draft (Local Storage) */}
            {draftDesign && (
              <div className="p-5 bg-white border border-[#D4AF37]/50 rounded shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="font-brand font-bold text-sm text-[#141413]">
                      Bản nháp đang tùy biến trong Studio (Draft)
                    </h4>
                    <span className="text-[10px] font-mono px-2 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded">
                      Chưa đặt hàng
                    </span>
                  </div>
                  <Link
                    to="/studio-3d"
                    className="text-xs font-semibold text-[#D4AF37] hover:underline flex items-center gap-1"
                  >
                    <span>Tiếp tục chỉnh sửa</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded border border-[#D6D3CD] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-[#141413] capitalize">
                      Dáng gọng: {draftDesign.baseModel} ({draftDesign.frameType || 'acetate'})
                    </p>
                    <p className="text-[#141413]/60 font-body">
                      Màu gọng: <span className="font-mono">{draftDesign.frameColor}</span> • Càng kính:{' '}
                      {TEMPLE_STYLE_LABELS[draftDesign.templeStyle] || draftDesign.templeStyle}
                    </p>
                  </div>
                  <Link
                    to="/studio-3d"
                    className="px-4 py-2 bg-[#D4AF37] text-[#141413] font-bold rounded text-xs hover:bg-[#D4AF37]/90 transition-colors"
                  >
                    Mở 3D Atelier
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LUMINA CARE AFTER-SALES */}
        {activeTab === 'care' && (
          <div className="space-y-6">
            <div className="p-6 bg-white border border-[#D6D3CD] rounded shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4AF37]">
                    Lumina Eyewear Care Protocol • Đã Duyệt Chính Thức
                  </span>
                  <h3 className="font-brand font-bold text-xl text-[#141413]">
                    Trung Tâm Chăm Sóc & Bảo Hành Lumina Care
                  </h3>
                  <p className="text-xs text-[#141413]/70 font-body mt-1">
                    Bảo hành 12 tháng khung gọng, 06 tháng lớp phủ tròng kính và bảo dưỡng 24 tháng kể từ ngày giao hàng xác minh.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCreateCare()}
                  className="px-4 py-2 bg-[#D4AF37] text-[#141413] hover:brightness-110 font-bold rounded text-xs transition shadow-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#141413]" />
                  <span>+ Gửi yêu cầu hỗ trợ mới</span>
                </button>
              </div>

              {/* Service Pillars (Approved Business Parameters) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 bg-[#FAF8F5] rounded border border-[#D6D3CD]/60 space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-[#141413] text-[#D4AF37] flex items-center justify-center font-bold text-xs mb-2">
                    12T
                  </div>
                  <h4 className="font-brand font-bold text-sm text-[#141413]">Bảo hành gọng kính</h4>
                  <p className="text-[11px] text-[#141413]/60 font-body">
                    Khắc phục lỗi kỹ thuật vật liệu, bung mối hàn titanium và gãy bản lề do chế tác.
                  </p>
                  <span className="inline-block text-[10px] font-mono text-[#D4AF37] bg-[#141413] px-2 py-0.5 rounded font-semibold mt-1">
                    12 tháng chính hãng
                  </span>
                </div>

                <div className="p-4 bg-[#FAF8F5] rounded border border-[#D6D3CD]/60 space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-[#141413] text-[#D4AF37] flex items-center justify-center font-bold text-xs mb-2">
                    06T
                  </div>
                  <h4 className="font-brand font-bold text-sm text-[#141413]">Lớp phủ tròng kính</h4>
                  <p className="text-[11px] text-[#141413]/60 font-body">
                    Bảo hành lớp tráng AR chống chói, chống trầy và lọc tia xanh quang học.
                  </p>
                  <span className="inline-block text-[10px] font-mono text-[#D4AF37] bg-[#141413] px-2 py-0.5 rounded font-semibold mt-1">
                    06 tháng chính hãng
                  </span>
                </div>

                <div className="p-4 bg-[#FAF8F5] rounded border border-[#D6D3CD]/60 space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-[#141413] text-[#D4AF37] flex items-center justify-center font-bold text-xs mb-2">
                    24T
                  </div>
                  <h4 className="font-brand font-bold text-sm text-[#141413]">Vệ sinh & Ve mũi</h4>
                  <p className="text-[11px] text-[#141413]/60 font-body">
                    Vệ sinh sóng siêu âm, siết ốc titanium và nắn chỉnh đệm mũi miễn phí.
                  </p>
                  <span className="inline-block text-[10px] font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded font-semibold mt-1">
                    24 tháng bảo dưỡng
                  </span>
                </div>

                <div className="p-4 bg-[#FAF8F5] rounded border border-[#D6D3CD]/60 space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-[#141413] text-[#D4AF37] flex items-center justify-center font-bold text-xs mb-2">
                    07N
                  </div>
                  <h4 className="font-brand font-bold text-sm text-[#141413]">Đổi trả Catalog</h4>
                  <p className="text-[11px] text-[#141413]/60 font-body">
                    Áp dụng cho kính Catalog nguyên hộp, chưa cắt tròng theo toa số độ riêng.
                  </p>
                  <span className="inline-block text-[10px] font-mono text-blue-800 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded font-semibold mt-1">
                    Đổi trả trong 07 ngày
                  </span>
                </div>
              </div>

              {/* Tickets Section */}
              <div className="pt-4 border-t border-[#D6D3CD] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-brand font-bold text-sm text-[#141413] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                    <span>Phiếu yêu cầu Lumina Care của bạn ({careRequests.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={loadCareRequests}
                    className="text-xs text-[#141413]/60 hover:text-[#141413] flex items-center gap-1 font-body"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Làm mới</span>
                  </button>
                </div>

                {loadingCare ? (
                  <div className="py-8 text-center text-xs text-[#141413]/60">
                    Đang tải danh sách phiếu hỗ trợ...
                  </div>
                ) : careRequests.length === 0 ? (
                  <div className="p-8 text-center bg-[#FAF8F5] rounded border border-[#D6D3CD]/60 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#141413]/5 flex items-center justify-center mx-auto text-[#D4AF37]">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-sm text-[#141413]">
                      Chưa có phiếu yêu cầu nào
                    </p>
                    <p className="text-xs text-[#141413]/60 max-w-md mx-auto">
                      Khi cần cân chỉnh ve mũi, vệ sinh kính hoặc bảo hành kỹ thuật, bạn có thể tạo phiếu yêu cầu ngay bên dưới.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateCare()}
                      className="px-4 py-2 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] font-bold rounded text-xs transition"
                    >
                      Gửi yêu cầu đầu tiên
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {careRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 bg-[#FAF8F5] border border-[#D6D3CD] rounded flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-[#D4AF37]/60 transition"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-[#141413]">
                              {req.ticketCode}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
                              {req.status}
                            </span>
                            <span className="text-xs text-[#141413]/50">•</span>
                            <span className="text-xs text-[#141413]/70 font-mono">
                              Đơn: {req.orderCode}
                            </span>
                          </div>

                          <h5 className="font-bold text-sm text-[#141413]">{req.title}</h5>

                          <p className="text-xs text-[#141413]/70 line-clamp-1">
                            {req.description}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-[#141413]/50">
                            <span>Ngày tạo: {new Date(req.createdAt).toLocaleDateString('vi-VN')}</span>
                            {req.productName && <span>Sản phẩm: {req.productName}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedCareTicketCode(req.ticketCode)}
                          className="px-4 py-2 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition rounded text-xs font-semibold whitespace-nowrap"
                        >
                          Xem tiến độ & Trao đổi
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: LUMINA MEMBERSHIP & LOYALTY (Prompt 04) */}
        {activeTab === 'loyalty' && <LoyaltyTab />}

        {/* TAB 5: PREFERENCES & CONSENT (Prompt 06) */}
        {activeTab === 'preferences' && <PreferencesTab />}

        {/* TAB: MY REVIEWS (Prompt 05) */}
        {activeTab === 'reviews' && <MyReviewsTab />}

        {/* TAB: REFERRAL PROGRAM (Prompt 05) */}
        {activeTab === 'referral' && <ReferralCard />}
      </div>

      {/* Write Review Modal */}
      {reviewTarget && (
        <ReviewForm
          isOpen={Boolean(reviewTarget)}
          onClose={() => setReviewTarget(null)}
          productId={reviewTarget.productId}
          productName={reviewTarget.productName}
          orderId={reviewTarget.orderId}
          orderCode={reviewTarget.orderCode}
          orderItemId={reviewTarget.orderItemId}
          onSuccess={() => {
            loadInitialData();
          }}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onOpenCareRequest={handleOpenCareRequest}
        />
      )}

      {/* Bespoke Detail Modal */}
      {selectedDesign && (
        <BespokeModal
          design={selectedDesign}
          onClose={() => setSelectedDesign(null)}
        />
      )}

      {/* Create Care Request Modal */}
      <CreateCareRequestModal
        isOpen={isCreateCareOpen}
        onClose={() => setIsCreateCareOpen(false)}
        orders={orders}
        initialOrderCode={initialCareOrderCode}
        onSuccess={(ticket) => {
          loadCareRequests();
          setSelectedCareTicketCode(ticket.ticketCode);
        }}
      />

      {/* Care Ticket Detail Modal */}
      {selectedCareTicketCode && (
        <CareTicketDetailModal
          isOpen={Boolean(selectedCareTicketCode)}
          onClose={() => setSelectedCareTicketCode(null)}
          ticketCode={selectedCareTicketCode}
          onUpdated={loadCareRequests}
        />
      )}
    </div>
  );
}

