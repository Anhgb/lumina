import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  Package,
  Copy,
  Check,
  Sparkles,
  ShoppingBag,
  Building,
  ChevronRight,
  MapPin,
  Eye,
  FileText,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { checkoutOrder } from '../api/orderService';
import { getPaymentStatus, initiatePayment } from '../api/paymentService';

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Chưa thanh toán',
  pending: 'Đang chờ đối soát',
  paid: 'Đã xác minh thanh toán',
  failed: 'Giao dịch thất bại',
  refunded: 'Đã hoàn tiền',
};

function createIdempotencyKey() {
  return `web-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function readSavedOrder() {
  try {
    const saved = sessionStorage.getItem('lumina_last_order');
    if (!saved) return null;
    const order = JSON.parse(saved);
    if (!order || typeof order !== 'object') return null;
    // A browser-edited session value must never render a success state. Payment
    // status is restored from the backend after the payment code is checked.
    return { ...order, paymentStatus: order.paymentCode ? 'pending' : 'unpaid' };
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cartItems, totalPrice, totalCount, clearCart, showToast } = useCart();
  const navigate = useNavigate();
  const submissionLock = useRef(false);
  const paymentRequestLock = useRef(false);

  // Shipping details form
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: 'TP. Hồ Chí Minh',
    notes: '',
  });

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('cod'); // 'cod' | 'banking'

  // Prescription toggle & values
  const [hasPrescription, setHasPrescription] = useState(false);
  const [prescription, setPrescription] = useState({
    sphereOD: '-1.50',
    sphereOS: '-1.75',
    cylinderOD: '-0.50',
    cylinderOS: '-0.50',
    axisOD: '90',
    axisOS: '85',
    pd: '63',
  });

  // Voucher state
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState([]);
  const [confirmedOrder, setConfirmedOrder] = useState(readSavedOrder);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const saveConfirmedOrder = (order) => {
    setConfirmedOrder(order);
    try {
      sessionStorage.setItem('lumina_last_order', JSON.stringify(order));
    } catch {
      // The order remains on screen for this visit if browser storage is unavailable.
    }
  };

  const clearSavedConfirmation = () => {
    setConfirmedOrder(null);
    setPaymentError('');
    try {
      sessionStorage.removeItem('lumina_last_order');
    } catch {
      // Ignore storage errors; this only affects restoring the confirmation screen.
    }
  };

  useEffect(() => {
    if (!confirmedOrder?.paymentCode) return undefined;
    if (['paid', 'failed', 'refunded'].includes(confirmedOrder.paymentStatus)) {
      return undefined;
    }

    let cancelled = false;
    let timerId = null;
    const delays = [2000, 4000, 8000, 16000, 30000];
    let attempt = 0;

    const poll = async () => {
      try {
        const response = await getPaymentStatus(confirmedOrder.paymentCode);
        if (cancelled || !response?.success) return;
        const newStatus = response.data.status;
        const refreshedOrder = {
          ...confirmedOrder,
          paymentStatus: newStatus,
          paymentReference: response.data.reference || confirmedOrder.paymentReference,
        };
        saveConfirmedOrder(refreshedOrder);

        if (['paid', 'failed', 'refunded'].includes(newStatus)) {
          return;
        }
      } catch {
        // The last server-confirmed state remains visible when the status API is temporarily unavailable.
      }

      if (!cancelled) {
        const delay = delays[Math.min(attempt, delays.length - 1)];
        attempt += 1;
        timerId = setTimeout(poll, delay);
      }
    };

    timerId = setTimeout(poll, 2000);

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [confirmedOrder?.paymentCode, confirmedOrder?.paymentStatus]);

  const formatVND = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount || 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePrescriptionChange = (e) => {
    const { name, value } = e.target;
    setPrescription((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyVoucher = (e) => {
    e.preventDefault();
    setVoucherError('');
    const code = voucherInput.trim().toUpperCase();

    if (!code) {
      setVoucherError('Vui lòng nhập mã ưu đãi.');
      return;
    }

    if (code === 'LUMINA10') {
      if (totalPrice < 2000000) {
        setVoucherError('Mã LUMINA10 chỉ áp dụng cho đơn hàng từ 2.000.000 ₫');
        return;
      }
      const discount = Math.round(totalPrice * 0.1);
      setAppliedVoucher({
        code: 'LUMINA10',
        type: 'percent',
        discount,
        description: 'Giảm 10% đơn hàng cao cấp',
      });
      showToast('Áp dụng mã LUMINA10 thành công (-10%)', 'success');
    } else if (code === 'BESPOKE200') {
      const hasBespoke = cartItems.some((i) => i.productType === 'custom' || i.designSpec);
      if (!hasBespoke) {
        setVoucherError('Mã BESPOKE200 chỉ áp dụng cho đơn có kính 3D Bespoke');
        return;
      }
      setAppliedVoucher({
        code: 'BESPOKE200',
        type: 'fixed',
        discount: 200000,
        description: 'Giảm 200.000 ₫ kính 3D Bespoke',
      });
      showToast('Áp dụng mã BESPOKE200 thành công (-200.000 ₫)', 'success');
    } else if (code === 'FREESHIP') {
      setAppliedVoucher({
        code: 'FREESHIP',
        type: 'shipping',
        discount: 0,
        description: 'Miễn phí vận chuyển toàn quốc',
      });
      showToast('Áp dụng mã FREESHIP thành công', 'success');
    } else {
      setVoucherError('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherError('');
  };

  const estimatedDiscount = appliedVoucher?.discount || 0;
  const estimatedFinalTotal = Math.max(0, totalPrice - estimatedDiscount);

  // Submit checkout order to backend
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (isSubmitting || submissionLock.current) return;

    setSubmitError(null);
    setSubmitErrorDetails([]);

    // Check cart items
    if (cartItems.length === 0) {
      setSubmitError('Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.');
      return;
    }

    // Prescription optical validation (PRD 7.2)
    if (hasPrescription) {
      const rxErrors = [];
      const pd = parseFloat(prescription.pd);
      if (isNaN(pd) || pd < 50 || pd > 75) {
        rxErrors.push('Khoảng cách đồng tử (PD) phải nằm trong khoảng 50–75 mm.');
      }
      const cylOD = parseFloat(prescription.cylinderOD) || 0;
      const cylOS = parseFloat(prescription.cylinderOS) || 0;
      const axisOD = parseInt(prescription.axisOD, 10);
      const axisOS = parseInt(prescription.axisOS, 10);
      if (cylOD !== 0 && (isNaN(axisOD) || axisOD < 1 || axisOD > 180)) {
        rxErrors.push('Mắt phải có độ loạn (CYL) thì trục loạn (AXIS OD) phải từ 1° đến 180°.');
      }
      if (cylOS !== 0 && (isNaN(axisOS) || axisOS < 1 || axisOS > 180)) {
        rxErrors.push('Mắt trái có độ loạn (CYL) thì trục loạn (AXIS OS) phải từ 1° đến 180°.');
      }
      if (rxErrors.length > 0) {
        setSubmitError('Thông số toa kính không hợp lệ.');
        setSubmitErrorDetails(rxErrors);
        return;
      }
    }

    // Prepare payload conforming strictly to Backend API & PRD
    const payload = {
      customer: {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
      },
      items: cartItems.map((item) => ({
        productId: item.productId || item.id,
        id: item.id,
        productType: item.productType || (item.designSpec ? 'custom' : 'catalog'),
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        designSpec: item.designSpec || null,
        snapshotDataUrl:
          item.snapshotDataUrl || (item.image?.startsWith('data:') ? item.image : null),
        prescription: hasPrescription
          ? {
              isPrescriptionOrder: true,
              sphereOD: parseFloat(prescription.sphereOD) || 0,
              sphereOS: parseFloat(prescription.sphereOS) || 0,
              cylinderOD: parseFloat(prescription.cylinderOD) || 0,
              cylinderOS: parseFloat(prescription.cylinderOS) || 0,
              axisOD: parseInt(prescription.axisOD, 10) || 0,
              axisOS: parseInt(prescription.axisOS, 10) || 0,
              pd: parseFloat(prescription.pd) || 63,
            }
          : null,
      })),
      voucherCode: appliedVoucher?.code || null,
      paymentMethod,
      notes: formData.notes.trim(),
    };

    submissionLock.current = true;
    setIsSubmitting(true);

    try {
      const response = await checkoutOrder(payload);

      if (response && response.success) {
        const order = {
          ...response.data,
          paymentMethod,
          paymentStatus: response.data.paymentStatus || 'unpaid',
          paymentIdempotencyKey: createIdempotencyKey(),
          customer: response.data.customer || payload.customer,
        };
        clearCart();
        saveConfirmedOrder(order);
        showToast('Đặt hàng thành công! Đơn hàng đã được ghi nhận vào hệ thống.', 'success');

        if (paymentMethod === 'banking') {
          setIsInitiatingPayment(true);
          setPaymentError('');
          try {
            const paymentResponse = await initiatePayment({
              orderCode: order.orderCode,
              idempotencyKey: order.paymentIdempotencyKey,
            });
            if (paymentResponse?.success) {
              saveConfirmedOrder({
                ...order,
                paymentCode: paymentResponse.data.paymentCode,
                paymentStatus: paymentResponse.data.status,
                paymentAmount: paymentResponse.data.amount,
                paymentInstructions: paymentResponse.data.instructions,
              });
            }
          } catch (error) {
            setPaymentError(error.message || 'Chưa thể khởi tạo hướng dẫn chuyển khoản. Đơn hàng vẫn đã được tạo.');
          } finally {
            setIsInitiatingPayment(false);
          }
        }
      } else {
        throw new Error(response?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('[CheckoutPage] Order submission failed:', err);
      setSubmitError(err.message || 'Đã xảy ra lỗi trong quá trình xử lý đơn hàng.');
      if (Array.isArray(err.errors)) {
        setSubmitErrorDetails(err.errors);
      }
      showToast(err.message || 'Lỗi khi tạo đơn hàng.', 'error');
    } finally {
      setIsSubmitting(false);
      submissionLock.current = false;
    }
  };

  const handleRetryPayment = async () => {
    if (!confirmedOrder?.orderCode || isInitiatingPayment || paymentRequestLock.current) return;
    paymentRequestLock.current = true;
    setIsInitiatingPayment(true);
    setPaymentError('');
    const idempotencyKey =
      confirmedOrder.paymentStatus === 'failed' ? createIdempotencyKey() : confirmedOrder.paymentIdempotencyKey;
    try {
      const response = await initiatePayment({ orderCode: confirmedOrder.orderCode, idempotencyKey });
      if (response?.success) {
        saveConfirmedOrder({
          ...confirmedOrder,
          paymentIdempotencyKey: idempotencyKey,
          paymentCode: response.data.paymentCode,
          paymentStatus: response.data.status,
          paymentAmount: response.data.amount,
          paymentInstructions: response.data.instructions,
        });
      }
    } catch (error) {
      setPaymentError(error.message || 'Không thể khởi tạo lại thanh toán.');
    } finally {
      setIsInitiatingPayment(false);
      paymentRequestLock.current = false;
    }
  };

  const handleRefreshPaymentStatus = async () => {
    if (!confirmedOrder?.paymentCode) return;
    setPaymentError('');
    try {
      const response = await getPaymentStatus(confirmedOrder.paymentCode);
      if (response?.success) {
        saveConfirmedOrder({
          ...confirmedOrder,
          paymentStatus: response.data.status,
          paymentReference: response.data.reference || confirmedOrder.paymentReference,
        });
      }
    } catch (error) {
      setPaymentError(error.message || 'Không thể tải trạng thái thanh toán.');
    }
  };

  const handleCopyOrderCode = () => {
    if (confirmedOrder?.orderCode) {
      navigator.clipboard.writeText(confirmedOrder.orderCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      showToast('Đã sao chép mã đơn hàng vào clipboard.', 'info');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUCCESS CONFIRMATION SCREEN
  // ─────────────────────────────────────────────────────────────
  if (confirmedOrder) {
    return (
      <div className="min-h-[80vh] bg-[#FAF8F5] text-[#141413] py-16 px-4 sm:px-6 lg:px-8 font-body">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="bg-white border border-[#D6D3CD] p-8 sm:p-10 rounded-sm shadow-sm text-center space-y-4">
            <div className="w-16 h-16 bg-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-full mx-auto flex items-center justify-center text-[#D4AF37]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <div className="lumina-descriptor">ORDER CONFIRMED</div>
              <h1 className="font-display text-3xl sm:text-4xl font-light text-[#141413] tracking-tight">
                Cảm ơn bạn đã lựa chọn Lumina Eyewear
              </h1>
              <p className="text-xs sm:text-sm text-[#141413]/70 font-body max-w-lg mx-auto leading-relaxed">
                Đơn hàng của bạn đã được tiếp nhận và lưu an toàn vào cơ sở dữ liệu hệ thống. Nghệ nhân
                Lumina sẽ bắt đầu chế tác và kiểm định quang học theo tiêu chuẩn cao cấp nhất.
              </p>
            </div>

            {/* Order Code Callout Box */}
            <div className="max-w-md mx-auto bg-[#FAF8F5] border border-[#D6D3CD] rounded-sm p-4 flex items-center justify-between gap-4">
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/60 block mb-0.5">
                  Mã đơn hàng chính thức
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-[#141413] tracking-wider">
                  {confirmedOrder.orderCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyOrderCode}
                className="px-3.5 py-2 border border-[#141413] hover:bg-[#141413] hover:text-[#FAF8F5] transition-colors rounded-sm text-xs font-mono font-medium inline-flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Đã sao chép' : 'Sao chép mã'}</span>
              </button>
            </div>
          </div>

          {/* Order Details & Summary Card */}
          <div className="bg-white border border-[#D6D3CD] p-6 sm:p-8 rounded-sm shadow-sm space-y-6">
            <h2 className="font-display text-xl font-medium text-[#141413] border-b border-[#D6D3CD] pb-3.5 flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              <span>Thông tin đơn hàng đã xác nhận</span>
            </h2>

            {/* Verified Items List */}
            <div className="space-y-4">
              {confirmedOrder.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 py-3 border-b border-[#D6D3CD]/50 last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.snapshotPath ? (
                      <img
                        src={`http://localhost:3000${item.snapshotPath}`}
                        alt="3D Snapshot"
                        className="w-14 h-14 object-cover rounded-sm border border-[#D4AF37]/40 bg-[#FAF8F5]"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-[#FAF8F5] rounded-sm border border-[#D6D3CD] flex items-center justify-center">
                        <Package className="w-6 h-6 text-[#141413]/40" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body font-medium text-xs sm:text-sm text-[#141413] truncate">
                          {item.productName}
                        </span>
                        {item.productType === 'custom' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40 rounded">
                            ✦ 3D Bespoke
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#141413]/60 font-body block mt-0.5">
                        Số lượng: <strong className="font-semibold text-[#141413]">{item.quantity}</strong> ×{' '}
                        <span className="font-mono">{formatVND(item.unitPrice)}</span>
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-xs sm:text-sm text-[#141413]">
                    {formatVND(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="bg-[#FAF8F5] border border-[#D6D3CD]/70 p-5 rounded-sm space-y-2.5 text-xs font-body">
              <div className="flex justify-between text-[#141413]/70">
                <span>Tạm tính tiền hàng:</span>
                <span className="font-mono font-medium text-[#141413]">{formatVND(confirmedOrder.subtotalAmount)}</span>
              </div>
              {confirmedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-[#16A34A]">
                  <span>Ưu đãi áp dụng ({confirmedOrder.voucherCode}):</span>
                  <span className="font-mono font-semibold">-{formatVND(confirmedOrder.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#141413]/70">
                <span>Phí vận chuyển bảo hiểm:</span>
                <span className="font-medium text-[#141413]">0 ₫ (Miễn phí)</span>
              </div>
              <div className="pt-3 border-t border-[#D6D3CD] flex justify-between items-baseline">
                <span className="font-semibold text-sm uppercase tracking-wider text-[#141413]">
                  Tổng thanh toán:
                </span>
                <span className="font-mono text-2xl font-bold text-[#D4AF37]">
                  {formatVND(confirmedOrder.totalAmount)}
                </span>
              </div>
            </div>

            <section className="border border-[#D6D3CD] bg-[#FAF8F5] p-4 sm:p-5 rounded-sm space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/55">Trạng thái thanh toán</p>
                  <p className={`text-sm font-semibold mt-1 ${confirmedOrder.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {PAYMENT_STATUS_LABELS[confirmedOrder.paymentStatus] || PAYMENT_STATUS_LABELS.unpaid}
                  </p>
                </div>
                {confirmedOrder.paymentCode && (
                  <div className="text-right">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/55">Mã tham chiếu thanh toán</p>
                    <p className="font-mono text-xs font-semibold mt-1">{confirmedOrder.paymentCode}</p>
                  </div>
                )}
              </div>
              {confirmedOrder.paymentMethod === 'cod' ? (
                <p className="text-[11px] text-[#141413]/70">COD chưa được ghi nhận là đã thu. Trạng thái chỉ đổi sau khi Admin xác nhận thu tiền.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {confirmedOrder.paymentCode && (
                    <button type="button" onClick={handleRefreshPaymentStatus} className="px-3 py-1.5 border border-[#141413] text-[10px] font-semibold uppercase tracking-wider rounded-sm hover:bg-white">
                      Kiểm tra trạng thái
                    </button>
                  )}
                  {(!confirmedOrder.paymentCode || confirmedOrder.paymentStatus === 'failed' || paymentError) && (
                    <button type="button" onClick={handleRetryPayment} disabled={isInitiatingPayment} className="px-3 py-1.5 bg-[#141413] text-white text-[10px] font-semibold uppercase tracking-wider rounded-sm disabled:opacity-50">
                      {isInitiatingPayment ? 'Đang khởi tạo…' : confirmedOrder.paymentStatus === 'failed' ? 'Thử thanh toán lại' : 'Tạo lại hướng dẫn thanh toán'}
                    </button>
                  )}
                </div>
              )}
              {paymentError && <p role="alert" className="text-xs text-rose-700">{paymentError} Mã đơn {confirmedOrder.orderCode} vẫn được lưu.</p>}
            </section>

            {confirmedOrder.paymentMethod === 'banking' && (
              <section className="border border-[#D4AF37]/50 bg-[#D4AF37]/5 p-5 sm:p-6 rounded-sm space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-[#D4AF37] text-[#141413] flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF37] font-semibold">
                      Thanh toán chuyển khoản
                    </p>
                    <h3 className="font-display text-xl font-medium text-[#141413] mt-0.5">
                      Hướng dẫn chuyển khoản ngân hàng
                    </h3>
                    <p className="text-xs text-[#141413]/70 mt-1 font-body leading-relaxed">
                      {confirmedOrder.paymentInstructions || 'Quét mã QR bằng ứng dụng ngân hàng và chuyển khoản đúng số tiền đơn hàng.'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 items-center bg-white border border-[#D6D3CD] p-4 rounded-sm">
                  <img
                      src="/assets/vietqr-pham-van-the-anh.jpg"
                      alt="Mã QR thanh toán VietQR"
                    className="w-full max-w-[180px] mx-auto rounded-sm border border-[#D6D3CD]"
                  />
                  <dl className="space-y-3 text-xs sm:text-sm font-body">
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/55">Chủ tài khoản</dt>
                      <dd className="font-semibold text-[#141413] mt-0.5">PHAM VAN THE ANH</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/55">Số tài khoản</dt>
                      <dd className="font-mono text-base sm:text-lg font-bold text-[#141413] mt-0.5">688614122006</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/55">Số tiền cần chuyển</dt>
                      <dd className="font-mono text-xl sm:text-2xl font-bold text-[#D4AF37] mt-0.5">
                        {formatVND(confirmedOrder.totalAmount)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/55">Nội dung chuyển khoản</dt>
                      <dd className="font-mono text-xs font-bold bg-[#FAF8F5] border border-[#D6D3CD] px-3 py-1.5 inline-block mt-0.5 text-[#141413]">
                        {confirmedOrder.orderCode}
                      </dd>
                    </div>
                    {confirmedOrder.paymentCode && (
                      <div>
                        <dt className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/55">Mã giao dịch nội bộ</dt>
                        <dd className="font-mono text-xs font-bold mt-0.5">{confirmedOrder.paymentCode}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <p className="text-[11px] text-[#141413]/70 bg-[#FAF8F5] border border-[#D6D3CD] p-3 font-body leading-relaxed">
                  Lưu ý: Vui lòng ghi chính xác mã đơn hàng trong nội dung chuyển khoản để hệ thống đối soát và xác nhận thanh toán tự động nhanh nhất.
                </p>
              </section>
            )}

            {/* Customer & Shipping Destination Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs font-body text-[#141413]/80">
              <div className="space-y-1.5 bg-[#FAF8F5] p-4 rounded-sm border border-[#D6D3CD]/50">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/50 block">
                  Địa chỉ giao nhận
                </span>
                <p className="font-semibold text-[#141413] text-sm">{confirmedOrder.customer?.name}</p>
                <p className="text-xs text-[#141413]/80">{confirmedOrder.customer?.address}</p>
                <p className="text-xs text-[#141413]/80">{confirmedOrder.customer?.city}</p>
                <p className="font-mono text-xs text-[#141413]/60 pt-0.5">
                  ĐT: {confirmedOrder.customer?.phone}
                </p>
              </div>
              <div className="space-y-1.5 bg-[#FAF8F5] p-4 rounded-sm border border-[#D6D3CD]/50">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/50 block">
                  Phương thức thanh toán & Vận chuyển
                </span>
                <p className="font-semibold text-[#141413] text-sm">
                  {confirmedOrder.paymentMethod === 'cod'
                    ? 'Thanh toán tiền mặt khi nhận hàng (COD)'
                    : 'Chuyển khoản ngân hàng (VietQR)'}
                </p>
                <p className="text-xs text-[#141413]/70 flex items-center gap-1.5 pt-1">
                  <Truck className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Dự kiến giao: 2 – 4 ngày làm việc</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 flex flex-col sm:flex-row justify-center gap-3 border-t border-[#D6D3CD]">
              <Link
                to="/catalog"
                onClick={clearSavedConfirmation}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-semibold uppercase tracking-[0.2em] rounded-sm shadow-sm"
              >
                <span>Tiếp tục mua sắm</span>
              </Link>
              <Link
                to="/bespoke"
                onClick={clearSavedConfirmation}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-[#141413] text-[#141413] hover:bg-[#FAF8F5] transition-colors text-xs font-semibold uppercase tracking-[0.2em] rounded-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Thiết kế kính 3D mới</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // EMPTY CART SCREEN
  // ─────────────────────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#FAF8F5] text-[#141413] py-20 px-4 flex items-center justify-center font-body">
        <div className="max-w-md w-full text-center space-y-6 bg-white border border-[#D6D3CD] p-8 sm:p-10 rounded-sm shadow-sm">
          <div className="w-16 h-16 bg-[#FAF8F5] border border-[#D4AF37]/50 rounded-full mx-auto flex items-center justify-center text-[#D4AF37]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="lumina-descriptor">LUMINA ATELIER</div>
            <h1 className="font-display text-2xl sm:text-3xl font-light text-[#141413] tracking-tight">
              Giỏ hàng của bạn đang trống
            </h1>
            <p className="text-xs sm:text-sm text-[#141413]/70 font-body leading-relaxed">
              Vui lòng chọn ít nhất một mẫu kính từ Bộ sưu tập hoặc thiết kế kính 3D Bespoke trước khi tiến hành thanh toán.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] transition-colors text-xs font-semibold uppercase tracking-[0.2em] rounded-sm shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Khám phá Bộ sưu tập</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // STANDARD CHECKOUT FORM
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413] pb-24 font-body">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <ol className="flex items-center space-x-2 text-xs text-[#141413]/60 font-body">
          <li>
            <Link to="/" className="hover:text-[#D4AF37] transition-colors">
              Trang chủ
            </Link>
          </li>
          <ChevronRight className="w-3.5 h-3.5 text-[#141413]/40" />
          <li>
            <Link to="/cart" className="hover:text-[#D4AF37] transition-colors">
              Giỏ hàng
            </Link>
          </li>
          <ChevronRight className="w-3.5 h-3.5 text-[#141413]/40" />
          <li className="font-semibold text-[#141413] tracking-wide" aria-current="page">
            Thanh toán
          </li>
        </ol>
      </nav>

      {/* 2. Page Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 border-b border-[#D6D3CD]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="lumina-descriptor">CHECKOUT ATELIER</div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-light text-[#141413] tracking-tight">
              Thanh Toán & Xác Nhận Đơn Hàng
            </h1>
            <p className="text-xs sm:text-sm text-[#141413]/70 font-body max-w-2xl leading-relaxed">
              Kiểm tra thông tin giao nhận, thông số quang học và xác nhận giao dịch an toàn với Backend Lumina.
            </p>
          </div>

          {/* Authenticated Customer Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D4AF37]/50 text-xs font-medium text-[#141413] shadow-sm self-start sm:self-auto font-body">
            <UserCheck className="w-4 h-4 text-[#D4AF37]" />
            <span>Tài khoản: {user?.name || 'Khách hàng Lumina'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Global Error Banner */}
        {submitError && (
          <div className="bg-[#FEF2F2] border border-[#F87171] p-4 rounded-sm text-xs text-[#991B1B] space-y-2 mb-8 font-body">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-4 h-4 text-[#DC2626]" />
              <span>Không thể hoàn tất đơn hàng: {submitError}</span>
            </div>
            {submitErrorDetails.length > 0 && (
              <ul className="list-disc list-inside space-y-1 pl-2 text-[11px]">
                {submitErrorDetails.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={handleSubmitOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Customer Info, Prescriptions & Payment (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Customer & Shipping Information */}
              <div className="bg-white border border-[#D6D3CD] p-6 sm:p-7 rounded-sm shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-[#D6D3CD] pb-3.5">
                  <h2 className="font-display text-xl font-medium text-[#141413] flex items-center gap-2.5">
                    <MapPin className="w-5 h-5 text-[#D4AF37]" />
                    <span>1. Thông tin giao nhận hàng</span>
                  </h2>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#141413]/50">
                    Bắt buộc
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-body">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#141413]/80 mb-1.5">
                      Họ và tên người nhận <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Nguyễn Minh Anh"
                      className="w-full px-3.5 py-2.5 border border-[#D6D3CD] rounded-sm text-xs text-[#141413] bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#141413]/35"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#141413]/80 mb-1.5">
                      Số điện thoại liên hệ <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="0901234567"
                      className="w-full px-3.5 py-2.5 border border-[#D6D3CD] rounded-sm text-xs font-mono text-[#141413] bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#141413]/35"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#141413]/80 mb-1.5">
                      Địa chỉ email nhận hoá đơn <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="minhanh.nguyen@lumina.vn"
                      className="w-full px-3.5 py-2.5 border border-[#D6D3CD] rounded-sm text-xs text-[#141413] bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#141413]/35"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#141413]/80 mb-1.5">
                      Địa chỉ nhận hàng (Số nhà, tên đường, phường/xã){' '}
                      <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Tầng 18, Toà nhà Bitexco, 2 Hải Triều"
                      className="w-full px-3.5 py-2.5 border border-[#D6D3CD] rounded-sm text-xs text-[#141413] bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#141413]/35"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#141413]/80 mb-1.5">
                      Tỉnh / Thành phố <span className="text-[#DC2626]">*</span>
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 border border-[#D6D3CD] rounded-sm text-xs text-[#141413] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all bg-white"
                    >
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Bình Dương">Bình Dương</option>
                      <option value="Khác">Tỉnh / Thành phố khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#141413]/80 mb-1.5">
                      Ghi chú đơn hàng (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Giao giờ hành chính, gọi trước 30p..."
                      className="w-full px-3.5 py-2.5 border border-[#D6D3CD] rounded-sm text-xs text-[#141413] bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#141413]/35"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Prescription Lens Options (PRD 7.2) */}
              <div className="bg-white border border-[#D6D3CD] p-6 sm:p-7 rounded-sm shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#D6D3CD] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-5 h-5 text-[#D4AF37]" />
                    <h2 className="font-display text-xl font-medium text-[#141413]">
                      2. Cắt tròng theo đơn kính mắt (Prescription)
                    </h2>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold uppercase tracking-wider text-[#141413] font-body">
                    <input
                      type="checkbox"
                      checked={hasPrescription}
                      onChange={(e) => setHasPrescription(e.target.checked)}
                      className="rounded text-[#D4AF37] focus:ring-[#D4AF37] w-4 h-4"
                    />
                    <span>Yêu cầu độ cận/loạn</span>
                  </label>
                </div>

                {hasPrescription ? (
                  <div className="space-y-4 text-xs pt-1 font-body">
                    <p className="text-[#141413]/70 font-body text-[11px] leading-relaxed">
                      Nhập thông số mắt phải (OD), mắt trái (OS) và khoảng cách đồng tử (PD 50–75 mm)
                      từ toa khám mắt gần nhất của bạn.
                    </p>

                    <div className="grid grid-cols-4 gap-2.5 bg-[#FAF8F5] p-3.5 rounded-sm border border-[#D6D3CD]/60">
                      <div className="font-semibold text-xs text-[#141413]/60 uppercase tracking-wider">Mắt</div>
                      <div className="font-semibold text-xs text-[#141413]/60 uppercase tracking-wider text-center">
                        Độ cầu (SPH)
                      </div>
                      <div className="font-semibold text-xs text-[#141413]/60 uppercase tracking-wider text-center">
                        Độ trụ (CYL)
                      </div>
                      <div className="font-semibold text-xs text-[#141413]/60 uppercase tracking-wider text-center">
                        Trục loạn (AXIS)
                      </div>

                      <div className="font-semibold text-[#141413] flex items-center text-xs">Mắt Phải (OD)</div>
                      <div>
                        <input
                          type="text"
                          name="sphereOD"
                          value={prescription.sphereOD}
                          onChange={handlePrescriptionChange}
                          placeholder="-1.50"
                          className="w-full text-center py-1.5 border border-[#D6D3CD] rounded text-xs font-mono bg-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="cylinderOD"
                          value={prescription.cylinderOD}
                          onChange={handlePrescriptionChange}
                          placeholder="-0.50"
                          className="w-full text-center py-1.5 border border-[#D6D3CD] rounded text-xs font-mono bg-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="axisOD"
                          value={prescription.axisOD}
                          onChange={handlePrescriptionChange}
                          placeholder="90"
                          className="w-full text-center py-1.5 border border-[#D6D3CD] rounded text-xs font-mono bg-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>

                      <div className="font-semibold text-[#141413] flex items-center text-xs">Mắt Trái (OS)</div>
                      <div>
                        <input
                          type="text"
                          name="sphereOS"
                          value={prescription.sphereOS}
                          onChange={handlePrescriptionChange}
                          placeholder="-1.75"
                          className="w-full text-center py-1.5 border border-[#D6D3CD] rounded text-xs font-mono bg-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="cylinderOS"
                          value={prescription.cylinderOS}
                          onChange={handlePrescriptionChange}
                          placeholder="-0.50"
                          className="w-full text-center py-1.5 border border-[#D6D3CD] rounded text-xs font-mono bg-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="axisOS"
                          value={prescription.axisOS}
                          onChange={handlePrescriptionChange}
                          placeholder="85"
                          className="w-full text-center py-1.5 border border-[#D6D3CD] rounded text-xs font-mono bg-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-[#141413]/80 mb-1.5">
                          Khoảng cách đồng tử (PD: 50 – 75 mm){' '}
                          <span className="text-[#DC2626]">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="50"
                          max="75"
                          name="pd"
                          value={prescription.pd}
                          onChange={handlePrescriptionChange}
                          placeholder="63"
                          className="w-full px-3.5 py-2 border border-[#D6D3CD] rounded text-xs font-mono bg-white focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div className="flex-1 text-[11px] text-[#141413]/60 font-body leading-relaxed sm:pt-4">
                        Khoảng cách đồng tử chuẩn người trưởng thành Châu Á là 60–65 mm. Thông số này giúp tâm quang học tròng kính hội tụ chuẩn xác.
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#141413]/60 italic font-body">
                    Tròng kính mặc định: Tròng phẳng thời trang cao cấp không độ, chống tia UV400 và giảm ánh sáng xanh.
                  </p>
                )}
              </div>

              {/* Card 3: Payment Method */}
              <div className="bg-white border border-[#D6D3CD] p-6 sm:p-7 rounded-sm shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#D6D3CD] pb-3.5">
                  <h2 className="font-display text-xl font-medium text-[#141413] flex items-center gap-2.5">
                    <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                    <span>3. Phương thức thanh toán</span>
                  </h2>
                </div>

                <div className="space-y-3 font-body">
                  <label
                    className={`flex items-start gap-3.5 p-4 rounded-sm border cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-sm'
                        : 'border-[#D6D3CD] hover:border-[#141413]/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-0.5 text-[#D4AF37] focus:ring-[#D4AF37] w-4 h-4"
                    />
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[#141413]">
                        Thanh toán khi nhận hàng (COD)
                      </span>
                      <span className="text-[11px] text-[#141413]/70 font-body leading-relaxed block mt-0.5">
                        Khách hàng thanh toán tiền mặt trực tiếp cho nhân viên vận chuyển sau khi kiểm tra niêm phong sản phẩm.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3.5 p-4 rounded-sm border cursor-pointer transition-all ${
                      paymentMethod === 'banking'
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-sm'
                        : 'border-[#D6D3CD] hover:border-[#141413]/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="banking"
                      checked={paymentMethod === 'banking'}
                      onChange={() => setPaymentMethod('banking')}
                      className="mt-0.5 text-[#D4AF37] focus:ring-[#D4AF37] w-4 h-4"
                    />
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-[#141413]">
                        Chuyển khoản ngân hàng (Quét mã VietQR)
                      </span>
                      <span className="text-[11px] text-[#141413]/70 font-body leading-relaxed block mt-0.5">
                        Quét mã QR VietQR hoặc chuyển vào số tài khoản Lumina Eyewear với nội dung theo mã đơn hàng.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Order Items Review & Pricing Summary (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-[#D6D3CD] p-6 sm:p-7 rounded-sm shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-[#D6D3CD] pb-3.5">
                  <h2 className="font-display text-xl font-medium text-[#141413] flex items-center gap-2.5">
                    <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
                    <span>Chi tiết đơn hàng ({totalCount} sản phẩm)</span>
                  </h2>
                </div>

                {/* Items Mini List */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-2.5 border-b border-[#D6D3CD]/40 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.snapshotDataUrl || item.image}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-sm border border-[#D6D3CD]/60 bg-[#FAF8F5] flex-shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#141413] truncate font-body">{item.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-[#141413]/60 font-body mt-0.5">
                            <span>SL: {item.quantity}</span>
                            {item.productType === 'custom' && (
                              <span className="text-[#D4AF37] font-semibold">✦ 3D Bespoke</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-[#141413] flex-shrink-0">
                        {formatVND((item.price || 0) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Voucher Box */}
                <div className="pt-3 border-t border-[#D6D3CD] space-y-2 font-body">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#141413] block">
                    Mã ưu đãi (Voucher)
                  </span>
                  {appliedVoucher ? (
                    <div className="flex items-center justify-between p-3 bg-[#16A34A]/10 border border-[#16A34A]/30 rounded-sm text-xs">
                      <div>
                        <span className="font-mono font-bold text-[#16A34A] tracking-wider">
                          {appliedVoucher.code}
                        </span>
                        <span className="text-[11px] text-[#141413]/70 block mt-0.5">
                          {appliedVoucher.description}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="text-xs text-[#DC2626] hover:underline font-semibold"
                      >
                        Gỡ bỏ
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={voucherInput}
                        onChange={(e) => setVoucherInput(e.target.value)}
                        placeholder="LUMINA10 / BESPOKE200"
                        className="flex-1 px-3.5 py-2 border border-[#D6D3CD] rounded-sm text-xs font-mono uppercase text-[#141413] bg-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder:text-[#141413]/35 placeholder:font-body"
                      />
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                        className="px-4 py-2 bg-[#141413] text-[#FAF8F5] text-xs font-semibold uppercase tracking-wider rounded-sm hover:bg-[#D4AF37] hover:text-[#141413] transition-colors"
                      >
                        Áp dụng
                      </button>
                    </div>
                  )}
                  {voucherError && <p className="text-[11px] text-[#DC2626] font-medium">{voucherError}</p>}
                </div>

                {/* Pricing Summary Calculation */}
                <div className="pt-3 border-t border-[#D6D3CD] space-y-2.5 text-xs font-body">
                  <div className="flex justify-between text-[#141413]/70">
                    <span>Tạm tính tiền hàng:</span>
                    <span className="font-mono font-medium text-[#141413]">
                      {formatVND(totalPrice)}
                    </span>
                  </div>

                  {estimatedDiscount > 0 && (
                    <div className="flex justify-between text-[#16A34A]">
                      <span>Ưu đãi giảm giá ({appliedVoucher?.code}):</span>
                      <span className="font-mono font-semibold">-{formatVND(estimatedDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#141413]/70">
                    <span>Vận chuyển tiêu chuẩn:</span>
                    <span className="font-semibold text-[#141413]">Miễn phí</span>
                  </div>

                  <div className="pt-3 border-t border-[#D6D3CD] flex items-baseline justify-between">
                    <span className="font-semibold text-sm uppercase tracking-wider text-[#141413]">
                      Tổng thanh toán dự kiến:
                    </span>
                    <span className="font-mono text-2xl font-bold text-[#D4AF37] tracking-tight">
                      {formatVND(estimatedFinalTotal)}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#141413]/50 italic leading-relaxed">
                    * Giá cuối cùng được hệ thống kiểm tra và áp dụng bảo hiểm hàng hoá giá trị cao.
                  </p>
                </div>

                {/* Anti-Double-Click Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 bg-[#141413] text-[#FAF8F5] text-xs font-semibold uppercase tracking-[0.2em] rounded-sm flex items-center justify-center gap-2.5 shadow-md transition-all ${
                      isSubmitting
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:bg-[#D4AF37] hover:text-[#141413]'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Đang xử lý đơn hàng...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                        <span>Xác nhận & Đặt hàng</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Assurance details */}
                <div className="space-y-2 pt-2 text-[11px] text-[#141413]/70 font-body">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                    <span>Dữ liệu đơn hàng bảo mật và mã hoá tuyệt đối</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" />
                    <span>Kèm hộp quà cao cấp & khăn lau vi sợi Lumina</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
