import React, { useState, useEffect } from 'react';
import { fetchMyCareRequestDetail, sendCustomerCareMessage, rateCareRequest } from '../../api/careService';

export default function CareTicketDetailModal({
  isOpen,
  onClose,
  ticketCode,
  onUpdated,
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  const loadTicket = async () => {
    if (!ticketCode) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMyCareRequestDetail(ticketCode);
      setTicket(res.data);
      if (res.data.customerRating) {
        setRating(res.data.customerRating);
        setFeedback(res.data.customerFeedback || '');
      }
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết phiếu hỗ trợ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ticketCode) {
      loadTicket();
    }
  }, [isOpen, ticketCode]);

  if (!isOpen) return null;

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    try {
      setSendingReply(true);
      await sendCustomerCareMessage(ticketCode, replyMessage.trim());
      setReplyMessage('');
      await loadTicket();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message || 'Không thể gửi phản hồi.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleRate = async (e) => {
    e.preventDefault();
    try {
      setSubmittingRating(true);
      await rateCareRequest(ticketCode, { rating, feedback: feedback.trim() });
      setRatingSuccess(true);
      await loadTicket();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message || 'Không thể gửi đánh giá.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      submitted: { label: 'Đã tiếp nhận', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
      reviewing: { label: 'Đang xem xét', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
      waiting_customer: { label: 'Cần bổ sung thông tin', bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
      approved: { label: 'Đã phê duyệt', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
      in_progress: { label: 'Đang xử lý kỹ thuật', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
      resolved: { label: 'Đã giải quyết', bg: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30' },
      rejected: { label: 'Từ chối hỗ trợ', bg: 'bg-red-500/10 text-red-400 border-red-500/30' },
      closed: { label: 'Đã hoàn tất / Đóng', bg: 'bg-gray-500/10 text-gray-400 border-gray-500/30' },
    };
    const current = map[status] || { label: status, bg: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${current.bg}`}>
        {current.label}
      </span>
    );
  };

  const getRequestTypeLabel = (type) => {
    const map = {
      warranty_claim: 'Bảo hành kỹ thuật / lỗi vật liệu',
      fit_adjustment: 'Cân chỉnh ve mũi & độ vừa vặn',
      deep_cleaning: 'Vệ sinh sóng siêu âm & bảo dưỡng',
      repair_service: 'Sửa chữa & thay thế linh kiện',
      usage_consultation: 'Tư vấn sử dụng & bảo quản',
      catalog_return: 'Đổi trả kính Catalog (7 ngày)',
      other: 'Vấn đề khác',
    };
    return map[type] || type;
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif text-[#FAF8F5]">{ticketCode}</h2>
                {ticket && getStatusBadge(ticket.status)}
              </div>
              <p className="text-xs text-[#9E9E98]">
                {ticket ? getRequestTypeLabel(ticket.requestType) : 'Chi tiết phiếu yêu cầu'}
              </p>
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

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#9E9E98]">
              Đang tải dữ liệu phiếu yêu cầu...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/20 border border-red-500/40 rounded-xl text-red-300 text-xs">
              {error}
            </div>
          ) : ticket ? (
            <>
              {/* Ticket Overview Card */}
              <div className="p-4 bg-[#1C1B18] border border-[#2A2A28] rounded-xl space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2 text-[#9E9E98]">
                  <div>
                    <span className="text-[#6E6E68]">Mã đơn hàng:</span>{' '}
                    <span className="text-[#FAF8F5] font-medium">{ticket.orderCode}</span>
                  </div>
                  <div>
                    <span className="text-[#6E6E68]">Ngày gửi:</span>{' '}
                    <span className="text-[#FAF8F5]">{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  {ticket.productName && (
                    <div className="col-span-2">
                      <span className="text-[#6E6E68]">Sản phẩm:</span>{' '}
                      <span className="text-[#D4AF37]">{ticket.productName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[#6E6E68]">Số điện thoại:</span>{' '}
                    <span className="text-[#FAF8F5]">{ticket.contactPhone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2A2A28]">
                  <div className="font-medium text-[#FAF8F5] mb-1">{ticket.title}</div>
                  <div className="text-[#C5C5C0] leading-relaxed bg-[#141413] p-3 rounded-lg border border-[#2A2A28]">
                    {ticket.description}
                  </div>
                </div>

                {ticket.resolutionSummary && (
                  <div className="pt-2 border-t border-[#2A2A28] bg-[#D4AF37]/5 p-3 rounded-lg border border-[#D4AF37]/20">
                    <span className="font-semibold text-[#D4AF37]">Kết quả xử lý từ chuyên viên:</span>
                    <p className="text-[#FAF8F5] mt-1">{ticket.resolutionSummary}</p>
                  </div>
                )}
              </div>

              {/* Message Thread */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E98] mb-3">
                  Tiến độ & Trao đổi ({ticket.events?.length || 0})
                </h3>

                <div className="space-y-3">
                  {ticket.events?.map((evt) => {
                    const isCustomer = evt.actorType === 'customer';
                    const isSystem = evt.actorType === 'system';
                    return (
                      <div
                        key={evt.id}
                        className={`p-3.5 rounded-xl text-xs border ${
                          isSystem
                            ? 'bg-[#1C1B18] border-[#2A2A28] text-[#9E9E98] italic'
                            : isCustomer
                            ? 'bg-[#1C1B18] border-[#D4AF37]/30 text-[#FAF8F5] ml-4'
                            : 'bg-[#2A2518] border-[#D4AF37]/40 text-[#FAF8F5] mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 text-[11px] text-[#9E9E98]">
                          <span className="font-medium text-[#D4AF37]">
                            {isCustomer ? 'Quý khách' : isSystem ? 'Hệ thống Lumina' : 'Chuyên viên Lumina Care'}
                          </span>
                          <span>{new Date(evt.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="leading-relaxed whitespace-pre-wrap">{evt.content}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Form (if ticket is not closed) */}
              {ticket.status !== 'closed' && ticket.status !== 'rejected' && (
                <form onSubmit={handleSendReply} className="pt-3 border-t border-[#2A2A28] space-y-2.5">
                  <label className="block text-xs font-medium text-[#C5C5C0]">
                    Gửi phản hồi / Bổ sung thông tin
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Nhập thông tin bổ sung cho chuyên viên kỹ thuật..."
                      maxLength={500}
                      className="flex-1 px-3.5 py-2.5 bg-[#1C1B18] border border-[#2A2A28] rounded-xl text-sm text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !replyMessage.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#D4AF37] text-[#141413] text-xs font-semibold hover:brightness-110 transition disabled:opacity-50"
                    >
                      {sendingReply ? '...' : 'Gửi'}
                    </button>
                  </div>
                </form>
              )}

              {/* Rating Section (when resolved or closed) */}
              {(ticket.status === 'resolved' || ticket.status === 'closed') && (
                <div className="p-4 bg-[#1C1B18] border border-[#D4AF37]/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#FAF8F5]">Đánh giá chất lượng hỗ trợ</span>
                    {ratingSuccess && <span className="text-xs text-emerald-400">✓ Đã ghi nhận</span>}
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-xl transition ${star <= rating ? 'text-[#D4AF37]' : 'text-gray-600 hover:text-gray-400'}`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs text-[#9E9E98] ml-2">{rating} / 5 sao</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Ý kiến góp ý để Lumina phục vụ tốt hơn (tùy chọn)..."
                      maxLength={300}
                      className="flex-1 px-3 py-2 bg-[#141413] border border-[#2A2A28] rounded-xl text-xs text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={handleRate}
                      disabled={submittingRating}
                      className="px-3.5 py-2 rounded-xl border border-[#D4AF37]/50 text-[#D4AF37] text-xs hover:bg-[#D4AF37]/10 transition disabled:opacity-50"
                    >
                      {submittingRating ? '...' : 'Đánh giá'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

