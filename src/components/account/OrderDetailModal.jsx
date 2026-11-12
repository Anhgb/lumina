import React from 'react';
import { X, Calendar, Package, CreditCard, MapPin, Eye, Sparkles, CheckCircle2, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

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

const PLACEMENT_LABELS = {
  outer_temple: 'Mặt ngoài càng',
  inner_temple: 'Mặt trong càng',
  two_temples: 'Cả hai mặt',
};

export default function OrderDetailModal({ order, onClose, onOpenCareRequest }) {
  if (!order) return null;

  const statusConfig = STATUS_LABELS[order.status] || {
    label: order.status,
    color: 'bg-neutral-100 text-neutral-800 border-neutral-300',
  };

  const isPaid = order.paymentStatus === 'paid';
  const formatVND = (num) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div
        className="bg-[#FAF8F5] border border-[#D6D3CD] rounded-sm max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#141413] text-[#FAF8F5] flex items-center justify-between border-b border-[#D4AF37]/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-xs uppercase tracking-widest text-[#D4AF37] font-mono">
                Chi tiết đơn hàng Lumina
              </span>
            </div>
            <h3 className="font-brand font-bold text-lg tracking-wider text-[#FAF8F5] flex items-center gap-2">
              {order.orderCode}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-5 py-3 bg-white border-b border-[#D6D3CD] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#141413]/60 font-body">Trạng thái đơn:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#141413]/60 font-body">Thanh toán:</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {isPaid ? '✓ Đã thanh toán' : 'Chưa thanh toán (COD)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[#141413]/60 font-mono text-[11px]">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-grow">
          {/* Section 1: Product Items */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider font-bold text-[#141413] mb-3 flex items-center gap-1.5">
              <span>Sản phẩm trong đơn</span>
              <span className="text-[#141413]/50">({order.items?.length || 0} mục)</span>
            </h4>

            <div className="space-y-3">
              {order.items?.map((item, idx) => {
                const spec = item.customSpec;
                const isCustom = item.productType === 'custom' || Boolean(spec);

                return (
                  <div
                    key={item.id || idx}
                    className="p-3.5 bg-white rounded border border-[#D6D3CD] shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        {/* Thumbnail / Snapshot */}
                        {spec?.snapshotPath ? (
                          <div className="relative w-16 h-16 rounded bg-[#FAF8F5] border border-[#D4AF37]/40 flex-shrink-0 overflow-hidden group">
                            <img
                              src={
                                spec.snapshotPath.startsWith('http')
                                  ? spec.snapshotPath
                                  : `http://localhost:3000${spec.snapshotPath}`
                              }
                              alt={item.productName}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded bg-[#FAF8F5] border border-[#D6D3CD] flex-shrink-0 flex items-center justify-center text-[#141413]/30">
                            <Package className="w-6 h-6" />
                          </div>
                        )}

                        {/* Title & Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-brand font-bold text-sm text-[#141413]">
                              {item.productName}
                            </h5>
                            {isCustom && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#D4AF37] text-[#141413] font-bold rounded">
                                ✦ 3D Bespoke
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#141413]/60 font-body">
                            Số lượng: <strong className="font-mono text-[#141413]">{item.quantity}</strong> ×{' '}
                            <span className="font-mono">{formatVND(item.unitPrice)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-[#141413]">
                          {formatVND(item.subtotal)}
                        </span>
                      </div>
                    </div>

                    {/* 3D Custom Specs Details */}
                    {isCustom && spec && (
                      <div className="p-3 bg-[#FAF8F5] rounded border border-[#D4AF37]/30 text-xs space-y-2">
                        <div className="font-mono text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          <span>Chi tiết tùy biến độc bản</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <span className="text-[#141413]/50 block">Dáng gọng:</span>
                            <strong className="capitalize">{spec.baseModel}</strong>
                          </div>
                          <div>
                            <span className="text-[#141413]/50 block">Màu sắc:</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/20"
                                style={{ backgroundColor: spec.frameColor }}
                              />
                              <span className="font-mono">{spec.frameColor}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[#141413]/50 block">Kiểu càng:</span>
                            <strong>{TEMPLE_STYLE_LABELS[spec.templeStyle] || spec.templeStyle}</strong>
                          </div>

                          {spec.hasRhinestones && (
                            <div>
                              <span className="text-[#141413]/50 block">Đá Swarovski:</span>
                              <strong className="text-[#D4AF37]">Có đính đá</strong>
                            </div>
                          )}

                          {spec.charms?.length > 0 && (
                            <div>
                              <span className="text-[#141413]/50 block">Charms:</span>
                              <strong>{spec.charms.join(', ')}</strong>
                            </div>
                          )}

                          {spec.engravingText && (
                            <div className="sm:col-span-2">
                              <span className="text-[#141413]/50 block">Chữ khắc Laser:</span>
                              <strong className="font-mono text-[#D4AF37]">
                                &quot;{spec.engravingText}&quot;{' '}
                                <span className="font-sans font-normal text-[#141413]/60">
                                  ({PLACEMENT_LABELS[spec.engravingPlacement] || 'Mặt ngoài'})
                                </span>
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Prescription Details (Protected View) */}
                    {item.prescription && item.prescription.isPrescriptionOrder && (
                      <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-xs space-y-1">
                        <div className="font-mono text-[10px] uppercase font-bold text-blue-900 tracking-wider">
                          ✦ Toa kính thuốc đã gắn kèm
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px] text-[#141413]/80">
                          <div>
                            Mắt phải (OD): SPH {item.prescription.sphereOD}, CYL {item.prescription.cylinderOD}
                          </div>
                          <div>
                            Mắt trái (OS): SPH {item.prescription.sphereOS}, CYL {item.prescription.cylinderOS}
                          </div>
                          <div>
                            Khoảng cách đồng tử (PD): <strong>{item.prescription.pd} mm</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Shipping Destination & Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipping Info */}
            <div className="p-4 bg-white rounded border border-[#D6D3CD] space-y-2 text-xs">
              <h5 className="font-mono uppercase font-bold text-[#141413] tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Địa chỉ nhận hàng</span>
              </h5>
              <div className="space-y-1 text-[#141413]/80 font-body">
                <p className="font-semibold text-[#141413]">{order.customerName}</p>
                <p>SĐT: <span className="font-mono">{order.customerPhone}</span></p>
                <p>Email: {order.customerEmail}</p>
                <p>{order.shippingAddress}, {order.shippingCity}</p>
                {order.orderNotes && (
                  <p className="text-[11px] text-[#141413]/60 italic mt-1">
                    Ghi chú: &quot;{order.orderNotes}&quot;
                  </p>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 bg-white rounded border border-[#D6D3CD] space-y-2 text-xs">
              <h5 className="font-mono uppercase font-bold text-[#141413] tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Tổng kết thanh toán</span>
              </h5>
              <div className="space-y-1.5 font-body">
                <div className="flex justify-between">
                  <span className="text-[#141413]/60">Tạm tính:</span>
                  <span className="font-mono">{formatVND(order.subtotalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#141413]/60">Phí vận chuyển:</span>
                  <span className="font-mono">
                    {order.shippingFee === 0 ? 'Miễn phí' : formatVND(order.shippingFee)}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Giảm giá ({order.voucherCode || 'Ưu đãi'}):</span>
                    <span className="font-mono">-{formatVND(order.discountAmount)}</span>
                  </div>
                )}
                <div className="border-t border-[#D6D3CD] pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-[#141413]">Tổng thanh toán:</span>
                  <span className="font-mono font-bold text-base text-[#D4AF37]">
                    {formatVND(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: After-sales Action Banner */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#D4AF37]/40 rounded flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#141413]">Bạn cần bảo hành hoặc hỗ trợ cho đơn này?</p>
                <p className="text-[#141413]/60 text-[11px]">
                  Dịch vụ vệ sinh siêu âm, cân chỉnh ve mũi và bảo dưỡng độc bản tại Lumina Care.
                </p>
              </div>
            </div>
            {onOpenCareRequest && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCareRequest(order);
                }}
                className="whitespace-nowrap px-3 py-1.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors rounded text-xs font-semibold"
              >
                Gửi yêu cầu Lumina Care
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#D6D3CD] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#141413] text-[#FAF8F5] hover:bg-[#141413]/80 transition-colors rounded-sm text-xs font-semibold uppercase tracking-wider"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

