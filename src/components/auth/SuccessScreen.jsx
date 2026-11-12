import React, { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function SuccessScreen() {
  const { user, closeAuthModal, pendingAction } = useAuth();
  const navigate = useNavigate();

  // Auto-close after 1.5s, execute pending action or redirect to home
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof pendingAction === 'function') {
        try {
          pendingAction();
        } catch (err) {
          console.error('[SuccessScreen] Error executing pendingAction:', err);
        }
      } else {
        // Nếu khách hàng không có thao tác trước đó -> chuyển đến trang chủ
        navigate('/');
      }
      closeAuthModal();
    }, 1500);

    return () => clearTimeout(timer);
  }, [closeAuthModal, pendingAction, navigate]);

  const firstName = user?.name?.split(' ').pop() || 'bạn';

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
      {/* Animated check icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center animate-scale-in">
          <CheckCircle className="w-10 h-10 text-[#D4AF37]" />
        </div>
        {/* Ripple */}
        <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 animate-ping" />
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-2xl font-semibold text-[#141414]">
          Chào mừng, {firstName}!
        </h3>
        <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-xs mx-auto">
          Đăng nhập thành công. Chúng tôi đang chuyển bạn trở lại…
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-32 h-0.5 bg-[#E4DFD3] rounded-full overflow-hidden">
        <div className="h-full bg-[#D4AF37] animate-progress" />
      </div>
    </div>
  );
}

