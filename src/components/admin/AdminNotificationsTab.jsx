import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle2, AlertCircle, ShieldAlert, Sparkles, Filter, RefreshCw, Mail, Smartphone } from 'lucide-react';
import { getAdminNotificationLogs, sendAdminMarketingCampaign } from '../../api/notificationService';

/**
 * AdminNotificationsTab component
 * 
 * Delivery logs audit and marketing campaign dispatcher with strict consent gating.
 */
export default function AdminNotificationsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Campaign modal / form state
  const [campaignCode, setCampaignCode] = useState('CAMP-TRENDING-2026');
  const [campaignTitle, setCampaignTitle] = useState('Ra mắt BST Kính Mắt Trending 2026');
  const [campaignMessage, setCampaignMessage] = useState('Khám phá gọng kính Titanium độc bản tại Lumina Studio.');
  const [campaignLink, setCampaignLink] = useState('/catalog');
  const [sending, setSending] = useState(false);
  const [campaignResult, setCampaignResult] = useState(null);

  useEffect(() => {
    loadLogs();
  }, [channelFilter, statusFilter, page]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminNotificationLogs({
        channel: channelFilter,
        status: statusFilter,
        page,
        limit: 15,
      });
      if (res.success) {
        setLogs(res.data.logs || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError('Không thể tải nhật ký gửi thông báo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (e) => {
    e.preventDefault();
    if (!campaignCode || !campaignTitle || !campaignMessage) return;

    if (!window.confirm('Hệ thống sẽ lọc danh sách khách hàng đã đồng ý (Consent = true) và gửi thông báo. Bạn có chắc chắn?')) {
      return;
    }

    setSending(true);
    setCampaignResult(null);
    try {
      const res = await sendAdminMarketingCampaign({
        campaignCode: campaignCode.trim(),
        title: campaignTitle.trim(),
        message: campaignMessage.trim(),
        link: campaignLink.trim(),
      });
      setCampaignResult(res.data);
      loadLogs();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi gửi chiến dịch.');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã chuyển phát
          </span>
        );
      case 'skipped_no_consent':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Chặn: Chưa có consent
          </span>
        );
      case 'skipped_no_provider':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
            Bỏ qua: Chưa nối Provider ngoài
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-800">
            Thất bại
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Hàng đợi
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Sender Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          <h3 className="font-brand text-xl text-stone-900 font-semibold">
            Gửi Chiến Dịch Marketing (Kiểm Tra Consent Bắt Buộc)
          </h3>
        </div>
        <p className="text-xs text-stone-500 mb-4">
          Hệ thống tự động loại trừ mọi khách hàng chưa cấp quyền nhận tin (Consent = false).
        </p>

        {campaignResult && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
            <div className="font-bold flex items-center gap-1.5 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Kết quả phát chiến dịch:
            </div>
            <div>
              • Số khách hàng đủ điều kiện (có consent): <strong>{campaignResult.totalEligibleWithConsent}</strong>
            </div>
            <div>
              • Số thông báo đã gửi thành công: <strong>{campaignResult.sentCount}</strong>
            </div>
            <div>
              • Số lượt chặn do không có consent: <strong>{campaignResult.blockedCount}</strong>
            </div>
          </div>
        )}

        <form onSubmit={handleSendCampaign} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
              Mã chiến dịch
            </label>
            <input
              type="text"
              value={campaignCode}
              onChange={(e) => setCampaignCode(e.target.value)}
              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl font-mono focus:outline-none focus:border-[#D4AF37]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
              Đường dẫn liên kết (Link)
            </label>
            <input
              type="text"
              value={campaignLink}
              onChange={(e) => setCampaignLink(e.target.value)}
              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
              Tiêu đề thông báo
            </label>
            <input
              type="text"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-[#D4AF37]"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase text-stone-600 mb-1">
              Nội dung thông điệp
            </label>
            <textarea
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
              rows={2}
              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-[#D4AF37]"
              required
            />
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#2A2927] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
              {sending ? 'Đang gửi...' : 'Phát Chiến Dịch Đến Khách Hàng Có Consent'}
            </button>
          </div>
        </form>
      </div>

      {/* Delivery Logs Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-brand text-lg text-stone-900 font-semibold">
              Nhật Ký Chuyển Phát Thông Báo (Delivery Logs Audit)
            </h4>
            <p className="text-xs text-stone-500">
              Ghi nhận minh bạch trạng thái từng kênh; không giả lập gửi khi chưa kết nối provider ngoài.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-stone-700 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="all">Tất cả kênh</option>
              <option value="in_app">In-app</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-stone-700 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="delivered">Đã chuyển phát</option>
              <option value="skipped_no_consent">Bị chặn (Không có consent)</option>
              <option value="skipped_no_provider">Chưa có provider</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-stone-500">Đang tải nhật ký...</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-rose-600 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-stone-500">Không có nhật ký nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Kênh</th>
                    <th className="py-3 px-4">Người nhận</th>
                    <th className="py-3 px-4">Tiêu đề thông báo</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Nhà cung cấp / Phản hồi</th>
                    <th className="py-3 px-4 text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold uppercase text-stone-700">
                        {log.channel}
                      </td>
                      <td className="py-3 px-4 font-medium text-stone-900">
                        {log.recipient}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-stone-700">
                        {log.notification_title || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="py-3 px-4 text-stone-500 max-w-xs truncate text-[11px]">
                        {log.provider_response || log.provider_name}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap text-stone-400 font-mono">
                        {new Date(log.created_at).toLocaleDateString('vi-VN')} {new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

