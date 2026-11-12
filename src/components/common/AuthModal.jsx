import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from '../auth/LoginForm';
import RegisterForm from '../auth/RegisterForm';
import ForgotPasswordForm from '../auth/ForgotPasswordForm';
import SuccessScreen from '../auth/SuccessScreen';
import BrandPanel from '../auth/BrandPanel';

/* ─── View titles & subtitles ─── */
const VIEW_META = {
  login: {
    title: 'Chào mừng trở lại',
    subtitle: 'Đăng nhập để lưu cấu hình kính và theo dõi đơn hàng.',
  },
  register: {
    title: 'Tạo tài khoản',
    subtitle: 'Trải nghiệm mua sắm kính cao cấp được cá nhân hóa.',
  },
  forgot: {
    title: 'Đặt lại mật khẩu',
    subtitle: '',
  },
  success: {
    title: '',
    subtitle: '',
  },
};

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authView } = useAuth();
  const firstFocusable = useRef(null);
  const triggerRef = useRef(null);
  const overlayRef = useRef(null);
  const panelRef = useRef(null);

  /* ── Save trigger element for focus restoration ── */
  useEffect(() => {
    if (isAuthModalOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isAuthModalOpen]);

  /* ── Focus trap + Escape key ── */
  useEffect(() => {
    if (!isAuthModalOpen) return;

    // Lock scroll
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;

    // Autofocus first focusable inside panel
    const timer = setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable[0]) focusable[0].focus();
    }, 50);

    // Keyboard handler
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        closeAuthModal();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener('keydown', handleKey);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      // Restore focus to trigger
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [isAuthModalOpen, closeAuthModal]);

  /* ── Click outside ── */
  const handleOverlayClick = useCallback(
    (e) => {
      if (e.target === overlayRef.current) closeAuthModal();
    },
    [closeAuthModal]
  );

  if (!isAuthModalOpen) return null;

  const meta = VIEW_META[authView] || VIEW_META.login;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6
        bg-[#141414]/70 backdrop-blur-[6px] transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* ── Modal panel ── */}
      <div
        ref={panelRef}
        className="relative w-full max-w-[900px] bg-[#F8F6F1] rounded-2xl shadow-2xl overflow-hidden
          flex flex-col md:flex-row
          animate-modal-enter
          max-h-[95vh] md:max-h-[90vh]"
        role="document"
      >
        {/* ── Left: brand panel (hidden on mobile <768px) ── */}
        <div className="hidden md:block md:w-[42%] flex-shrink-0">
          <BrandPanel />
        </div>

        {/* ── Right: form panel ── */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-[#FFFFFF] md:rounded-r-2xl">
          {/* Close button */}
          <div className="flex justify-end p-4 pb-0 flex-shrink-0">
            <button
              type="button"
              onClick={closeAuthModal}
              className="p-2 text-[#6B6B6B] hover:text-[#141414] hover:bg-[#F8F6F1] rounded-full transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form content */}
          <div className="flex-1 px-6 sm:px-10 pb-8 pt-2">
            {/* Header — only show when not success */}
            {authView !== 'success' && (
              <div className="mb-6">
                {/* Lumina wordmark small */}
                <p className="text-[10px] font-medium tracking-[0.2em] text-[#D4AF37] uppercase mb-3">
                  Lumina Eyewear
                </p>
                <h2
                  id="auth-modal-title"
                  className="font-display text-2xl sm:text-3xl font-semibold text-[#141414] leading-tight"
                >
                  {meta.title}
                </h2>
                {meta.subtitle && (
                  <p className="mt-1.5 text-sm text-[#6B6B6B] leading-relaxed">{meta.subtitle}</p>
                )}
              </div>
            )}

            {/* View router — smooth transition */}
            <div key={authView} className="animate-fade-in">
              {authView === 'login' && <LoginForm />}
              {authView === 'register' && <RegisterForm />}
              {authView === 'forgot' && <ForgotPasswordForm />}
              {authView === 'success' && <SuccessScreen />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
