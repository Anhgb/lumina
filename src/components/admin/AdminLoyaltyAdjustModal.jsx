import React, { useState } from 'react';
import { X, Award, AlertCircle, CheckCircle2 } from 'lucide-react';
import { adminAdjustPoints } from '../../api/loyaltyService';

export default function AdminLoyaltyAdjustModal({ isOpen, onClose, user, onUpdated }) {
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts === 0) {
      setError('Số điểm điều chỉnh phải khác 0 (dương để cộng, âm để trừ).');
      return;
    }

    if (!reason || reason.trim().length < 5) {
      setError('Lý do điều chỉnh là bắt buộc và phải có ít nhất 5 ký tự.');
      return;
    }

    if (pts < 0 && Math.abs(pts) > user.availablePoints) {
      setError(`Không thể trừ điểm khiến số dư bị âm (Hiện có: ${user.availablePoints} pts, muốn trừ: ${Math.abs(pts)} pts).`);
      return;
    }

    setLoading(true);
    try {
      await adminAdjustPoints(user.userId, {
        points: pts,
        reason: reason.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        onUpdated?.();
        onClose();
      }, 1200);
    } catch (err) {
      console.error('[AdminLoyaltyAdjustModal] Error:', err);
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi điều chỉnh điểm.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-[#D6D3CD] animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-[#141413] text-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-brand font-bold text-base">Điều Chỉnh Điểm Hội Viên</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User Info Card */}
          <div className="p-3 bg-[#FAF8F5] border border-[#D6D3CD] rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-[#141413]/60">Hội viên:</span>
              <span className="font-mono font-bold text-[#141413]">{user.userId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#141413]/60">Hạng hiện tại:</span>
              <span className="font-semibold uppercase text-[#D4AF37]">{user.tierName || user.currentTier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#141413]/60">Điểm khả dụng:</span>
              <span className="font-mono font-bold text-emerald-700">{user.availablePoints} pts</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Điều chỉnh điểm thành công và đã ghi vào sổ cái audit!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#141413] mb-1">
              Số điểm điều chỉnh (+ hoặc -) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Ví dụ: 50 (cộng) hoặc -20 (trừ)"
              className="w-full px-3 py-2 text-xs border border-[#D6D3CD] rounded focus:border-[#D4AF37] focus:outline-none font-mono"
              required
            />
            <p className="text-[11px] text-[#141413]/50 mt-1">
              Nhập số dương để tặng thêm điểm, số âm để khấu trừ. Không được làm âm số dư khả dụng.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#141413] mb-1">
              Lý do điều chỉnh (Bắt buộc ghi sổ audit) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nêu rõ lý do (ví dụ: Đền bù trải nghiệm dịch vụ, Tặng quà sinh nhật VIP...)"
              className="w-full px-3 py-2 text-xs border border-[#D6D3CD] rounded focus:border-[#D4AF37] focus:outline-none"
              required
            />
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#D6D3CD]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-[#D6D3CD] text-[#141413] text-xs font-semibold rounded hover:bg-[#FAF8F5] transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-4 py-2 bg-[#141413] text-[#FAF8F5] text-xs font-semibold rounded hover:bg-[#D4AF37] hover:text-[#141413] transition disabled:opacity-50"
            >
              {loading ? 'Đang ghi nhận...' : 'Xác nhận điều chỉnh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

