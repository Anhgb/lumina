import React, { useState } from 'react';
import { confirmAdminOrderDelivery } from '../../api/careService';

export default function DeliveryModal({
  isOpen,
  onClose,
  orderCode,
  onSuccess,
}) {
  const [carrierName, setCarrierName] = useState('Lumina Express Delivery');
  const [trackingCode, setTrackingCode] = useState('');
  const [deliveredAt, setDeliveredAt] = useState(new Date().toISOString().slice(0, 16));
  const [proofNote, setProofNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !orderCode) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await confirmAdminOrderDelivery(orderCode, {
        carrierName: carrierName.trim(),
        trackingCode: trackingCode.trim() || undefined,
        deliveredAt: new Date(deliveredAt).toISOString(),
        proofNote: proofNote.trim() || undefined,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể xác nhận giao hàng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-[#141413] border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A28] bg-[#1A1A18]">
          <div>
            <h3 className="text-base font-serif text-[#FAF8F5]">Xác Nhận Giao Hàng & Bảo Hành</h3>
            <p className="text-xs text-[#D4AF37] font-mono mt-0.5">{orderCode}</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#9E9E98] hover:text-[#FAF8F5]">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/40 rounded-xl text-red-300">
              {error}
            </div>
          )}

          <div className="p-3 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-[#9E9E98] space-y-1">
            <span className="text-[#D4AF37] font-semibold block">Quy chuẩn DEC-DEL-001 & DEC-DEL-002:</span>
            <span>Việc xác nhận ngày giao hàng thực tế sẽ kích hoạt đồng hồ bảo hành (12T gọng, 6T tròng) và thời hạn đổi trả 7 ngày.</span>
          </div>

          <div>
            <label className="block text-[#C5C5C0] font-medium mb-1">Đơn vị vận chuyển</label>
            <input
              type="text"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              className="w-full px-3 py-2 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
              required
            />
          </div>

          <div>
            <label className="block text-[#C5C5C0] font-medium mb-1">Mã vận đơn (Tracking Code)</label>
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Ví dụ: VP-888999-VN, GHN-777123"
              className="w-full px-3 py-2 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-[#C5C5C0] font-medium mb-1">Thời điểm giao hàng thực tế</label>
            <input
              type="datetime-local"
              value={deliveredAt}
              onChange={(e) => setDeliveredAt(e.target.value)}
              className="w-full px-3 py-2 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
              required
            />
          </div>

          <div>
            <label className="block text-[#C5C5C0] font-medium mb-1">Ghi chú giao nhận / Bằng chứng</label>
            <input
              type="text"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="Ví dụ: Đã ký nhận và kiểm tra nguyên đai kiện Atelier"
              className="w-full px-3 py-2 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#2A2A28]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#2A2A28] rounded-xl text-[#FAF8F5] hover:bg-[#2A2A28]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#D4AF37] text-[#141413] font-bold rounded-xl hover:brightness-110 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Xác nhận giao hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

