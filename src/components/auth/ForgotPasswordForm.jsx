import React, { useState, useRef, useEffect } from 'react';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function ForgotPasswordForm() {
  const { forgotPassword, setAuthView } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const emailErr = touched && !validateEmail(email) ? 'Email chưa đúng định dạng.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!validateEmail(email)) return;
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Gửi yêu cầu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Sent confirmation screen ── */
  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-5 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-[#2E7D5B]/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-[#2E7D5B]" />
        </div>

        <div className="space-y-2">
          <h3 className="font-display text-xl font-semibold text-[#141414]">
            Kiểm tra hộp thư của bạn
          </h3>
          <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-xs mx-auto">
            Chúng tôi đã gửi liên kết đặt lại mật khẩu đến{' '}
            <span className="font-medium text-[#141414]">{email}</span>.
            Liên kết có hiệu lực trong 15 phút.
          </p>
        </div>

        <p className="text-xs text-[#6B6B6B]">
          Không nhận được email?{' '}
          <button
            type="button"
            onClick={() => { setSent(false); setTouched(false); }}
            className="text-[#141414] font-semibold hover:text-[#D4AF37] transition-colors underline-offset-2 hover:underline"
          >
            Gửi lại
          </button>
        </p>

        <button
          type="button"
          onClick={() => setAuthView('login')}
          className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#141414] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại đăng nhập
        </button>
      </div>
    );
  }

  /* ── Input screen ── */
  return (
    <div className="space-y-5">
      {/* Intro */}
      <div className="space-y-1.5">
        <p className="text-sm text-[#6B6B6B] leading-relaxed">
          Nhập địa chỉ email đã đăng ký. Chúng tôi sẽ gửi liên kết để đặt lại mật khẩu của bạn.
        </p>
      </div>

      {error && (
        <div role="alert" className="px-3 py-2.5 bg-[#C0392B]/8 border border-[#C0392B]/30 rounded-[10px] text-xs text-[#C0392B] font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="forgot-email" className="block text-xs font-medium text-[#141414] tracking-wide">
            Địa chỉ email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              ref={emailRef}
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="ten@email.com"
              className={`w-full pl-10 pr-4 py-3 text-sm bg-white border rounded-[10px] outline-none transition-all duration-200
                focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 text-[#141414] placeholder-[#6B6B6B]/60
                ${emailErr ? 'border-[#C0392B] bg-[#C0392B]/4' : 'border-[#E4DFD3] hover:border-[#D4AF37]/50'}`}
              aria-invalid={!!emailErr}
              aria-describedby={emailErr ? 'forgot-email-err' : undefined}
            />
          </div>
          {emailErr && (
            <p id="forgot-email-err" className="text-[11px] text-[#C0392B] flex items-center gap-1 mt-1">
              <span>⚠</span> {emailErr}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#141414] hover:bg-[#2a2a2a] disabled:bg-[#141414]/50 text-white text-sm font-medium rounded-[10px]
            transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:ring-offset-1"
          aria-busy={loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Đang gửi…</span></>
          ) : (
            'Gửi liên kết đặt lại'
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setAuthView('login')}
        className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#141414] transition-colors mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại đăng nhập
      </button>
    </div>
  );
}

