import React, { useState, useEffect } from 'react';
import { ShieldCheck, Bell, Sparkles, CheckCircle2, AlertCircle, RefreshCw, Mail, Smartphone, Info } from 'lucide-react';
import { getMyNotificationPreferences, updateMyNotificationPreferences } from '../../api/notificationService';

/**
 * PreferencesTab component
 * 
 * Authoritative notification & consent preferences manager conforming to Prompt 06.
 */
export default function PreferencesTab() {
  const [prefs, setPrefs] = useState({
    orderUpdatesInapp: true,
    orderUpdatesEmail: true,
    careRemindersInapp: true,
    careRemindersEmail: false,
    marketingInapp: false,
    marketingEmail: false,
    marketingSms: false,
    consentVersion: 'v1.0',
    consentSource: 'account_portal',
    consentUpdatedAt: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getMyNotificationPreferences();
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    } catch (err) {
      setErrorMsg('Không thể tải tùy chọn thông báo từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await updateMyNotificationPreferences(prefs, {
        source: 'my_lumina_portal_settings',
        version: 'v1.0',
      });
      if (res.success) {
        setPrefs(res.data);
        setSuccessMsg('Đã lưu tùy chọn nhận thông báo và ghi nhận thời điểm đồng thuận thành công!');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi lưu cài đặt.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-stone-500 bg-white rounded-2xl border border-stone-200">
        <RefreshCw className="w-6 h-6 animate-spin text-[#D4AF37] mx-auto mb-2" />
        <span className="text-xs">Đang tải tùy chọn quyền riêng tư...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-stone-200 gap-4">
          <div>
            <h3 className="font-brand text-xl text-stone-900">Tùy Chọn Nhận Thông Báo & Quyền Riêng Tư</h3>
            <p className="text-xs text-stone-500 mt-1">
              Lumina tuân thủ chặt chẽ tiêu chuẩn bảo vệ dữ liệu cá nhân. Quý khách có toàn quyền bật/tắt từng kênh.
            </p>
          </div>

          <div className="text-xs font-mono text-stone-400 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 self-start md:self-auto">
            Phiên bản Consent: <strong className="text-stone-700">{prefs.consentVersion || 'v1.0'}</strong>
          </div>
        </div>

        {successMsg && (
          <div className="my-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="my-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8 pt-6">
          {/* Group 1: Transactional */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Nhóm 1
              </span>
              <h4 className="font-brand text-base text-stone-900 font-semibold">
                Thông Báo Giao Dịch & Đơn Hàng (Bắt buộc dịch vụ)
              </h4>
            </div>
            <p className="text-xs text-stone-500">
              Cập nhật tiến độ tiếp nhận, nghệ nhân chế tác 3D, hành trình vận chuyển và kích hoạt quyền lợi bảo hành.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 cursor-pointer hover:border-stone-300 transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.orderUpdatesInapp}
                  onChange={() => handleToggle('orderUpdatesInapp')}
                  className="mt-0.5 rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-stone-900 block flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-stone-600" /> Hộp thư nội bộ (In-app)
                  </span>
                  <span className="text-stone-500 text-[11px] mt-0.5 block">
                    Hiển thị thông báo trên chuông thông báo trang web
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 cursor-pointer hover:border-stone-300 transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.orderUpdatesEmail}
                  onChange={() => handleToggle('orderUpdatesEmail')}
                  className="mt-0.5 rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-stone-900 block flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-stone-600" /> Thư điện tử (Email)
                  </span>
                  <span className="text-stone-500 text-[11px] mt-0.5 block">
                    Nhận biên lai và mã vận đơn điện tử qua email
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Group 2: Service Reminders */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-[#D4AF37]/15 text-[#141413] border border-[#D4AF37]/30">
                Nhóm 2
              </span>
              <h4 className="font-brand text-base text-stone-900 font-semibold">
                Lumina Care: Nhắc Nhở Bảo Dưỡng & Vệ Sinh Kính
              </h4>
            </div>
            <p className="text-xs text-stone-500">
              Nhắc định kỳ 6 tháng vệ sinh sóng siêu âm miễn phí và kiểm tra ốc ve kính theo chính sách Atelier.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 cursor-pointer hover:border-stone-300 transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.careRemindersInapp}
                  onChange={() => handleToggle('careRemindersInapp')}
                  className="mt-0.5 rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-stone-900 block flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#D4AF37]" /> Thông báo trong ứng dụng
                  </span>
                  <span className="text-stone-500 text-[11px] mt-0.5 block">
                    Nhắc nhở lịch kiểm tra kính khi đăng nhập tài khoản
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 cursor-pointer hover:border-stone-300 transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.careRemindersEmail}
                  onChange={() => handleToggle('careRemindersEmail')}
                  className="mt-0.5 rounded text-[#D4AF37] focus:ring-[#D4AF37]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-stone-900 block flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#D4AF37]" /> Email nhắc lịch
                  </span>
                  <span className="text-stone-500 text-[11px] mt-0.5 block">
                    Gửi thư mời ghé Atelier bảo dưỡng định kỳ
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Group 3: Marketing (Strict Consent) */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                Nhóm 3 (Cần đồng thuận)
              </span>
              <h4 className="font-brand text-base text-stone-900 font-semibold">
                Truyền Thông Ưu Đãi & Bộ Sưu Tập Mới
              </h4>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Chính sách không spam của Lumina:</strong> Mặc định tắt toàn bộ. Hệ thống chỉ gửi thông tin khi quý khách chủ động đồng thuận. Quý khách có thể hủy đăng ký (opt-out) bất cứ lúc nào.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 cursor-pointer hover:border-stone-300 transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.marketingInapp}
                  onChange={() => handleToggle('marketingInapp')}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-stone-900 block">In-App Thông Báo</span>
                  <span className="text-stone-500 text-[11px] mt-0.5 block">
                    Nhận banner ưu đãi & sự kiện
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 cursor-pointer hover:border-stone-300 transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.marketingEmail}
                  onChange={() => handleToggle('marketingEmail')}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-stone-900 block">Thư Điện Tử (Email)</span>
                  <span className="text-stone-500 text-[11px] mt-0.5 block">
                    BST kính độc bản & ưu đãi sinh nhật
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 cursor-pointer hover:border-stone-300 transition-colors">
                <input
                  type="checkbox"
                  checked={prefs.marketingSms}
                  onChange={() => handleToggle('marketingSms')}
                  className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-stone-900 block">Tin Nhắn (SMS)</span>
                  <span className="text-stone-500 text-[11px] mt-0.5 block">
                    Mã quà tặng sự kiện VIP
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Footer Save Button */}
          <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-[11px] text-stone-400 font-mono">
              {prefs.consentUpdatedAt &&
                `Cập nhật lần cuối: ${new Date(prefs.consentUpdatedAt).toLocaleString('vi-VN')}`}
            </span>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#141413] text-[#FAF8F5] hover:bg-[#2A2927] rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Đang lưu...' : 'Lưu Tùy Chọn Nhận Tin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

