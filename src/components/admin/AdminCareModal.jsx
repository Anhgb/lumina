import React, { useState, useEffect } from 'react';
import { fetchAdminCareDetail, updateAdminCareStatus, addAdminCareEvent } from '../../api/careService';

const VALID_STATUS_TRANSITIONS = {
  submitted: [
    { status: 'reviewing', label: 'Tiếp nhận xem xét' },
    { status: 'rejected', label: 'Từ chối hỗ trợ' },
    { status: 'closed', label: 'Đóng ticket' },
  ],
  reviewing: [
    { status: 'approved', label: 'Phê duyệt bảo hành/hỗ trợ' },
    { status: 'in_progress', label: 'Bắt đầu xử lý kỹ thuật' },
    { status: 'waiting_customer', label: 'Yêu cầu khách bổ sung' },
    { status: 'rejected', label: 'Từ chối hỗ trợ' },
    { status: 'closed', label: 'Đóng ticket' },
  ],
  waiting_customer: [
    { status: 'reviewing', label: 'Chuyển về xem xét' },
    { status: 'closed', label: 'Đóng ticket' },
  ],
  approved: [
    { status: 'in_progress', label: 'Bắt đầu xử lý kỹ thuật' },
    { status: 'closed', label: 'Đóng ticket' },
  ],
  in_progress: [
    { status: 'resolved', label: 'Đã giải quyết xong' },
    { status: 'waiting_customer', label: 'Chờ khách xác nhận' },
    { status: 'closed', label: 'Đóng ticket' },
  ],
  resolved: [
    { status: 'closed', label: 'Đóng hoàn tất' },
    { status: 'reviewing', label: 'Mở lại xem xét' },
  ],
  rejected: [
    { status: 'closed', label: 'Đóng hoàn tất' },
  ],
  closed: [],
};

export default function AdminCareModal({
  isOpen,
  onClose,
  ticketCode,
  onUpdated,
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [assignedTo, setAssignedTo] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isInternalOnly, setIsInternalOnly] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadTicket = async () => {
    if (!ticketCode) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminCareDetail(ticketCode);
      setTicket(res.data);
      setAssignedTo(res.data.assignedTo || '');
      setResolutionSummary(res.data.resolutionSummary || '');
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết ticket.');
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

  const handleStatusChange = async (nextStatus) => {
    try {
      setProcessing(true);
      await updateAdminCareStatus(ticketCode, {
        nextStatus,
        assignedTo: assignedTo.trim() || undefined,
        resolutionSummary: resolutionSummary.trim() || undefined,
        note: noteContent.trim() || undefined,
        isInternalOnly,
      });
      setNoteContent('');
      await loadTicket();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddEventOnly = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    try {
      setProcessing(true);
      await addAdminCareEvent(ticketCode, {
        content: noteContent.trim(),
        isInternalOnly,
      });
      setNoteContent('');
      await loadTicket();
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.message || 'Không thể thêm trao đổi.');
    } finally {
      setProcessing(false);
    }
  };

  const availableTransitions = ticket ? (VALID_STATUS_TRANSITIONS[ticket.status] || []) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-3xl bg-[#141413] border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A28] bg-[#1A1A18]">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-[#D4AF37] font-semibold">{ticketCode}</span>
              {ticket && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 uppercase">
                  {ticket.status}
                </span>
              )}
            </div>
            <p className="text-xs text-[#9E9E98] mt-0.5">Xử lý yêu cầu Lumina Care & Bảo hành</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9E9E98] hover:text-[#FAF8F5] hover:bg-[#2A2A28] rounded-lg transition"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#9E9E98]">
              Đang tải dữ liệu ticket...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-900/20 border border-red-500/40 rounded-xl text-red-300 text-xs">
              {error}
            </div>
          ) : ticket ? (
            <>
              {/* Customer & Order Metadata */}
              <div className="p-4 bg-[#1C1B18] border border-[#2A2A28] rounded-xl grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#6E6E68] block">Khách hàng:</span>
                  <span className="text-[#FAF8F5] font-medium">{ticket.customerName}</span>
                </div>
                <div>
                  <span className="text-[#6E6E68] block">Số điện thoại:</span>
                  <span className="text-[#FAF8F5]">{ticket.contactPhone || ticket.orderPhone}</span>
                </div>
                <div>
                  <span className="text-[#6E6E68] block">Mã đơn hàng:</span>
                  <span className="text-[#D4AF37] font-mono">{ticket.orderCode}</span>
                </div>
                <div>
                  <span className="text-[#6E6E68] block">Loại yêu cầu:</span>
                  <span className="text-[#FAF8F5]">{ticket.requestType}</span>
                </div>
                {ticket.productName && (
                  <div className="col-span-2 md:col-span-4 pt-2 border-t border-[#2A2A28]">
                    <span className="text-[#6E6E68]">Sản phẩm liên quan:</span>{' '}
                    <span className="text-[#FAF8F5] font-medium">{ticket.productName}</span>
                  </div>
                )}
              </div>

              {/* Problem Description */}
              <div className="p-4 bg-[#1C1B18] border border-[#2A2A28] rounded-xl space-y-1.5">
                <div className="text-xs font-semibold text-[#FAF8F5]">{ticket.title}</div>
                <div className="text-xs text-[#C5C5C0] leading-relaxed bg-[#141413] p-3 rounded-lg border border-[#2A2A28]">
                  {ticket.description}
                </div>
              </div>

              {/* State Machine Transition Controls */}
              <div className="p-4 bg-[#1C1B18] border border-[#D4AF37]/30 rounded-xl space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37] block">
                  Chuyển đổi trạng thái (State Machine)
                </span>

                {availableTransitions.length === 0 ? (
                  <p className="text-xs text-[#9E9E98] italic">
                    Ticket đã ở trạng thái kết thúc ({ticket.status}).
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTransitions.map((t) => (
                      <button
                        key={t.status}
                        type="button"
                        disabled={processing}
                        onClick={() => handleStatusChange(t.status)}
                        className="px-3.5 py-2 rounded-xl bg-[#2A2518] border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-medium hover:bg-[#D4AF37] hover:text-[#141413] transition disabled:opacity-50"
                      >
                        ➜ {t.label} ({t.status})
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[#C5C5C0] mb-1">
                      Kỹ thuật viên phụ trách (Assigned To)
                    </label>
                    <input
                      type="text"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="Ví dụ: KTV Tuấn, Specialist Hoàng"
                      className="w-full px-3 py-1.5 bg-[#141413] border border-[#2A2A28] rounded-lg text-xs text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#C5C5C0] mb-1">
                      Tóm tắt kết quả xử lý (Resolution Summary)
                    </label>
                    <input
                      type="text"
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      placeholder="Ví dụ: Đã siết bản lề và thay ve mũi mới"
                      className="w-full px-3 py-1.5 bg-[#141413] border border-[#2A2A28] rounded-lg text-xs text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              {/* Audit Event Stream */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9E9E98] mb-3">
                  Nhật ký xử lý & Trao đổi ({ticket.events?.length || 0})
                </h4>

                <div className="space-y-2.5">
                  {ticket.events?.map((evt) => (
                    <div
                      key={evt.id}
                      className={`p-3 rounded-xl text-xs border ${
                        evt.isInternalOnly
                          ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                          : evt.actorType === 'admin'
                          ? 'bg-[#2A2518] border-[#D4AF37]/30 text-[#FAF8F5]'
                          : evt.actorType === 'customer'
                          ? 'bg-[#1C1B18] border-blue-500/30 text-[#FAF8F5]'
                          : 'bg-[#1C1B18] border-[#2A2A28] text-[#9E9E98]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 text-[11px]">
                        <span className="font-semibold flex items-center gap-1.5">
                          {evt.isInternalOnly && (
                            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px] border border-amber-500/30">
                              🔒 NỘI BỘ
                            </span>
                          )}
                          <span>
                            {evt.actorType === 'admin'
                              ? `Admin/KTV (${evt.actorId})`
                              : evt.actorType === 'customer'
                              ? 'Khách hàng'
                              : 'Hệ thống'}
                          </span>
                        </span>
                        <span className="text-[#6E6E68]">
                          {new Date(evt.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap">{evt.content}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Note / Reply Form */}
              <form onSubmit={handleAddEventOnly} className="p-4 bg-[#1C1B18] border border-[#2A2A28] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#FAF8F5]">Thêm phản hồi hoặc ghi chú</span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={isInternalOnly}
                      onChange={(e) => setIsInternalOnly(e.target.checked)}
                      className="rounded bg-[#141413] border-[#2A2A28] text-[#D4AF37] focus:ring-0"
                    />
                    <span className={isInternalOnly ? 'text-amber-400 font-semibold' : 'text-[#9E9E98]'}>
                      🔒 Ghi chú nội bộ (Khách không xem được)
                    </span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={
                      isInternalOnly
                        ? 'Nhập ghi chú kỹ thuật nội bộ (ví dụ: cần đặt thêm linh kiện mã X)...'
                        : 'Nhập tin nhắn phản hồi công khai gửi tới khách hàng...'
                    }
                    className="flex-1 px-3 py-2 bg-[#141413] border border-[#2A2A28] rounded-lg text-xs text-[#FAF8F5] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="submit"
                    disabled={processing || !noteContent.trim()}
                    className="px-4 py-2 bg-[#D4AF37] text-[#141413] text-xs font-bold rounded-lg hover:brightness-110 transition disabled:opacity-50"
                  >
                    Lưu
                  </button>
                </div>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

