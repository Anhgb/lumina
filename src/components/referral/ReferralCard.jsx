import React, { useState, useEffect } from 'react';
import { Share2, Copy, Check, Users, Gift, Sparkles, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { getMyReferralStats, claimReferralCode } from '../../api/referralService';

/**
 * ReferralCard component
 * 
 * Manages customer referral code, sharing, statistics, and claiming.
 */
export default function ReferralCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Claim referral code form state
  const [inputCode, setInputCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(null);
  const [claimError, setClaimError] = useState(null);

  useEffect(() => {
    loadReferralStats();
  }, []);

  const loadReferralStats = async () => {
    setLoading(true);
    try {
      const res = await getMyReferralStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      setError('Không thể tải thông tin giới thiệu bạn bè.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(stats.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!stats?.referralCode) return;
    const fullUrl = `${window.location.origin}/register?ref=${stats.referralCode}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleClaim = async (e) => {
    e.preventDefault();
    setClaimError(null);
    setClaimSuccess(null);

    if (!inputCode.trim()) {
      setClaimError('Vui lòng nhập mã giới thiệu.');
      return;
    }

    setClaiming(true);
    try {
      const res = await claimReferralCode(inputCode.trim());
      setClaimSuccess(res.data?.message || 'Áp dụng mã giới thiệu thành công!');
      setInputCode('');
      loadReferralStats();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể áp dụng mã giới thiệu.';
      setClaimError(msg);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">
        Đang tải thông tin chương trình giới thiệu...
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-rose-600 flex items-center justify-center gap-2">
        <AlertCircle className="w-5 h-5" /> {error}
      </div>
    );
  }

  const referralCode = stats?.referralCode || '—';
  const totalReferrals = stats?.totalReferrals || 0;
  const successfulReferrals = stats?.successfulReferrals || 0;
  const totalPointsEarned = stats?.totalPointsEarned || 0;
  const attributions = stats?.attributions || [];

  return (
    <div className="space-y-6">
      {/* Luxury Atelier Referral Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#141413] via-[#1E1E1C] to-[#2B2925] text-stone-100 p-6 md:p-8 shadow-xl border border-stone-800">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
              <Sparkles className="w-3.5 h-3.5" /> Lumina Atelier Referral
            </div>
            <h3 className="font-brand text-2xl md:text-3xl text-[#FAF8F5]">
              Lan Tỏa Phong Cách — Nhận Đặc Quyền Thượng Hạng
            </h3>
            <p className="text-sm text-stone-300 leading-relaxed">
              Mời bạn bè cùng trải nghiệm kính mắt thủ công Lumina. Mỗi đơn hàng đầu tiên của bạn bè đủ điều kiện, bạn sẽ nhận được điểm thưởng loyalty để đổi ưu đãi độc quyền.
            </p>
          </div>

          {/* Referral Code Box */}
          <div className="bg-[#FAF8F5]/10 backdrop-blur-md rounded-2xl p-5 border border-[#D4AF37]/30 text-center md:min-w-[240px]">
            <span className="text-[11px] uppercase tracking-wider text-stone-300 font-medium">
              Mã giới thiệu độc quyền của bạn
            </span>
            <div className="font-mono text-2xl font-bold tracking-wider text-[#D4AF37] my-2 select-all">
              {referralCode}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-[#FAF8F5] text-[#141413] text-xs font-semibold rounded-lg hover:bg-stone-200 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Đã sao chép' : 'Sao chép mã'}
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-[#D4AF37] text-[#141413] text-xs font-semibold rounded-lg hover:bg-[#C0982E] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Share2 className="w-3.5 h-3.5" />}
                {copiedLink ? 'Đã sao chép' : 'Sao chép link'}
              </button>
            </div>
          </div>
        </div>

        {/* 3 Metrics counters */}
        <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-stone-800/80">
          <div className="text-center md:text-left">
            <span className="text-xs text-stone-400">Tổng lời mời</span>
            <div className="text-2xl font-brand font-bold text-[#FAF8F5] mt-0.5">
              {totalReferrals}
            </div>
          </div>
          <div className="text-center md:text-left">
            <span className="text-xs text-stone-400">Đã kích hoạt</span>
            <div className="text-2xl font-brand font-bold text-emerald-400 mt-0.5">
              {successfulReferrals}
            </div>
          </div>
          <div className="text-center md:text-left">
            <span className="text-xs text-stone-400">Điểm thưởng tích lũy</span>
            <div className="text-2xl font-brand font-bold text-[#D4AF37] mt-0.5">
              +{totalPointsEarned} <span className="text-xs font-normal text-stone-400">pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Claim a Friend's Code Section */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h4 className="font-brand text-lg text-stone-900 mb-1 flex items-center gap-2">
          <Gift className="w-5 h-5 text-[#D4AF37]" />
          Bạn có mã giới thiệu từ bạn bè?
        </h4>
        <p className="text-xs text-stone-500 mb-4">
          Nhập mã của người giới thiệu trước khi đặt đơn hàng đầu tiên để nhận điểm thưởng chào mừng.
        </p>

        {claimSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{claimSuccess}</span>
          </div>
        )}

        {claimError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{claimError}</span>
          </div>
        )}

        <form onSubmit={handleClaim} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="Ví dụ: LUM-A8B9C"
            className="w-full sm:w-80 px-4 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:border-[#D4AF37]"
            maxLength={20}
          />
          <button
            type="submit"
            disabled={claiming}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#141413] text-[#FAF8F5] text-sm font-medium rounded-xl hover:bg-[#2A2927] transition-colors disabled:opacity-50"
          >
            {claiming ? 'Đang kiểm tra...' : 'Áp Dụng Mã'}
          </button>
        </form>
      </div>

      {/* History of Attributions */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h4 className="font-brand text-lg text-stone-900 mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-stone-600" />
          Danh Sách Bạn Bè Đã Giới Thiệu ({attributions.length})
        </h4>

        {attributions.length === 0 ? (
          <p className="text-sm text-stone-500 py-6 text-center">
            Bạn chưa giới thiệu người bạn nào. Hãy chia sẻ mã giới thiệu ở trên để cùng nhận điểm thưởng!
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {attributions.map((attr) => (
              <div key={attr.id} className="py-3.5 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-stone-900">{attr.referredUserMasked}</span>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Tham gia: {new Date(attr.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>

                <div className="text-right">
                  {attr.status === 'rewarded' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã nhận thưởng (+{attr.pointsEarned} pts)
                    </span>
                  ) : attr.status === 'qualified' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5" /> Đủ điều kiện (chờ duyệt)
                    </span>
                  ) : attr.status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                      Từ chối
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
                      <Clock className="w-3.5 h-3.5" /> Chờ đơn hàng đầu tiên
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

