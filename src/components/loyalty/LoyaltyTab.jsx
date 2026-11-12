import React, { useState, useEffect, useCallback } from 'react';
import { Award, Sparkles, TrendingUp, ShieldCheck, Clock, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft, Calculator, ChevronRight } from 'lucide-react';
import { getMyLoyaltyOverview, getMyLoyaltyTransactions, previewPointsRedemption } from '../../api/loyaltyService';
import ReferralCard from '../referral/ReferralCard';

export default function LoyaltyTab() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalTx, setTotalTx] = useState(0);
  const [error, setError] = useState(null);

  // Calculator state
  const [calcOrderAmount, setCalcOrderAmount] = useState(2500000);
  const [calcPointsToUse, setCalcPointsToUse] = useState(20);
  const [calcPreview, setCalcPreview] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, txRes] = await Promise.all([
        getMyLoyaltyOverview(),
        getMyLoyaltyTransactions({ limit: 20 }),
      ]);
      if (ovRes?.data) setOverview(ovRes.data);
      if (txRes?.data) {
        setTransactions(txRes.data.transactions || []);
        setTotalTx(txRes.data.total || 0);
      }
    } catch (err) {
      console.error('[LoyaltyTab] Error loading loyalty data:', err);
      setError(err?.message || 'Không thể tải dữ liệu thành viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recalculate preview when calculator inputs change
  useEffect(() => {
    if (!overview) return;
    const points = parseInt(calcPointsToUse, 10) || 0;
    const amount = parseFloat(calcOrderAmount) || 0;
    if (amount <= 0 || points <= 0) {
      setCalcPreview(null);
      return;
    }
    const discount = points * 1000;
    const maxDiscount = amount * 0.20;
    const maxPoints = Math.floor(maxDiscount / 1000);
    const available = overview.account.availablePoints;

    setCalcPreview({
      discount,
      maxDiscount,
      maxPoints,
      isValid: points >= 10 && points <= available && discount <= maxDiscount,
      pointsEarnedIfBought: Math.floor(amount / 100000),
    });
  }, [calcOrderAmount, calcPointsToUse, overview]);

  if (loading) {
    return (
      <div className="p-12 text-center text-[#141413]/60 bg-white border border-[#D6D3CD] rounded shadow-sm">
        <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Đang tải hồ sơ thành viên Lumina Membership...</p>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded text-rose-800 text-sm">
        <div className="flex items-center gap-2 font-bold mb-1">
          <AlertCircle className="w-4 h-4" />
          <span>Thông báo</span>
        </div>
        <p>{error || 'Chưa thể tải dữ liệu tích điểm thành viên.'}</p>
        <button
          onClick={loadData}
          className="mt-3 px-3 py-1.5 bg-[#141413] text-white text-xs font-semibold rounded hover:bg-[#D4AF37] hover:text-[#141413] transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const { account, tier, rules } = overview;
  const isDiamond = tier.code === 'diamond';

  return (
    <div className="space-y-6">
      {/* ── 1. LUXURY MEMBERSHIP CARD ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#141413] via-[#1F2937] to-[#141413] text-[#FAF8F5] border border-[#D4AF37]/40 shadow-2xl p-6 sm:p-8">
        {/* Background Decorative Crest */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 top-6 text-[#D4AF37]/20 font-serif text-8xl font-bold select-none pointer-events-none">
          ✦
        </div>

        <div className="relative z-10 flex flex-col justify-between min-h-[220px]">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#D4AF37] font-semibold">
                Lumina Eyewear Atelier Club
              </span>
              <h2 className="font-brand font-bold text-2xl sm:text-3xl tracking-wide text-[#FAF8F5] mt-1 flex items-center gap-2">
                <span>{tier.name}</span>
                <span
                  className="px-2.5 py-0.5 text-[10px] uppercase font-mono tracking-wider rounded-full border"
                  style={{
                    backgroundColor: `${tier.badgeColor}25`,
                    borderColor: tier.badgeColor,
                    color: tier.badgeColor === '#1A202C' ? '#D4AF37' : tier.badgeColor,
                  }}
                >
                  {tier.code}
                </span>
              </h2>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FAF8F5]/10 border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
              <Award className="w-5 h-5" />
            </div>
          </div>

          {/* Points Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6 py-4 border-y border-white/10">
            <div>
              <span className="text-[11px] text-[#FAF8F5]/60 font-body block">Điểm khả dụng (Đổi thưởng)</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#D4AF37] mt-0.5">
                {account.availablePoints.toLocaleString('vi-VN')} <span className="text-xs font-normal text-[#FAF8F5]/70">pts</span>
              </div>
              <span className="text-[10px] text-[#FAF8F5]/50 font-mono block mt-0.5">
                ≈ {(account.availablePoints * rules.redemptionRateVnd).toLocaleString('vi-VN')} VNĐ
              </span>
            </div>

            <div>
              <span className="text-[11px] text-[#FAF8F5]/60 font-body block">Điểm trọn đời (Xét hạng)</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#FAF8F5] mt-0.5">
                {account.lifetimePoints.toLocaleString('vi-VN')} <span className="text-xs font-normal text-[#FAF8F5]/70">pts</span>
              </div>
              <span className="text-[10px] text-[#FAF8F5]/50 font-mono block mt-0.5">
                Không bị trừ khi đổi điểm
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[11px] text-[#FAF8F5]/60 font-body block">Mã hội viên</span>
              <div className="text-sm font-mono font-bold text-[#FAF8F5]/90 mt-1 truncate">
                {account.userId}
              </div>
              <span className="text-[10px] text-[#FAF8F5]/50 font-mono block mt-0.5">
                Tham gia: {new Date(account.joinedAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          {/* Next Tier Progress Bar */}
          <div>
            {isDiamond ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
                <Sparkles className="w-4 h-4" />
                <span>Chúc mừng! Bạn đã đạt hạng Sovereign cao cấp nhất tại Lumina Eyewear.</span>
              </div>
            ) : tier.nextTier ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-body">
                  <span className="text-[#FAF8F5]/70">
                    Tiến độ thăng hạng <strong className="text-white font-semibold">{tier.nextTier.name}</strong>
                  </span>
                  <span className="font-mono text-[#D4AF37] font-semibold">
                    Cần thêm {tier.nextTier.pointsNeeded.toLocaleString('vi-VN')} điểm ({tier.nextTier.progressPercent}%)
                  </span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] h-full rounded-full transition-all duration-500"
                    style={{ width: `${tier.nextTier.progressPercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── 2. TIER BENEFITS & TRANSPARENT RULES ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier Benefits */}
        <div className="p-6 bg-white border border-[#D6D3CD] rounded shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-brand font-bold text-base text-[#141413]">Đặc Quyền Hạng {tier.name}</h3>
          </div>
          <p className="text-xs text-[#141413]/70 font-body">
            Là thành viên {tier.name}, quý khách được tận hưởng các chính sách chăm sóc độc quyền:
          </p>
          <ul className="space-y-2.5 text-xs text-[#141413]/90">
            {tier.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Approved Business Rules */}
        <div className="p-6 bg-[#FAF8F5] border border-[#D6D3CD] rounded shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-brand font-bold text-base text-[#141413]">Chính Sách Tích Điểm Minh Bạch</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white border border-[#D6D3CD] rounded space-y-1">
              <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider block font-bold">Tích Lũy</span>
              <div className="font-bold text-[#141413]">1% giá trị chi tiêu</div>
              <p className="text-[11px] text-[#141413]/60">Mỗi 100.000đ đơn hàng = 1 điểm thưởng.</p>
            </div>

            <div className="p-3 bg-white border border-[#D6D3CD] rounded space-y-1">
              <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider block font-bold">Quy Đổi</span>
              <div className="font-bold text-[#141413]">1 Điểm = 1.000 VNĐ</div>
              <p className="text-[11px] text-[#141413]/60">Tối đa 20% giá trị trên đơn hàng mới.</p>
            </div>

            <div className="p-3 bg-white border border-[#D6D3CD] rounded space-y-1">
              <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider block font-bold">Thời Điểm Ghi Nhận</span>
              <div className="font-bold text-[#141413]">Sau 07 ngày nhận hàng</div>
              <p className="text-[11px] text-[#141413]/60">Điểm tự động cộng sau khi hết hạn đổi trả.</p>
            </div>

            <div className="p-3 bg-white border border-[#D6D3CD] rounded space-y-1">
              <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-wider block font-bold">Bảo Toàn Hạng</span>
              <div className="font-bold text-[#141413]">Điểm trọn đời</div>
              <p className="text-[11px] text-[#141413]/60">Tiêu dùng điểm không làm hạ hạng thành viên.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. POINT REDEMPTION ESTIMATOR / CALCULATOR ── */}
      <div className="p-6 bg-white border border-[#D6D3CD] rounded shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="font-brand font-bold text-base text-[#141413]">Công Cụ Ước Tính Đổi Thưởng</h3>
          </div>
          <span className="text-xs text-[#141413]/60">Mô phỏng áp dụng điểm vào đơn hàng</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#141413]/70 mb-1">
              Giá trị đơn hàng dự kiến (VNĐ)
            </label>
            <input
              type="number"
              step="100000"
              value={calcOrderAmount}
              onChange={(e) => setCalcOrderAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#D6D3CD] rounded focus:border-[#D4AF37] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141413]/70 mb-1">
              Số điểm muốn dùng (Có: {account.availablePoints})
            </label>
            <input
              type="number"
              min="10"
              max={account.availablePoints}
              value={calcPointsToUse}
              onChange={(e) => setCalcPointsToUse(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-[#D6D3CD] rounded focus:border-[#D4AF37] focus:outline-none font-mono"
            />
          </div>

          <div className="p-3 bg-[#FAF8F5] border border-[#D6D3CD] rounded text-xs">
            {calcPreview ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#141413]/60">Giảm trừ:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    -{calcPreview.discount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-[#141413]/60">
                  <span>Trần tối đa 20%:</span>
                  <span className="font-mono">{calcPreview.maxPoints} pts</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#141413]/60">
                  <span>Tích lũy đơn này:</span>
                  <span className="font-bold text-[#D4AF37] font-mono">+{calcPreview.pointsEarnedIfBought} pts</span>
                </div>
              </div>
            ) : (
              <span className="text-[#141413]/50">Nhập thông tin để xem kết quả.</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. IMMUTABLE POINTS TRANSACTION LEDGER ── */}
      <div className="p-6 bg-white border border-[#D6D3CD] rounded shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-brand font-bold text-base text-[#141413]">Lịch Sử Giao Dịch Điểm Thưởng</h3>
            <p className="text-xs text-[#141413]/60">Sổ cái kế toán bất biến ghi nhận mọi biến động số dư.</p>
          </div>
          <span className="text-xs font-mono text-[#D4AF37] font-bold">Tổng {totalTx} giao dịch</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#141413]/50 border border-dashed border-[#D6D3CD] rounded">
            Chưa có giao dịch tích điểm nào được ghi nhận.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D6D3CD] bg-[#FAF8F5] text-[#141413]/70 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Loại</th>
                  <th className="py-2.5 px-3">Mã tham chiếu</th>
                  <th className="py-2.5 px-3 text-right">Biến động</th>
                  <th className="py-2.5 px-3 text-right">Số dư sau GD</th>
                  <th className="py-2.5 px-3">Lý do ghi nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D6D3CD]/60 font-mono">
                {transactions.map((tx) => {
                  const isPositive = tx.points > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-[#FAF8F5]/80 transition">
                      <td className="py-2.5 px-3 text-[#141413]/70 font-body">
                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          tx.type === 'earn'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : tx.type === 'redeem'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : tx.type === 'refund_clawback'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {tx.type === 'earn' ? 'Tích điểm' : tx.type === 'redeem' ? 'Đổi điểm' : tx.type === 'refund_clawback' ? 'Thu hồi' : 'Điều chỉnh'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#141413]">
                        {tx.sourceReference}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${
                        isPositive ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isPositive ? `+${tx.points}` : tx.points} pts
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#141413] font-semibold">
                        {tx.balanceAfter} pts
                      </td>
                      <td className="py-2.5 px-3 text-[#141413]/80 font-body">
                        {tx.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Referral Program Section */}
      <div className="pt-4 border-t border-stone-200">
        <ReferralCard />
      </div>
    </div>
  );
}

