import React, { useState } from 'react';
import { createCareRequest } from '../../api/careService';

export default function CreateCareRequestModal({
  isOpen,
  onClose,
  orders = [],
  initialOrderCode = null,
  onSuccess,
}) {
  const [selectedOrderCode, setSelectedOrderCode] = useState(initialOrderCode || (orders[0]?.orderCode || ''));
  const [selectedOrderItemId, setSelectedOrderItemId] = useState('');
  const [requestType, setRequestType] = useState('warranty_claim');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const currentOrder = orders.find(o => o.orderCode === selectedOrderCode);
  const orderItems = currentOrder?.items || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedOrderCode) {
      setError('Vui lòng chọn đơn hàng cần hỗ trợ.');
      return;
    }
    if (!title.trim()) {
      setError('Vui lòng nhập tóm tắt vấn đề.');
      return;
    }
    if (!description.trim()) {
      setError('Vui lòng mô tả chi tiết tình trạng sản phẩm.');
      return;
    }
    if (!contactPhone.trim()) {
      setError('Vui lòng nhập số điện thoại để chuyên viên Lumina liên hệ.');
      return;
    }

    try {
      setLoading(true);
      const res = await createCareRequest({
        orderCode: selectedOrderCode,
        orderItemId: selectedOrderItemId ? parseInt(selectedOrderItemId, 10) : null,
        requestType,
        title: title.trim(),
        description: description.trim(),
        contactPhone: contactPhone.trim(),
      });

      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể gửi phiếu yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-[#141413] border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A28] bg-[#1A1A18]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/30 text-[#D4AF37]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-serif text-[#FAF8F5]">Tạo Phiếu Yêu Cầu Lumina Care</h2>
              <p className="text-xs text-[#9E9E98]">Bảo hành chính hãng, cân chỉnh ve mũi và dịch vụ sau mua</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9E9E98] hover:text-[#FAF8F5] hover:bg-[#2A2A28] rounded-lg transition"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Policy Notice Callout */}
        <div className="px-6 py-3 bg-[#1C1B18] border-b border-[#2A2A28] text-xs text-[#C5A059] flex items-start gap-2.5">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-medium text-[#FAF8F5]">Chính sách đã duyệt:</span> Khung gọng bảo hành <strong>12 tháng</strong>, lớp phủ tròng <strong>06 tháng</strong>, bảo dưỡng ve mũi & vệ sinh siêu âm <strong>24 tháng</strong> kể từ ngày giao hàng. Kính Catalog đổi trả <strong>07 ngày</strong>. Kính 3D Bespoke hỗ trợ cân chỉnh & sửa chữa lỗi kỹ thuật.
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chọn đơn hàng */}
            <div>
              <label className="block text-xs font-medium text-[#C5C5C0] mb-1.5">
                Đơn hàng liên quan <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedOrderCode}
                onChange={(e) => {
                  setSelectedOrderCode(e.target.value);
                  setSelectedOrderItemId('');
                }}
                className="w-full px-3.5 py-2.5 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
                required
              >
                {orders.length === 0 ? (
                  <option value="">Chưa có đơn hàng nào</option>
                ) : (
                  orders.map((ord) => (
                    <option key={ord.orderCode} value={ord.orderCode}>
                      {ord.orderCode} — {new Date(ord.createdAt).toLocaleDateString('vi-VN')}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Chọn loại dịch vụ */}
            <div>
              <label className="block text-xs font-medium text-[#C5C5C0] mb-1.5">
                Loại dịch vụ hỗ trợ <span className="text-red-400">*</span>
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="warranty_claim">Bảo hành kỹ thuật / lỗi vật liệu (12T gọng, 6T tròng)</option>
                <option value="fit_adjustment">Cân chỉnh ve mũi & nắn độ vừa vặn (24T miễn phí)</option>
                <option value="deep_cleaning">Vệ sinh sóng siêu âm & siết ốc định kỳ (24T miễn phí)</option>
                <option value="repair_service">Dịch vụ sửa chữa / thay thế linh kiện</option>
                <option value="catalog_return">Yêu cầu đổi trả kính Catalog (trong 7 ngày)</option>
                <option value="usage_consultation">Tư vấn sử dụng & bảo quản chuyên sâu</option>
                <option value="other">Vấn đề khác</option>
              </select>
            </div>
          </div>

          {/* Chọn sản phẩm cụ thể nếu có */}
          {orderItems.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#C5C5C0] mb-1.5">
                Sản phẩm cụ thể trong đơn (tùy chọn)
              </label>
              <select
                value={selectedOrderItemId}
                onChange={(e) => setSelectedOrderItemId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="">Áp dụng cho toàn bộ đơn hàng</option>
                {orderItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.productName} (x{item.quantity})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tiêu đề tóm tắt */}
          <div>
            <label className="block text-xs font-medium text-[#C5C5C0] mb-1.5">
              Tiêu đề yêu cầu <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Gọng bị lỏng bản lề bên trái sau 2 tuần đeo"
              maxLength={150}
              className="w-full px-3.5 py-2.5 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
              required
            />
          </div>

          {/* Số điện thoại */}
          <div>
            <label className="block text-xs font-medium text-[#C5C5C0] mb-1.5">
              Số điện thoại liên hệ tiếp nhận <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Ví dụ: 0901234567"
              maxLength={20}
              className="w-full px-3.5 py-2.5 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
              required
            />
          </div>

          {/* Mô tả chi tiết */}
          <div>
            <label className="block text-xs font-medium text-[#C5C5C0] mb-1.5">
              Mô tả chi tiết tình trạng kính <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể biểu hiện lỗi, hoàn cảnh phát sinh hoặc mong muốn hỗ trợ để chuyên viên kỹ thuật chuẩn bị phương án tốt nhất..."
              maxLength={1000}
              className="w-full px-3.5 py-2.5 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37] resize-none"
              required
            />
            <div className="text-right text-[11px] text-[#6E6E68] mt-1">
              {description.length} / 1000 ký tự
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A2A28]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#2A2A28] text-sm text-[#FAF8F5] hover:bg-[#2A2A28] transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || orders.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-[#141413] font-medium text-sm hover:brightness-110 transition shadow-lg disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi Phiếu Yêu Cầu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

