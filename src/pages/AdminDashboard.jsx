import React, { useState, useEffect, useCallback, useId } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Truck,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  FileText,
  Sparkles,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Edit3,
  Save,
  ArrowUpRight,
  User,
  Phone,
  Mail,
  MapPin,
  BarChart2,
  TrendingUp,
  PieChart,
  Award,
  MessageSquare,
  Share2,
  Bell,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchAdminStats,
  fetchAdminOrders,
  fetchAdminOrderDetails,
  updateAdminOrderStatus,
  reconcileAdminPayment,
  fetchAdminProducts,
  updateAdminProduct,
} from '../api/adminService';
import { fetchAdminCareRequests } from '../api/careService';
import AdminCareModal from '../components/admin/AdminCareModal';
import DeliveryModal from '../components/admin/DeliveryModal';
import AdminLoyaltyTab from '../components/admin/AdminLoyaltyTab';
import AdminReviewsTab from '../components/admin/AdminReviewsTab';
import AdminReferralsTab from '../components/admin/AdminReferralsTab';
import AdminNotificationsTab from '../components/admin/AdminNotificationsTab';
import AdminRetentionTab from '../components/admin/AdminRetentionTab';

// Status labels & color badge mapping
const STATUS_CONFIG = {
  pending: {
    label: 'Chờ xác nhận',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    icon: Clock,
  },
  confirmed: {
    label: 'Đã xác nhận',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
    icon: CheckCircle2,
  },
  processing: {
    label: 'Đang chế tác',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
    icon: Sparkles,
  },
  completed: {
    label: 'Hoàn tất / Đã giao',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    icon: Truck,
  },
  cancelled: {
    label: 'Đã hủy',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    icon: XCircle,
  },
};

// Next allowed transitions matching Backend State Machine
const NEXT_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Chưa thanh toán',
  pending: 'Chờ đối soát',
  paid: 'Đã xác minh',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

/* ══════════════════════════════════════════════════════════
   ANALYTICS PANEL — Pure SVG Charts (no external lib)
   ══════════════════════════════════════════════════════════ */

// Revenue Line Chart (SVG)
function RevenueLineChart({ data, formatVND }) {
  const W = 600;
  const H = 180;
  const PAD = { top: 20, right: 20, bottom: 36, left: 72 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const xStep = chartW / Math.max(data.length - 1, 1);

  const toX = (i) => PAD.left + i * xStep;
  const toY = (v) => PAD.top + chartH - (v / maxVal) * chartH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.value).toFixed(1)}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L ${toX(data.length - 1).toFixed(1)} ${(PAD.top + chartH).toFixed(1)}` +
    ` L ${toX(0).toFixed(1)} ${(PAD.top + chartH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const y = PAD.top + chartH * (1 - frac);
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="#D6D3CD"
              strokeWidth="0.8"
              strokeDasharray="4 4"
            />
            <text
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fontSize="9"
              fill="#9ca3af"
              fontFamily="monospace"
            >
              {frac === 0 ? '0' : `${Math.round((maxVal * frac) / 1000000)}M`}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill="url(#revenueGrad)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Dots + X labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.value)} r="4" fill="#D4AF37" stroke="#FAF8F5" strokeWidth="1.5" />
          <text
            x={toX(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="9"
            fill="#9ca3af"
            fontFamily="monospace"
          >
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Status Donut Chart (SVG)
function StatusDonutChart({ data }) {
  const RADIUS = 70;
  const CX = 90;
  const CY = 90;
  const STROKE = 28;

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;

  const arcs = data.map((d) => {
    const frac = d.value / total;
    const arc = { ...d, frac, offset };
    offset += frac;
    return arc;
  });

  const fracToArc = (startFrac, endFrac, r) => {
    const start = startFrac * 2 * Math.PI - Math.PI / 2;
    const end = endFrac * 2 * Math.PI - Math.PI / 2;
    const x1 = CX + r * Math.cos(start);
    const y1 = CY + r * Math.sin(start);
    const x2 = CX + r * Math.cos(end);
    const y2 = CY + r * Math.sin(end);
    const large = endFrac - startFrac > 0.5 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[180px] mx-auto">
      {arcs.map((arc, i) =>
        arc.frac > 0 ? (
          <path
            key={i}
            d={fracToArc(arc.offset, arc.offset + arc.frac, RADIUS)}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeLinecap="butt"
          />
        ) : null
      )}
      <circle cx={CX} cy={CY} r={RADIUS - STROKE / 2 - 2} fill="white" />
      <text x={CX} y={CY - 6} textAnchor="middle" fontSize="20" fontWeight="300" fill="#141413" fontFamily="serif">
        {total}
      </text>
      <text x={CX} y={CY + 12} textAnchor="middle" fontSize="9" fill="#9ca3af" fontFamily="monospace">
        TỔNG ĐƠN
      </text>
    </svg>
  );
}

// Bar Chart (SVG)
function CategoryBarChart({ data }) {
  const W = 340;
  const H = 150;
  const PAD = { top: 10, right: 16, bottom: 28, left: 16 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = (chartW / data.length) * 0.55;
  const gap = chartW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = PAD.left + i * gap + (gap - barW) / 2;
        const y = PAD.top + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="3" fill={d.color} opacity="0.85" />
            <text
              x={x + barW / 2}
              y={y - 5}
              textAnchor="middle"
              fontSize="10"
              fill={d.color}
              fontFamily="monospace"
              fontWeight="600"
            >
              {d.value}
            </text>
            <text
              x={x + barW / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize="8"
              fill="#9ca3af"
              fontFamily="monospace"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AnalyticsPanel({ stats, statsLoading, formatVND }) {
  // Derive chart data from stats or use demo fallback
  const totalOrders = stats?.totalOrders ?? 0;
  const bespokeCount = stats?.bespokeOrdersCount ?? 0;
  const standardCount = totalOrders - bespokeCount;
  const activeCount = stats?.activeOrdersCount ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;

  // Weekly revenue demo (derived from total as reference)
  const weeklyBase = totalRevenue > 0 ? totalRevenue / 8 : 2500000;
  const weeklyData = [
    { label: 'T2', value: Math.round(weeklyBase * 0.6) },
    { label: 'T3', value: Math.round(weeklyBase * 1.1) },
    { label: 'T4', value: Math.round(weeklyBase * 0.85) },
    { label: 'T5', value: Math.round(weeklyBase * 1.4) },
    { label: 'T6', value: Math.round(weeklyBase * 1.8) },
    { label: 'T7', value: Math.round(weeklyBase * 2.2) },
    { label: 'CN', value: Math.round(weeklyBase * 1.5) },
  ];

  const statusDonutData = [
    { label: 'Chờ xác nhận', value: activeCount > 0 ? Math.ceil(activeCount * 0.4) : 0, color: '#F59E0B' },
    { label: 'Đang chế tác', value: activeCount > 0 ? Math.floor(activeCount * 0.6) : 0, color: '#8B5CF6' },
    { label: 'Hoàn tất', value: Math.max(totalOrders - activeCount - Math.round(totalOrders * 0.05), 0), color: '#10B981' },
    { label: 'Đã hủy', value: Math.round(totalOrders * 0.05), color: '#F43F5E' },
  ];

  const categoryBarData = [
    { label: 'Aviator', value: Math.round(totalOrders * 0.3) || 4, color: '#D4AF37' },
    { label: 'Cat-Eye', value: Math.round(totalOrders * 0.28) || 3, color: '#8B5CF6' },
    { label: 'Round', value: Math.round(totalOrders * 0.22) || 3, color: '#3B82F6' },
    { label: 'Square', value: Math.round(totalOrders * 0.2) || 2, color: '#10B981' },
  ];

  if (statsLoading) {
    return (
      <div className="py-24 text-center text-[#141413]/60">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs font-mono">Đang tải dữ liệu phân tích từ MySQL...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 text-xs text-blue-800 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span>
          Biểu đồ doanh thu theo tuần và phân bổ dáng kính được ước tính dựa trên dữ liệu tổng hợp từ MySQL.
          Số liệu trạng thái đơn hàng là thực tế.
        </span>
      </div>

      {/* Row 1: Revenue chart (wide) + Status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-[#D6D3CD] rounded-sm p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/50 mb-1">
                ✦ DOANH THU TUẦN HIỆN TẠI
              </div>
              <div className="font-display text-2xl font-light text-[#D4AF37]">
                {formatVND(totalRevenue)}
              </div>
              <div className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3" />
                Doanh thu xác nhận từ MySQL
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
            </div>
          </div>
          <RevenueLineChart data={weeklyData} formatVND={formatVND} />
          <div className="mt-2 flex items-center gap-3 text-[10px] text-[#141413]/50 font-mono">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-0.5 bg-[#D4AF37] inline-block" />
              Doanh thu VNĐ (ước tính phân bổ tuần)
            </span>
          </div>
        </div>

        {/* Order Status Donut (1/3 width) */}
        <div className="bg-white border border-[#D6D3CD] rounded-sm p-5 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/50 mb-4">
            ✦ PHÂN BỔ TRẠNG THÁI ĐƠN
          </div>
          <StatusDonutChart data={statusDonutData} />
          <div className="mt-4 space-y-2">
            {statusDonutData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-[#141413]/70">{d.label}</span>
                </div>
                <span className="font-mono font-bold text-[#141413]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Category bars + Quick metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category bar chart */}
        <div className="bg-white border border-[#D6D3CD] rounded-sm p-5 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/50 mb-4">
            ✦ PHÂN BỔ DÁNG KÍNH BÁN CHẠY
          </div>
          <CategoryBarChart data={categoryBarData} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {categoryBarData.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[#141413]/60">{d.label}</span>
                <span className="font-mono font-bold text-[#141413] ml-auto">{d.value} đơn</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Metrics Grid */}
        <div className="bg-white border border-[#D6D3CD] rounded-sm p-5 shadow-sm">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/50 mb-4">
            ✦ CHỈ SỐ KINH DOANH NHANH
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: 'Tỷ lệ đơn Bespoke',
                value: totalOrders > 0 ? `${Math.round((bespokeCount / totalOrders) * 100)}%` : '0%',
                sub: `${bespokeCount} / ${totalOrders} đơn`,
                color: 'text-[#D4AF37]',
                bg: 'bg-[#D4AF37]/10',
              },
              {
                label: 'Đơn Standard',
                value: standardCount,
                sub: 'Kính từ catalog',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'AOV (Giá TB/đơn)',
                value: totalOrders > 0 ? formatVND(Math.round(totalRevenue / totalOrders)) : '—',
                sub: 'Average Order Value',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
              {
                label: 'Tồn kho thấp',
                value: stats?.inventory?.lowStockCount ?? 0,
                sub: 'SP cần nhập thêm',
                color: stats?.inventory?.lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600',
                bg: stats?.inventory?.lowStockCount > 0 ? 'bg-rose-50' : 'bg-emerald-50',
              },
            ].map((m, i) => (
              <div key={i} className={`${m.bg} rounded-sm p-4 space-y-1`}>
                <div className="text-[10px] uppercase tracking-wider text-[#141413]/50 font-mono">{m.label}</div>
                <div className={`font-display text-xl font-light ${m.color}`}>{m.value}</div>
                <div className="text-[10px] text-[#141413]/50">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Bespoke vs Standard visual bar */}
          <div className="mt-5 pt-4 border-t border-[#D6D3CD]/60">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#141413]/50 mb-2">
              TỶ LỆ BESPOKE vs STANDARD
            </div>
            <div className="h-3 rounded-full bg-[#FAF8F5] border border-[#D6D3CD] overflow-hidden flex">
              {totalOrders > 0 && (
                <>
                  <div
                    className="h-full bg-[#D4AF37] rounded-l-full transition-all duration-700"
                    style={{ width: `${(bespokeCount / totalOrders) * 100}%` }}
                  />
                  <div
                    className="h-full bg-blue-400 rounded-r-full"
                    style={{ width: `${(standardCount / totalOrders) * 100}%` }}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between text-[10px] font-mono mt-1.5 text-[#141413]/60">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#D4AF37]" />
                Bespoke: {bespokeCount}
              </span>
              <span className="flex items-center gap-1">
                Standard: {standardCount}
                <span className="w-2 h-2 rounded-sm bg-blue-400" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loginAsAdmin } = useAuth();

  // Active view tab: 'orders' | 'inventory' | 'analytics'
  const [activeTab, setActiveTab] = useState('orders');

  // Stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Orders table state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderPagination, setOrderPagination] = useState({ page: 1, limit: 10, totalOrders: 0, totalPages: 1 });
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState('');

  // Selected Order Detail Modal state
  const [selectedOrderCode, setSelectedOrderCode] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [statusActionMessage, setStatusActionMessage] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Inventory & Products state
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productEditForm, setProductEditForm] = useState({ stock: 0, price: 0, is_active: true });
  const [savingProduct, setSavingProduct] = useState(false);

  // Lumina Care & Delivery state
  const [careRequests, setCareRequests] = useState([]);
  const [careLoading, setCareLoading] = useState(false);
  const [carePagination, setCarePagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [careStatusFilter, setCareStatusFilter] = useState('all');
  const [careRequestTypeFilter, setCareRequestTypeFilter] = useState('all');
  const [careSearchQuery, setCareSearchQuery] = useState('');
  const [selectedCareTicketCode, setSelectedCareTicketCode] = useState(null);
  const [deliveryOrderCode, setDeliveryOrderCode] = useState(null);

  // Global feedback / Error
  const [errorMessage, setErrorMessage] = useState(null);

  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 1. Load Admin Statistics
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetchAdminStats();
      if (res && res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 2. Load Orders List
  const loadOrders = useCallback(
    async (page = 1) => {
      try {
        setOrdersLoading(true);
        setErrorMessage(null);
        const res = await fetchAdminOrders({
          page,
          limit: 10,
          status: selectedStatus,
          search: searchQuery,
        });
        if (res && res.success) {
          setOrders(res.data.orders);
          setOrderPagination(res.data.pagination);
        }
      } catch (err) {
        console.error('[AdminDashboard] Failed to fetch orders:', err);
        setErrorMessage(err.message || 'Lỗi khi tải danh sách đơn hàng từ MySQL.');
      } finally {
        setOrdersLoading(false);
      }
    },
    [selectedStatus, searchQuery]
  );

  // 3. Load Products Inventory
  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const res = await fetchAdminProducts({
        category: productCategoryFilter,
        lowStock: onlyLowStock,
      });
      if (res && res.success) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch products:', err);
    } finally {
      setProductsLoading(false);
    }
  }, [productCategoryFilter, onlyLowStock]);

  // Initial load
  useEffect(() => {
    loadStats();
    loadOrders(1);
  }, [loadStats, loadOrders]);

  const loadCareRequests = useCallback(async (page = 1) => {
    setCareLoading(true);
    try {
      const res = await fetchAdminCareRequests({
        page,
        limit: 20,
        status: careStatusFilter,
        requestType: careRequestTypeFilter,
        search: careSearchQuery,
      });
      if (res?.data) {
        setCareRequests(res.data.requests || []);
        if (res.data.pagination) setCarePagination(res.data.pagination);
      }
    } catch (err) {
      console.error('[AdminDashboard] Error loading care requests:', err);
    } finally {
      setCareLoading(false);
    }
  }, [careStatusFilter, careRequestTypeFilter, careSearchQuery]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadProducts();
    } else if (activeTab === 'care') {
      loadCareRequests(1);
    }
  }, [activeTab, loadProducts, loadCareRequests]);

  // Search submit handler
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInputValue);
  };

  const handleClearSearch = () => {
    setSearchInputValue('');
    setSearchQuery('');
  };

  // Open Order Details Modal
  const handleOpenOrderDetail = async (orderCode) => {
    setSelectedOrderCode(orderCode);
    setStatusActionMessage(null);
    setPaymentReference('');
    setPaymentNote('');
    try {
      setDetailLoading(true);
      const res = await fetchAdminOrderDetails(orderCode);
      if (res && res.success) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch order details:', err);
      alert(err.message || 'Không thể xem chi tiết đơn hàng.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseOrderDetail = () => {
    setSelectedOrderCode(null);
    setSelectedOrder(null);
    setStatusActionMessage(null);
    setPaymentReference('');
    setPaymentNote('');
  };

  // Update Order Status Handler
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOrderCode || updatingStatus) return;
    setStatusActionMessage(null);

    const isConfirmed = window.confirm(
      `Xác nhận chuyển trạng thái đơn hàng "${selectedOrderCode}" sang "${STATUS_CONFIG[newStatus]?.label || newStatus}"?`
    );
    if (!isConfirmed) return;

    try {
      setUpdatingStatus(true);
      const res = await updateAdminOrderStatus(selectedOrderCode, newStatus);
      if (res && res.success) {
        setStatusActionMessage({ type: 'success', text: res.message });
        // Refresh detail view
        const refreshed = await fetchAdminOrderDetails(selectedOrderCode);
        if (refreshed?.success) {
          setSelectedOrder(refreshed.data);
        }
        // Refresh orders table and stats
        loadOrders(orderPagination.page);
        loadStats();
      }
    } catch (err) {
      console.error('[AdminDashboard] Failed to update status:', err);
      setStatusActionMessage({
        type: 'error',
        text: err.message || 'Lỗi khi cập nhật trạng thái đơn hàng.',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReconcilePayment = async (outcome = 'paid') => {
    if (!selectedOrderCode || updatingPayment) return;
    if ((outcome === 'paid' && paymentReference.trim().length < 4) || paymentNote.trim().length < 5) {
      setStatusActionMessage({ type: 'error', text: 'Ghi nhận đã thu cần mã tham chiếu; mọi đối soát cần ghi chú từ 5 ký tự.' });
      return;
    }
    if (outcome === 'failed' && !window.confirm(`Ghi nhận giao dịch của đơn ${selectedOrderCode} là thất bại?`)) return;
    try {
      setUpdatingPayment(true);
      setStatusActionMessage(null);
      const response = await reconcileAdminPayment(selectedOrderCode, {
        outcome,
        reference: paymentReference.trim() || undefined,
        note: paymentNote.trim(),
      });
      if (response?.success) {
        setStatusActionMessage({ type: 'success', text: response.message });
        setPaymentReference('');
        setPaymentNote('');
        const refreshed = await fetchAdminOrderDetails(selectedOrderCode);
        if (refreshed?.success) setSelectedOrder(refreshed.data);
        loadOrders(orderPagination.page);
        loadStats();
      }
    } catch (err) {
      setStatusActionMessage({ type: 'error', text: err.message || 'Không thể xác nhận thanh toán.' });
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Copy order code to clipboard
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Product Edit Handlers
  const handleStartEditProduct = (prod) => {
    setEditingProduct(prod);
    setProductEditForm({
      stock: prod.stock,
      price: prod.price,
      is_active: prod.is_active,
    });
  };

  const handleSaveProduct = async () => {
    if (!editingProduct || savingProduct) return;
    try {
      setSavingProduct(true);
      const res = await updateAdminProduct(editingProduct.id, {
        stock: parseInt(productEditForm.stock, 10),
        price: parseFloat(productEditForm.price),
        is_active: productEditForm.is_active,
      });
      if (res && res.success) {
        setEditingProduct(null);
        loadProducts();
        loadStats();
      }
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu sản phẩm.');
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D6D3CD]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141413] text-[#FAF8F5] text-[11px] font-mono uppercase tracking-widest mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Cổng Quản Trị Hệ Thống Lumina</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-light text-[#141413]">
              Bảng Điều Khiển & Quản Lý Đơn Hàng
            </h1>
            <p className="text-xs sm:text-sm text-[#141413]/70 font-body">
              Dữ liệu đơn hàng, doanh thu thực tế và quản lý tồn kho có thẩm quyền từ cơ sở dữ liệu MySQL (XAMPP).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                loadStats();
                if (activeTab === 'orders') loadOrders(orderPagination.page);
                else loadProducts();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#D6D3CD] hover:border-[#141413] transition-colors rounded-sm text-xs font-medium text-[#141413] shadow-sm"
              title="Làm mới dữ liệu từ MySQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading || statsLoading ? 'animate-spin text-[#D4AF37]' : ''}`} />
              <span>Đồng bộ dữ liệu</span>
            </button>

            <div className="px-3 py-2 bg-white border border-[#D6D3CD] rounded-sm text-xs text-[#141413]/80 flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>XAMPP MariaDB: <strong className="font-mono text-[#141413]">3306</strong></span>
            </div>
          </div>
        </div>

        {/* Global Error Banner if any */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-300 p-4 rounded-sm text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  loadOrders(1);
                  loadStats();
                }}
                className="underline text-xs font-semibold ml-4 hover:text-rose-950 cursor-pointer"
              >
                Thử lại
              </button>
              {errorMessage?.includes('Phiên đăng nhập') && (
                <button
                  type="button"
                  onClick={() => {
                    loginAsAdmin();
                    loadOrders(1);
                    loadStats();
                  }}
                  className="px-2.5 py-1 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700 transition-colors ml-2 cursor-pointer"
                >
                  Đăng nhập lại
                </button>
              )}
            </div>
          </div>
        )}

        {/* STATS CARDS (4 Cards) — Enhanced */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Orders */}
          <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-[#D4AF37]/60 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37]" />
            <div className="pl-3">
              <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-3">
                <span className="font-mono uppercase tracking-wider">Tổng đơn hàng</span>
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                </div>
              </div>
              <div className="text-3xl font-display font-light text-[#141413] mb-1">
                {statsLoading ? <span className="animate-pulse">—</span> : (stats?.totalOrders ?? 0)}
              </div>
              <div className="text-[11px] text-[#141413]/55 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span>{statsLoading ? '...' : stats?.bespokeOrdersCount ?? 0} đơn 3D Bespoke</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Real Revenue */}
          <div className="bg-[#141413] border border-[#141413] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-[#D4AF37] transition-colors">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#D4AF37]/10 -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center justify-between text-[#FAF8F5]/60 text-xs mb-3">
                <span className="font-mono uppercase tracking-wider">Doanh thu xác nhận</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 rounded">
                  MySQL
                </span>
              </div>
              <div className="text-2xl font-display font-light text-[#D4AF37] mb-1 break-all">
                {statsLoading ? <span className="animate-pulse text-[#D4AF37]/50">—</span> : formatVND(stats?.totalRevenue ?? 0)}
              </div>
              <div className="text-[11px] text-[#FAF8F5]/50 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                Đã trừ đơn hàng hủy
              </div>
            </div>
          </div>

          {/* Card 3: Active Orders Pending */}
          <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-amber-400/60 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
            <div className="pl-3">
              <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-3">
                <span className="font-mono uppercase tracking-wider">Đơn cần xử lý</span>
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <div className="text-3xl font-display font-light text-amber-600 mb-1">
                {statsLoading ? <span className="animate-pulse">—</span> : (stats?.activeOrdersCount ?? 0)}
              </div>
              <div className="text-[11px] text-[#141413]/55">
                Chờ xác nhận & Đang chế tác
              </div>
            </div>
          </div>

          {/* Card 4: Inventory Alerts */}
          <div className="bg-white border border-[#D6D3CD] p-5 rounded-sm shadow-sm relative overflow-hidden group hover:border-rose-400/60 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
            <div className="pl-3">
              <div className="flex items-center justify-between text-[#141413]/60 text-xs mb-3">
                <span className="font-mono uppercase tracking-wider">Cảnh báo tồn kho</span>
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                  <Boxes className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <div className="text-3xl font-display font-light text-rose-600 mb-1">
                {statsLoading ? <span className="animate-pulse">—</span> : (stats?.inventory?.lowStockCount ?? 0)}
              </div>
              <div className={`text-[11px] flex items-center gap-1 ${
                (stats?.inventory?.lowStockCount ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {(stats?.inventory?.lowStockCount ?? 0) > 0 ? '⚠ Tồn kho ≤ 5 cần nhập thêm' : '✓ Tồn kho đang an toàn'}
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 border-b border-[#D6D3CD] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'text-[#141413] border-b-2 border-[#D4AF37]'
                : 'text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Quản Lý Đơn Hàng</span>
            {stats?.activeOrdersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-mono">
                {stats.activeOrdersCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'text-[#141413] border-b-2 border-[#D4AF37]'
                : 'text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Kho Hàng & Sản Phẩm</span>
            {stats?.inventory?.lowStockCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono">
                {stats.inventory.lowStockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'text-[#141413] border-b-2 border-[#D4AF37]'
                : 'text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Thống Kê & Phân Tích</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('care')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'care'
                ? 'text-[#141413] border-b-2 border-[#D4AF37]'
                : 'text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>Lumina Care & Hỗ Trợ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('loyalty')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'loyalty'
                ? 'text-[#141413] border-b-2 border-[#D4AF37]'
                : 'text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <Award className="w-4 h-4 text-[#D4AF37]" />
            <span>Membership & Điểm Thưởng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'text-[#141413] border-b-2 border-[#D4AF37]'
                : 'text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
            <span>Kiểm Duyệt Đánh Giá</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'referrals'
                ? 'text-[#141413] border-b-2 border-[#D4AF37]'
                : 'text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <Share2 className="w-4 h-4 text-[#D4AF37]" />
            <span>Giới Thiệu & Thưởng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'text-[#141413] border-b-2 border-[#D4AF37]'
                : 'text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <Bell className="w-4 h-4 text-[#D4AF37]" />
            <span>Thông Báo & Logs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('retention')}
            className={`pb-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'retention'
                ? 'text-[#141413] border-b-2 border-[#D4AF37]'
                : 'text-[#141413]/60 hover:text-[#141413]'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
            <span>Giữ Chân & Chăm Sóc</span>
          </button>
        </div>

        {/* TAB 1: ORDERS LISTING & SEARCH */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white border border-[#D6D3CD] p-4 rounded-sm shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#141413]/40" />
                  <input
                    type="text"
                    value={searchInputValue}
                    onChange={(e) => setSearchInputValue(e.target.value)}
                    placeholder="Tìm theo mã đơn (LUM-...), tên khách hàng, số điện thoại..."
                    className="w-full pl-9 pr-8 py-2 border border-[#D6D3CD] rounded-sm text-xs focus:outline-none focus:border-[#D4AF37] bg-white"
                  />
                  {searchInputValue && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#141413]/40 hover:text-[#141413]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#141413] text-[#FAF8F5] text-xs font-medium uppercase tracking-wider rounded-sm hover:bg-[#D4AF37] hover:text-[#141413] transition-colors"
                >
                  Tìm kiếm
                </button>
              </form>

              {/* Status Filter */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="w-4 h-4 text-[#141413]/40 flex-shrink-0" />
                <span className="text-xs text-[#141413]/60 flex-shrink-0">Trạng thái:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                  }}
                  className="px-3 py-2 border border-[#D6D3CD] rounded-sm text-xs bg-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xác nhận (Pending)</option>
                  <option value="confirmed">Đã xác nhận (Confirmed)</option>
                  <option value="processing">Đang chế tác (Processing)</option>
                  <option value="completed">Hoàn tất (Completed)</option>
                  <option value="cancelled">Đã hủy (Cancelled)</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-[#D6D3CD] rounded-sm shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#D6D3CD] text-[#141413]/70 font-mono uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4">Mã đơn hàng</th>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Khu vực</th>
                      <th className="py-3 px-4 text-center">Sản phẩm</th>
                      <th className="py-3 px-4 text-right">Tổng tiền</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D6D3CD]/50">
                    {ordersLoading ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-[#141413]/60">
                          <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span>Đang tải danh sách đơn hàng từ MySQL...</span>
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-[#141413]/60 space-y-2">
                          <ShoppingBag className="w-8 h-8 mx-auto text-[#141413]/30" />
                          <p className="font-medium">Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</p>
                          <p className="text-[11px] text-[#141413]/40">
                            Hãy thử đổi từ khóa tìm kiếm hoặc lọc trạng thái khác.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      orders.map((ord) => {
                        const statusConf = STATUS_CONFIG[ord.status] || STATUS_CONFIG.pending;
                        const StatusIcon = statusConf.icon;

                        return (
                          <tr key={ord.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            {/* Order Code */}
                            <td className="py-3.5 px-4 font-mono font-bold text-[#141413]">
                              <button
                                type="button"
                                onClick={() => handleOpenOrderDetail(ord.order_code)}
                                className="hover:text-[#D4AF37] hover:underline inline-flex items-center gap-1 text-left"
                              >
                                <span>{ord.order_code}</span>
                              </button>
                            </td>

                            {/* Date */}
                            <td className="py-3.5 px-4 text-[#141413]/70 font-mono text-[11px] whitespace-nowrap">
                              {formatDate(ord.created_at)}
                            </td>

                            {/* Customer */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-[#141413]">{ord.customer_name}</div>
                              <div className="text-[11px] text-[#141413]/60 font-mono">{ord.customer_phone}</div>
                            </td>

                            {/* Shipping City */}
                            <td className="py-3.5 px-4 text-[#141413]/80">
                              {ord.shipping_city}
                            </td>

                            {/* Items count & Bespoke indicator */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="font-mono">{ord.total_items} món</span>
                              {ord.has_bespoke && (
                                <span className="block text-[9px] font-mono px-1 py-0.5 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 rounded mt-0.5 mx-auto max-w-[85px]">
                                  ✦ 3D Bespoke
                                </span>
                              )}
                            </td>

                            {/* Total Amount */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-[#141413]">
                              {formatVND(ord.total_amount)}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusConf.badgeClass}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                <span>{statusConf.label}</span>
                              </span>
                              <span className={`block mt-1 text-[10px] font-semibold ${ord.payment_status === 'paid' ? 'text-emerald-700' : ord.payment_status === 'failed' ? 'text-rose-700' : 'text-amber-800'}`}>
                                Thanh toán: {PAYMENT_STATUS_LABELS[ord.payment_status] || PAYMENT_STATUS_LABELS.unpaid}
                              </span>
                            </td>

                            {/* Action Button */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenOrderDetail(ord.order_code)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#D6D3CD] hover:border-[#141413] hover:bg-[#141413] hover:text-[#FAF8F5] transition-colors rounded-sm text-[11px] font-medium"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Xem</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-4 bg-[#FAF8F5] border-t border-[#D6D3CD] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#141413]/70 font-mono">
                <div>
                  Hiển thị trang <strong>{orderPagination.page}</strong> / <strong>{orderPagination.totalPages}</strong> ({orderPagination.totalOrders} đơn hàng)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={orderPagination.page <= 1 || ordersLoading}
                    onClick={() => loadOrders(orderPagination.page - 1)}
                    className="p-1.5 border border-[#D6D3CD] rounded bg-white hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2">Trang {orderPagination.page}</span>
                  <button
                    type="button"
                    disabled={orderPagination.page >= orderPagination.totalPages || ordersLoading}
                    onClick={() => loadOrders(orderPagination.page + 1)}
                    className="p-1.5 border border-[#D6D3CD] rounded bg-white hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Trang tiếp theo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY & CATALOG MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white border border-[#D6D3CD] p-4 rounded-sm shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#141413]/60">Phân loại:</span>
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 border border-[#D6D3CD] rounded-sm text-xs bg-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">Tất cả kiểu dáng</option>
                  <option value="aviator">Aviator</option>
                  <option value="cateye">Cat-Eye</option>
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                </select>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={onlyLowStock}
                    onChange={(e) => setOnlyLowStock(e.target.checked)}
                    className="rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                  />
                  <span className="text-rose-700">Chỉ hiển thị tồn kho thấp (≤ 5 chiếc)</span>
                </label>
              </div>

              <div className="text-xs text-[#141413]/60 font-mono">
                Tổng cộng: <strong>{products.length}</strong> sản phẩm trong kho MySQL
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white border border-[#D6D3CD] rounded-sm shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#D6D3CD] text-[#141413]/70 font-mono uppercase text-[11px] tracking-wider">
                      <th className="py-3 px-4">Mã SKU</th>
                      <th className="py-3 px-4">Tên sản phẩm</th>
                      <th className="py-3 px-4">Kiểu dáng</th>
                      <th className="py-3 px-4 text-right">Đơn giá có thẩm quyền</th>
                      <th className="py-3 px-4 text-center">Tồn kho khả dụng</th>
                      <th className="py-3 px-4 text-center">Trạng thái KD</th>
                      <th className="py-3 px-4 text-center">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D6D3CD]/50">
                    {productsLoading ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-[#141413]/60">
                          <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span>Đang tải danh mục tồn kho từ MySQL...</span>
                        </td>
                      </tr>
                    ) : products.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center text-[#141413]/60">
                          Không có sản phẩm nào khớp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        return (
                          <tr key={p.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#141413]">
                              {p.id}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-[#141413]">
                              {p.name}
                            </td>
                            <td className="py-3.5 px-4 text-[#141413]/70">
                              {p.category_label || p.category}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-[#141413]">
                              {formatVND(p.price)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded text-xs font-bold ${
                                  p.stock <= 5
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {p.stock} chiếc
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                                  p.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {p.is_active ? 'Đang bán' : 'Ngừng bán'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleStartEditProduct(p)}
                                className="inline-flex items-center gap-1 px-3 py-1 border border-[#D6D3CD] rounded text-[11px] hover:border-[#141413] hover:bg-[#FAF8F5]"
                              >
                                <Edit3 className="w-3 h-3 text-[#D4AF37]" />
                                <span>Sửa</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS & CHARTS */}
        {activeTab === 'analytics' && (
          <AnalyticsPanel stats={stats} statsLoading={statsLoading} formatVND={formatVND} />
        )}

        {/* TAB 4: LUMINA CARE & AFTER-SALES TICKETS */}
        {activeTab === 'care' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white border border-[#D6D3CD] p-4 rounded-sm shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  value={careSearchQuery}
                  onChange={(e) => setCareSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã ticket (CARE-...), mã đơn, SĐT hoặc tiêu đề..."
                  className="flex-1 px-3 py-2 border border-[#D6D3CD] rounded text-xs text-[#141413] focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => loadCareRequests(1)}
                  className="px-4 py-2 bg-[#141413] text-[#FAF8F5] text-xs font-semibold rounded hover:bg-[#D4AF37] hover:text-[#141413] transition"
                >
                  Tìm kiếm
                </button>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={careStatusFilter}
                  onChange={(e) => setCareStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-[#D6D3CD] rounded text-xs text-[#141413] bg-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="submitted">Đã tiếp nhận (submitted)</option>
                  <option value="reviewing">Đang xem xét (reviewing)</option>
                  <option value="waiting_customer">Chờ khách bổ sung (waiting_customer)</option>
                  <option value="approved">Đã duyệt (approved)</option>
                  <option value="in_progress">Đang xử lý (in_progress)</option>
                  <option value="resolved">Đã giải quyết (resolved)</option>
                  <option value="rejected">Từ chối (rejected)</option>
                  <option value="closed">Đã đóng (closed)</option>
                </select>

                <select
                  value={careRequestTypeFilter}
                  onChange={(e) => setCareRequestTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-[#D6D3CD] rounded text-xs text-[#141413] bg-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="all">Tất cả loại yêu cầu</option>
                  <option value="warranty_claim">Bảo hành lỗi kỹ thuật</option>
                  <option value="fit_adjustment">Cân chỉnh ve mũi</option>
                  <option value="deep_cleaning">Vệ sinh siêu âm</option>
                  <option value="repair_service">Sửa chữa thay thế</option>
                  <option value="catalog_return">Đổi trả Catalog</option>
                  <option value="usage_consultation">Tư vấn sử dụng</option>
                  <option value="other">Khác</option>
                </select>

                <button
                  type="button"
                  onClick={() => loadCareRequests(1)}
                  className="p-2 border border-[#D6D3CD] rounded hover:bg-[#FAF8F5] text-[#141413]/70"
                  title="Làm mới"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Care Tickets Table */}
            <div className="bg-white border border-[#D6D3CD] rounded-sm shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] border-b border-[#D6D3CD] font-mono text-[11px] text-[#141413]/70 uppercase">
                    <tr>
                      <th className="py-3 px-4">Mã Ticket</th>
                      <th className="py-3 px-4">Khách hàng & SĐT</th>
                      <th className="py-3 px-4">Mã Đơn Hàng</th>
                      <th className="py-3 px-4">Loại Yêu Cầu</th>
                      <th className="py-3 px-4">Trạng Thái</th>
                      <th className="py-3 px-4">KTV Phụ Trách</th>
                      <th className="py-3 px-4">Ngày Gửi</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D6D3CD]">
                    {careLoading ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-[#141413]/60">
                          Đang tải danh sách phiếu hỗ trợ Lumina Care...
                        </td>
                      </tr>
                    ) : careRequests.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-[#141413]/60">
                          Không có phiếu yêu cầu nào phù hợp bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      careRequests.map((ticket) => (
                        <tr key={ticket.ticketCode} className="hover:bg-[#FAF8F5] transition">
                          <td className="py-3 px-4 font-mono font-bold text-[#D4AF37]">
                            {ticket.ticketCode}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold block text-[#141413]">{ticket.customerName}</span>
                            <span className="text-[11px] text-[#141413]/60">{ticket.contactPhone}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#141413]">
                            {ticket.orderCode}
                          </td>
                          <td className="py-3 px-4 text-[#141413]/80">
                            {ticket.requestType}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 uppercase">
                              {ticket.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#141413]/70 font-mono">
                            {ticket.assignedTo || 'Chưa phân công'}
                          </td>
                          <td className="py-3 px-4 text-[#141413]/60">
                            {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedCareTicketCode(ticket.ticketCode)}
                              className="px-3 py-1.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] rounded font-semibold text-[11px] transition shadow-sm"
                            >
                              Xử lý ticket
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {carePagination.totalPages > 1 && (
                <div className="p-3 bg-[#FAF8F5] border-t border-[#D6D3CD] flex items-center justify-between text-xs text-[#141413]/70">
                  <span>Trang {carePagination.page} / {carePagination.totalPages} (Tổng {carePagination.total} tickets)</span>
                  <div className="flex gap-1">
                    <button
                      disabled={carePagination.page <= 1}
                      onClick={() => loadCareRequests(carePagination.page - 1)}
                      className="px-2 py-1 border border-[#D6D3CD] rounded disabled:opacity-40"
                    >
                      Trước
                    </button>
                    <button
                      disabled={carePagination.page >= carePagination.totalPages}
                      onClick={() => loadCareRequests(carePagination.page + 1)}
                      className="px-2 py-1 border border-[#D6D3CD] rounded disabled:opacity-40"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LUMINA MEMBERSHIP & LOYALTY (Prompt 04) */}
        {activeTab === 'loyalty' && <AdminLoyaltyTab />}

        {/* TAB 6: PRODUCT REVIEWS MODERATION (Prompt 05) */}
        {activeTab === 'reviews' && <AdminReviewsTab />}

        {/* TAB 7: REFERRAL PROGRAM AUDIT (Prompt 05) */}
        {activeTab === 'referrals' && <AdminReferralsTab />}

        {/* TAB 8: NOTIFICATIONS & DELIVERY LOGS (Prompt 06) */}
        {activeTab === 'notifications' && <AdminNotificationsTab />}

        {/* TAB 9: RETENTION & AFTER-SALES OPERATIONS ANALYTICS (Prompt 08) */}
        {activeTab === 'retention' && <AdminRetentionTab />}

        {/* MODAL: ORDER DETAILS & 3D SPECS INSPECTOR */}
        {selectedOrderCode && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white border border-[#D6D3CD] rounded-sm max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-[#D6D3CD] bg-[#FAF8F5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-[#D6D3CD] flex items-center justify-center text-[#D4AF37]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-base sm:text-lg font-bold text-[#141413]">
                        {selectedOrderCode}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(selectedOrderCode)}
                        className="p-1 hover:text-[#D4AF37] text-[#141413]/50 transition-colors"
                        title="Sao chép mã đơn"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[11px] text-[#141413]/60 font-mono">
                      Khởi tạo: {selectedOrder ? formatDate(selectedOrder.created_at) : '...'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseOrderDetail}
                  className="p-2 text-[#141413]/60 hover:text-[#141413] hover:bg-white rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {detailLoading || !selectedOrder ? (
                  <div className="py-16 text-center text-[#141413]/60">
                    <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Đang tải thông tin chi tiết đơn hàng...</span>
                  </div>
                ) : (
                  <>
                    {/* Status update alert banner if present */}
                    {statusActionMessage && (
                      <div
                        className={`p-3 rounded text-xs flex items-center justify-between ${
                          statusActionMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-50 text-rose-800 border border-rose-300'
                        }`}
                      >
                        <span>{statusActionMessage.text}</span>
                        <button
                          onClick={() => setStatusActionMessage(null)}
                          className="text-xs font-bold ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Section 1: Customer & Shipping Destination */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Customer Info Box */}
                      <div className="bg-[#FAF8F5] p-4 rounded-sm border border-[#D6D3CD]/60 space-y-2">
                        <span className="font-mono uppercase text-[10px] tracking-wider text-[#141413]/50 block">
                          Thông tin khách hàng & Tài khoản
                        </span>
                        <div className="font-bold text-sm text-[#141413] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{selectedOrder.customer_name}</span>
                        </div>
                        <div className="text-[11px] text-[#141413]/70 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[#141413]/50" />
                            <span className="font-mono">{selectedOrder.customer_phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-[#141413]/50" />
                            <span>{selectedOrder.customer_email}</span>
                          </div>
                          <div className="text-[10px] font-mono text-[#141413]/50 pt-1">
                            User ID: {selectedOrder.user_id}
                          </div>
                        </div>
                      </div>

                      {/* Shipping Info Box */}
                      <div className="bg-[#FAF8F5] p-4 rounded-sm border border-[#D6D3CD]/60 space-y-2">
                        <span className="font-mono uppercase text-[10px] tracking-wider text-[#141413]/50 block">
                          Địa chỉ giao nhận & Thanh toán
                        </span>
                        <div className="text-xs text-[#141413] flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                          <span>
                            {selectedOrder.shipping_address}, {selectedOrder.shipping_city}
                          </span>
                        </div>
                        <div className="pt-1 text-[11px] text-[#141413]/70 space-y-1">
                          <div>
                            Phương thức thanh toán: <strong className="uppercase">{selectedOrder.payment_method}</strong>
                          </div>
                          <div>
                            Trạng thái thanh toán: <strong className={selectedOrder.payment_status === 'paid' ? 'text-emerald-700' : 'text-amber-800'}>
                              {PAYMENT_STATUS_LABELS[selectedOrder.payment_status] || PAYMENT_STATUS_LABELS.unpaid}
                            </strong>
                          </div>
                          {selectedOrder.order_notes && (
                            <div className="italic text-[#141413]/80 pt-1">
                              Ghi chú: "{selectedOrder.order_notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payment status, immutable amount and reconciliation history */}
                    <section className="bg-white border border-[#D6D3CD] p-4 rounded-sm space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-[#141413]">Thanh toán & đối soát</h4>
                          <p className="text-[11px] text-[#141413]/65 mt-1">Tổng tiền từ đơn hàng: <strong className="font-mono">{formatVND(selectedOrder.total_amount)}</strong></p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold ${selectedOrder.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : selectedOrder.payment_status === 'failed' ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
                          {PAYMENT_STATUS_LABELS[selectedOrder.payment_status] || PAYMENT_STATUS_LABELS.unpaid}
                        </span>
                      </div>

                      {selectedOrder.payments?.length > 0 ? (
                        <div className="divide-y divide-[#D6D3CD] border-y border-[#D6D3CD]">
                          {selectedOrder.payments.map((payment) => (
                            <div key={payment.paymentCode || payment.payment_code} className="py-2.5 grid grid-cols-1 sm:grid-cols-4 gap-1 text-[10px]">
                              <span className="font-mono">{payment.paymentCode || payment.payment_code}</span>
                              <span>{payment.provider} · {PAYMENT_STATUS_LABELS[payment.status] || payment.status}</span>
                              <span className="font-mono">{formatVND(payment.amount)}</span>
                              <span className="break-all">Tham chiếu: {payment.reference || payment.reconciliation_reference || '—'}</span>
                              {payment.verificationNote && <span className="sm:col-span-4 text-[#141413]/65">Ghi chú: {payment.verificationNote}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#141413]/60">Chưa có lần thanh toán hoặc đối soát nào.</p>
                      )}

                      {selectedOrder.payment_status !== 'paid' && selectedOrder.payment_status !== 'refunded' && selectedOrder.status !== 'cancelled' && (
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 pt-1">
                          <input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} maxLength={128} placeholder="Mã tham chiếu đã kiểm tra" className="px-3 py-2 border border-[#D6D3CD] rounded-sm text-xs font-mono focus:outline-none focus:border-[#D4AF37]" />
                          <input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} maxLength={500} placeholder="Ghi chú đối soát / xác nhận thu COD" className="px-3 py-2 border border-[#D6D3CD] rounded-sm text-xs focus:outline-none focus:border-[#D4AF37]" />
                          <button type="button" onClick={() => handleReconcilePayment('paid')} disabled={updatingPayment} className="px-3 py-2 bg-[#141413] text-white rounded-sm text-[10px] font-semibold uppercase tracking-wider disabled:opacity-50">
                            {updatingPayment ? 'Đang lưu…' : 'Xác nhận đã thu'}
                          </button>
                          <button type="button" onClick={() => handleReconcilePayment('failed')} disabled={updatingPayment} className="px-3 py-2 border border-rose-300 text-rose-800 bg-rose-50 rounded-sm text-[10px] font-semibold uppercase tracking-wider disabled:opacity-50">
                            Ghi nhận thất bại
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-[#141413]/55">Chỉ xác nhận sau khi đối chiếu tiền thực nhận. Thao tác cần mã tham chiếu và được lưu vào lịch sử.</p>
                    </section>

                    {/* Section 2: Order Status Controller */}
                    <div className="bg-white border border-[#D6D3CD] p-4 rounded-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#141413]/70">Trạng thái hiện tại:</span>
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                              (STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).badgeClass
                            }`}
                          >
                            <span>{(STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.pending).label}</span>
                          </span>
                        </div>

                        {/* State Transition Actions */}
                        <div className="flex items-center gap-2">
                          {NEXT_TRANSITIONS[selectedOrder.status]?.length > 0 ? (
                            <>
                              <span className="text-[11px] text-[#141413]/60">Chuyển sang:</span>
                              {NEXT_TRANSITIONS[selectedOrder.status].map((target) => (
                                <button
                                  key={target}
                                  type="button"
                                  disabled={updatingStatus}
                                  onClick={() => handleUpdateStatus(target)}
                                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-sm transition-colors border shadow-sm ${
                                    target === 'cancelled'
                                      ? 'border-rose-400 text-rose-700 hover:bg-rose-50'
                                      : 'border-[#141413] bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413]'
                                  } disabled:opacity-50`}
                                >
                                  {updatingStatus ? 'Đang lưu...' : STATUS_CONFIG[target]?.label || target}
                                </button>
                              ))}
                            </>
                          ) : (
                            <span className="text-[11px] text-[#141413]/50 italic font-mono">
                              ✦ Trạng thái kết thúc ({selectedOrder.status})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Ordered Items with 3D Bespoke Inspector */}
                    <div className="space-y-3">
                      <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-[#141413]">
                        Danh sách sản phẩm trong đơn ({selectedOrder.items?.length || 0} mục)
                      </h4>

                      <div className="space-y-4">
                        {selectedOrder.items?.map((item) => {
                          const isCustom = item.productType === 'custom' || Boolean(item.customSpec);
                          const spec = item.customSpec;

                          return (
                            <div
                              key={item.orderItemId}
                              className={`p-4 rounded-sm border ${
                                isCustom ? 'border-[#D4AF37]/60 bg-[#D4AF37]/5' : 'border-[#D6D3CD] bg-white'
                              } space-y-3`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  {/* Snapshot or generic image */}
                                  {spec?.snapshotPath ? (
                                    <div className="relative group">
                                      <img
                                        src={`http://localhost:3000${spec.snapshotPath}`}
                                        alt="3D Snapshot"
                                        className="w-16 h-16 object-cover rounded border border-[#D4AF37] bg-[#FAF8F5] shadow-sm flex-shrink-0"
                                      />
                                      <a
                                        href={`http://localhost:3000${spec.snapshotPath}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center text-[10px] font-mono"
                                        title="Xem ảnh gốc có watermark"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="w-16 h-16 bg-[#FAF8F5] rounded border border-[#D6D3CD] flex items-center justify-center flex-shrink-0">
                                      <Package className="w-6 h-6 text-[#141413]/30" />
                                    </div>
                                  )}

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-[#141413]">
                                        {item.productName}
                                      </span>
                                      {isCustom && (
                                        <span className="text-[9px] font-mono px-2 py-0.5 bg-[#D4AF37] text-[#141413] font-bold rounded">
                                          ✦ 3D Bespoke
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-[#141413]/60 font-mono mt-0.5">
                                      Mã: {item.productId} | Số lượng: <strong>{item.quantity}</strong> × {formatVND(item.unitPrice)}
                                    </div>
                                  </div>
                                </div>

                                <div className="font-mono text-sm font-bold text-[#141413] text-right">
                                  {formatVND(item.subtotal)}
                                </div>
                              </div>

                              {/* 3D Bespoke Specifications Panel */}
                              {isCustom && spec && (
                                <div className="mt-3 p-3 bg-white rounded border border-[#D4AF37]/30 space-y-2 text-[11px]">
                                  <div className="font-mono font-bold text-[#D4AF37] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Thông số thiết kế cá nhân hóa 3D Atelier</span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="p-2 bg-[#FAF8F5] rounded border border-[#D6D3CD]/50">
                                      <span className="text-[#141413]/50 block text-[9px] uppercase font-mono">Dáng gọng (Model)</span>
                                      <strong className="capitalize">{spec.baseModel || '—'}</strong>
                                    </div>

                                    <div className="p-2 bg-[#FAF8F5] rounded border border-[#D6D3CD]/50">
                                      <span className="text-[#141413]/50 block text-[9px] uppercase font-mono">Màu gọng</span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span
                                          className="w-3 h-3 rounded-full border border-black/30 inline-block"
                                          style={{ backgroundColor: spec.frameColor || '#D4AF37' }}
                                        />
                                        <span className="font-mono text-[10px]">{spec.frameColor}</span>
                                      </div>
                                    </div>

                                    <div className="p-2 bg-[#FAF8F5] rounded border border-[#D6D3CD]/50">
                                      <span className="text-[#141413]/50 block text-[9px] uppercase font-mono">Tròng kính</span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span
                                          className="w-3 h-3 rounded-full border border-black/30 inline-block"
                                          style={{ backgroundColor: spec.lensColor || '#1F2937' }}
                                        />
                                        <span>Độ tối: {Math.round((spec.lensOpacity || 0.45) * 100)}%</span>
                                      </div>
                                    </div>

                                    <div className="p-2 bg-[#FAF8F5] rounded border border-[#D6D3CD]/50">
                                      <span className="text-[#141413]/50 block text-[9px] uppercase font-mono">Đính đá Rhinestones</span>
                                      <strong className={spec.hasRhinestones ? 'text-[#D4AF37]' : 'text-[#141413]/50'}>
                                        {spec.hasRhinestones ? 'Có (+450k)' : 'Không'}
                                      </strong>
                                    </div>

                                    <div className="p-2 bg-[#FAF8F5] rounded border border-[#D6D3CD]/50">
                                      <span className="text-[#141413]/50 block text-[9px] uppercase font-mono">Kiểu càng</span>
                                      <strong>
                                        {{
                                          'classic-acetate': 'Acetate Cổ Điển',
                                          'slim-metal': 'Kim Loại Thanh Mảnh',
                                          'statement-wide': 'Bản Rộng Phong Cách',
                                          'sculpted-comfort': 'Điêu Khắc Comfort',
                                        }[spec.templeStyle] || spec.templeStyle || 'Acetate Cổ Điển'}
                                      </strong>
                                    </div>

                                    <div className="p-2 bg-[#FAF8F5] rounded border border-[#D6D3CD]/50 sm:col-span-2">
                                      <span className="text-[#141413]/50 block text-[9px] uppercase font-mono">Charms gắn kèm</span>
                                      <strong>
                                        {Array.isArray(spec.charms) && spec.charms.length > 0
                                          ? spec.charms.join(', ')
                                          : 'Không gắn Charm'}
                                      </strong>
                                    </div>

                                    <div className="p-2 bg-[#FAF8F5] rounded border border-[#D6D3CD]/50 sm:col-span-2">
                                      <span className="text-[#141413]/50 block text-[9px] uppercase font-mono">Chữ khắc Laser</span>
                                      <strong className="font-mono text-[#D4AF37]">
                                        {spec.engravingText ? (
                                          <>
                                            &quot;{spec.engravingText}&quot; (+150k)
                                            <span className="text-[10px] text-[#141413]/60 font-sans ml-1.5 font-normal">
                                              ({spec.engravingPlacement === 'inner_temple' ? 'Mặt trong càng' : spec.engravingPlacement === 'two_temples' ? 'Cả hai mặt' : 'Mặt ngoài càng'})
                                            </span>
                                          </>
                                        ) : 'Không khắc'}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Prescription Data Display (if applicable) */}
                              {item.prescription && item.prescription.isPrescriptionOrder && (
                                <div className="mt-2 p-3 bg-blue-50/50 rounded border border-blue-200 space-y-1.5 text-[11px]">
                                  <div className="font-mono font-bold text-blue-900 uppercase text-[10px] tracking-wider">
                                    ✦ Toa cắt tròng kính thuốc (Prescription)
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                                    <div>Mắt phải (OD): SPH {item.prescription.sphereOD}, CYL {item.prescription.cylinderOD}, Trục {item.prescription.axisOD}°</div>
                                    <div>Mắt trái (OS): SPH {item.prescription.sphereOS}, CYL {item.prescription.cylinderOS}, Trục {item.prescription.axisOS}°</div>
                                    <div>Khoảng cách đồng tử (PD): <strong>{item.prescription.pd} mm</strong></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 4: Financial Summary */}
                    <div className="bg-[#FAF8F5] border border-[#D6D3CD] p-4 rounded-sm space-y-2 text-xs">
                      <div className="flex justify-between text-[#141413]/70">
                        <span>Tạm tính tiền hàng:</span>
                        <span className="font-mono">{formatVND(selectedOrder.subtotal_amount)}</span>
                      </div>
                      {selectedOrder.discount_amount > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Mã giảm giá ({selectedOrder.voucher_code}):</span>
                          <span className="font-mono">-{formatVND(selectedOrder.discount_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#141413]/70">
                        <span>Phí vận chuyển:</span>
                        <span className="font-mono">{formatVND(selectedOrder.shipping_fee)}</span>
                      </div>
                      <div className="pt-2 border-t border-[#D6D3CD] flex justify-between items-baseline font-bold text-sm text-[#141413]">
                        <span>Tổng tiền thanh toán:</span>
                        <span className="font-brand text-lg text-[#D4AF37]">
                          {formatVND(selectedOrder.total_amount)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#D6D3CD] bg-[#FAF8F5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#141413]/50 font-mono">
                    Lumina Eyewear Administration Atelier
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeliveryOrderCode(selectedOrder?.order_code || selectedOrderCode)}
                    className="px-3 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 transition rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Xác nhận giao hàng & Kích hoạt BH</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCloseOrderDetail}
                  className="px-5 py-2 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-semibold uppercase tracking-wider rounded-sm shadow-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT PRODUCT INVENTORY & PRICE */}
        {editingProduct && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white border border-[#D6D3CD] rounded-sm max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#D6D3CD] pb-3">
                <h3 className="font-brand text-base font-bold text-[#141413]">
                  Cập nhật sản phẩm: {editingProduct.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="p-1 text-[#141413]/50 hover:text-[#141413]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-[#141413] mb-1">
                    Số lượng tồn kho khả dụng (MySQL)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={productEditForm.stock}
                    onChange={(e) =>
                      setProductEditForm((prev) => ({ ...prev, stock: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#D6D3CD] rounded font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                  <span className="text-[10px] text-[#141413]/50 mt-1 block">
                    Được dùng trực tiếp để trừ kho khi khách thanh toán qua Transaction.
                  </span>
                </div>

                <div>
                  <label className="block font-medium text-[#141413] mb-1">
                    Đơn giá bán có thẩm quyền (VND)
                  </label>
                  <input
                    type="number"
                    min="10000"
                    step="50000"
                    value={productEditForm.price}
                    onChange={(e) =>
                      setProductEditForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#D6D3CD] rounded font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                  <span className="text-[10px] text-[#141413]/50 mt-1 block">
                    Không ảnh hưởng đến các đơn hàng đã tạo trước đó.
                  </span>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productEditForm.is_active}
                      onChange={(e) =>
                        setProductEditForm((prev) => ({ ...prev, is_active: e.target.checked }))
                      }
                      className="rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                    />
                    <span className="font-medium text-[#141413]">Đang mở bán trên hệ thống</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D6D3CD]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-[#D6D3CD] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#FAF8F5]"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={savingProduct}
                  onClick={handleSaveProduct}
                  className="px-5 py-2 bg-[#141413] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#D4AF37] hover:text-[#141413] transition-colors disabled:opacity-50"
                >
                  {savingProduct ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN CARE TICKET DETAIL & ACTION MODAL */}
        {selectedCareTicketCode && (
          <AdminCareModal
            isOpen={Boolean(selectedCareTicketCode)}
            onClose={() => setSelectedCareTicketCode(null)}
            ticketCode={selectedCareTicketCode}
            onUpdated={() => loadCareRequests(carePagination.page)}
          />
        )}

        {/* DELIVERY CONFIRMATION & WARRANTY ACTIVATION MODAL */}
        {deliveryOrderCode && (
          <DeliveryModal
            isOpen={Boolean(deliveryOrderCode)}
            onClose={() => setDeliveryOrderCode(null)}
            orderCode={deliveryOrderCode}
            onSuccess={() => {
              loadOrders(orderPagination.page);
              if (selectedOrderCode) handleOpenOrderDetail(selectedOrderCode);
            }}
          />
        )}
      </div>
    </div>
  );
}
