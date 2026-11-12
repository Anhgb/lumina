import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Package, ShieldCheck, Sparkles, Clock, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../api/notificationService';

/**
 * NotificationBell component with dropdown popover
 */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await getMyNotifications({ limit: 10 });
      if (res.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Quiet fail if not logged in
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (notif) => {
    if (!notif.isRead) {
      try {
        await markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.warn('Failed to mark read:', err);
      }
    }

    // Action routing if data present
    if (notif.data?.orderCode) {
      setIsOpen(false);
      navigate(`/account?tab=orders`);
    } else if (notif.data?.ticketCode) {
      setIsOpen(false);
      navigate(`/account?tab=care`);
    } else if (notif.data?.link) {
      setIsOpen(false);
      navigate(notif.data.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'transactional':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'service_reminder':
        return <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />;
      case 'marketing':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-stone-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2 text-[#141413] hover:text-[#D4AF37] transition-colors rounded-full"
        aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        title="Thông báo của bạn"
      >
        <Bell className="w-5 h-5 stroke-[1.8]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-[#141413] font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 animate-fade-in">
          {/* Header */}
          <div className="p-4 bg-[#141413] text-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-brand text-sm font-semibold text-[#FAF8F5]">Thông Báo</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#D4AF37] text-[#141413] font-bold">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-stone-300 hover:text-[#D4AF37] transition-colors flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-stone-400 text-xs">
                <Bell className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <span>Bạn không có thông báo nào.</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif)}
                  className={`p-3.5 hover:bg-stone-50 cursor-pointer transition-colors relative flex items-start gap-3 ${
                    !notif.isRead ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-stone-100 shrink-0 mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h5
                        className={`text-xs truncate ${
                          !notif.isRead ? 'font-bold text-stone-900' : 'font-medium text-stone-700'
                        }`}
                      >
                        {notif.title}
                      </h5>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#D4AF37] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5 leading-snug">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      {new Date(notif.createdAt).toLocaleDateString('vi-VN')} •{' '}
                      {new Date(notif.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          <div className="p-2.5 bg-stone-50 border-t border-stone-200 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/account?tab=preferences');
              }}
              className="text-[11px] text-stone-600 hover:text-stone-900 font-medium"
            >
              Cài đặt quyền thông báo & Bảo mật →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

