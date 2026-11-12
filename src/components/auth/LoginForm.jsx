import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

/* ── helpers ── */
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function LoginForm() {
  const { login, setAuthView, closeAuthModal, authContextHint } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [shake, setShake] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailRef = useRef(null);

  // autofocus
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const emailErr = touched.email && !validateEmail(email) ? 'Email chưa đúng định dạng.' : '';
  const passwordErr =
    touched.password && password.length < 1 ? 'Vui lòng nhập mật khẩu.' : '';

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!validateEmail(email) || !password) {
      triggerShake();
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      await login(email, password);
    } catch (err) {
      setFormError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-5 ${shake ? 'animate-shake' : ''}`}>
      {/* Context hint */}
      {authContextHint && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#D4AF37]/8 border border-[#D4AF37]/25 rounded-[10px]">
          <svg className="w-3.5 h-3.5 text-[#D4AF37] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">{authContextHint}</p>
        </div>
      )}

      {/* Form error */}
      {formError && (
        <div
          role="alert"
          className="px-3 py-2.5 bg-[#C0392B]/8 border border-[#C0392B]/30 rounded-[10px] text-xs text-[#C0392B] font-medium"
        >
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="login-email" className="block text-xs font-medium text-[#141414] tracking-wide">
            Địa chỉ email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              ref={emailRef}
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="ten@email.com"
              className={`w-full pl-10 pr-4 py-3 text-sm bg-white border rounded-[10px] outline-none transition-all duration-200
                focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 text-[#141414] placeholder-[#6B6B6B]/60
                ${emailErr ? 'border-[#C0392B] bg-[#C0392B]/4' : 'border-[#E4DFD3] hover:border-[#D4AF37]/50'}`}
              aria-describedby={emailErr ? 'login-email-err' : undefined}
              aria-invalid={!!emailErr}
            />
          </div>
          {emailErr && (
            <p id="login-email-err" className="text-[11px] text-[#C0392B] flex items-center gap-1 mt-1">
              <span>⚠</span> {emailErr}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="block text-xs font-medium text-[#141414] tracking-wide">
              Mật khẩu
            </label>
            <button
              type="button"
              onClick={() => setAuthView('forgot')}
              className="text-[11px] text-[#6B6B6B] hover:text-[#D4AF37] transition-colors duration-200 underline-offset-2 hover:underline"
            >
              Quên mật khẩu?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              id="login-password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="••••••••"
              className={`w-full pl-10 pr-11 py-3 text-sm bg-white border rounded-[10px] outline-none transition-all duration-200
                focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 text-[#141414] placeholder-[#6B6B6B]/60
                ${passwordErr ? 'border-[#C0392B] bg-[#C0392B]/4' : 'border-[#E4DFD3] hover:border-[#D4AF37]/50'}`}
              aria-describedby={passwordErr ? 'login-password-err' : undefined}
              aria-invalid={!!passwordErr}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#141414] transition-colors"
              aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordErr && (
            <p id="login-password-err" className="text-[11px] text-[#C0392B] flex items-center gap-1 mt-1">
              <span>⚠</span> {passwordErr}
            </p>
          )}
        </div>

        {/* Remember me */}
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <div className="relative flex-shrink-0">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-4 h-4 border border-[#E4DFD3] rounded-[4px] bg-white peer-checked:bg-[#141414] peer-checked:border-[#141414] transition-all duration-200 flex items-center justify-center">
              {remember && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs text-[#6B6B6B] group-hover:text-[#141414] transition-colors select-none">
            Ghi nhớ đăng nhập
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#141414] hover:bg-[#2a2a2a] disabled:bg-[#141414]/50 text-white text-sm font-medium rounded-[10px]
            transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md
            focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:ring-offset-1"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang đăng nhập…</span>
            </>
          ) : (
            'Đăng nhập'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-[#E4DFD3]" />
        <span className="text-[11px] text-[#6B6B6B] tracking-wide">hoặc</span>
        <div className="flex-1 h-px bg-[#E4DFD3]" />
      </div>

      {/* Social login */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => alert('Tính năng đang được phát triển.')}
          className="flex items-center justify-center gap-2 py-2.5 border border-[#E4DFD3] rounded-[10px] text-xs font-medium text-[#141414]
            hover:border-[#D4AF37]/50 hover:bg-[#F8F6F1] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
        >
          {/* Google icon */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </button>
        <button
          type="button"
          onClick={() => alert('Tính năng đang được phát triển.')}
          className="flex items-center justify-center gap-2 py-2.5 border border-[#E4DFD3] rounded-[10px] text-xs font-medium text-[#141414]
            hover:border-[#D4AF37]/50 hover:bg-[#F8F6F1] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          Apple
        </button>
      </div>

      {/* Footer links */}
      <div className="space-y-3 pt-1">
        <p className="text-center text-xs text-[#6B6B6B]">
          Chưa có tài khoản?{' '}
          <button
            type="button"
            onClick={() => setAuthView('register')}
            className="text-[#141414] font-semibold hover:text-[#D4AF37] transition-colors underline-offset-2 hover:underline"
          >
            Đăng ký ngay
          </button>
        </p>

        {/* Admin link — rất nhỏ, mờ */}
        <p className="text-center text-[10px] text-[#6B6B6B]/50">
          <a
            href="/admin/login"
            className="hover:text-[#6B6B6B] transition-colors"
            onClick={(e) => {
              e.preventDefault();
              closeAuthModal();
              window.location.href = '/admin/login';
            }}
          >
            Dành cho quản trị viên
          </a>
        </p>
      </div>
    </div>
  );
}
