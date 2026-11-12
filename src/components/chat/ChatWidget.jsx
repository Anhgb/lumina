import React from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import ChatWindow from './ChatWindow';
import { useChat } from '../../hooks/useChat';

export default function ChatWidget() {
  const { isOpen, toggleChat, unreadCount } = useChat();
  const location = useLocation();

  // Hide in admin portal to avoid obstructing management controls
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* 1. Main Chat Window */}
      <ChatWindow />

      {/* 2. Floating Launcher at bottom-right (24px edge distance) */}
      <div className={`fixed bottom-6 right-6 z-40 ${isOpen ? 'hidden sm:block' : 'block'}`}>
        <button
          type="button"
          onClick={toggleChat}
          title={isOpen ? 'Đóng Lumina Concierge' : 'Mở Lumina Concierge AI'}
          aria-label={isOpen ? 'Đóng Lumina Concierge' : 'Mở trợ lý Lumina Concierge'}
          className="group relative flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full bg-[#141413] text-[#FAF8F5] border border-[#D4AF37]/50 shadow-[0_6px_20px_rgba(20,20,19,0.3)] hover:shadow-[0_8px_25px_rgba(212,175,55,0.25)] hover:border-[#D4AF37] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer select-none"
        >
          {/* Subtle gold ambient glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#D4AF37]/15 via-transparent to-[#D4AF37]/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Avatar disc with star and status indicator */}
          <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#20201E] border border-[#D4AF37]/40 flex-shrink-0">
            {isOpen ? (
              <X className="w-3.5 h-3.5 text-[#D4AF37] transition-transform duration-200 group-hover:rotate-90" />
            ) : (
              <span className="font-brand font-bold text-xs text-[#D4AF37] group-hover:scale-110 transition-transform">
                ✦
              </span>
            )}

            {/* Online Status Indicator with dynamic pulse & moving radar ring */}
            {!isOpen && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5" title="Trực tuyến">
                <span className="animate-status-radar absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                <span className="animate-status-dot relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-1.5 ring-[#141413]" />
              </span>
            )}
          </div>

          {/* Labels */}
          <div className="flex flex-col text-left pr-1">
            <span className="font-brand text-[9.5px] font-bold tracking-[0.14em] uppercase text-[#FAF8F5] leading-none">
              LUMINA AI
            </span>
            <span className="text-[8px] text-[#A8A49C] tracking-tight mt-0.5">
              Personal Style Concierge
            </span>
          </div>

          {/* Unread badge count */}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#D4AF37] text-[#141413] font-bold text-[9px] rounded-full flex items-center justify-center shadow-md animate-bounce font-mono">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
