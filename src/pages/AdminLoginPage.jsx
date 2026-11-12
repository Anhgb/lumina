import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * AdminLoginPage — Trang đăng nhập riêng cho quản trị viên.
 * Truy cập qua /admin/login. Nền tối, nhãn "Khu vực quản trị".
 */
export default function AdminLoginPage() {
  const { loginAsAdmin, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailRef = useRef(null);

  // Redirect if already admin
  useEffect(() => {
    if (isAdmin) navigate('/admin', { replace: true });
  }, [isAdmin, navigate]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const emailErr = touched.email && !validateEmail(email) ? 'Email chưa đúng định dạng.' : '';
  const passwordErr = touched.password && !password ? 'Vui lòng nhập mật khẩu.' : '';

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!validateEmail(email) || !password) { triggerShake(); return; }

    setLoading(true);
    setError('');
    try {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 600));
      // Demo: any valid-format email + any password is accepted as admin
      loginAsAdmin({ email });
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Thông tin đăng nhập không hợp lệ.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #D4AF37 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className={`relative w-full max-w-sm animate-modal-enter ${shake ? 'animate-shake' : ''}`}>
        {/* Card */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header stripe */}
          <div className="px-8 pt-8 pb-6 border-b border-[#2A2A2A]">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#D4AF37]">
                Khu vực quản trị
              </span>
            </div>

            <h1 className="font-display text-2xl font-semibold text-white leading-tight">
              Đăng nhập<br />quản trị viên
            </h1>
            <p className="mt-1.5 text-sm text-[#6B6B6B]">
              Chỉ dành cho nhân viên được uỷ quyền.
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-6 space-y-5">
            {error && (
              <div role="alert" className="px-3 py-2.5 bg-[#C0392B]/15 border border-[#C0392B]/40 rounded-[10px] text-xs text-[#ff6b6b]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="block text-xs font-medium text-[#8A8A8A] tracking-wide">
                  Email quản trị
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4A4A]" />
                  <input
                    ref={emailRef}
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="admin@lumina.vn"
                    className={`w-full pl-10 pr-4 py-3 text-sm bg-[#111] border rounded-[10px] outline-none transition-all duration-200
                      text-white placeholder-[#4A4A4A]
                      focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15
                      ${emailErr ? 'border-[#C0392B]' : 'border-[#2A2A2A] hover:border-[#3A3A3A]'}`}
                    aria-invalid={!!emailErr}
                  />
                </div>
                {emailErr && <p className="text-[11px] text-[#ff6b6b]">⚠ {emailErr}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="block text-xs font-medium text-[#8A8A8A] tracking-wide">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4A4A]" />
                  <input
                    id="admin-password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-11 py-3 text-sm bg-[#111] border rounded-[10px] outline-none transition-all duration-200
                      text-white placeholder-[#4A4A4A]
                      focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15
                      ${passwordErr ? 'border-[#C0392B]' : 'border-[#2A2A2A] hover:border-[#3A3A3A]'}`}
                    aria-invalid={!!passwordErr}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4A4A4A] hover:text-[#8A8A8A] transition-colors"
                    aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErr && <p className="text-[11px] text-[#ff6b6b]">⚠ {passwordErr}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#c29d2e] disabled:bg-[#D4AF37]/50 text-[#141414] text-sm font-semibold rounded-[10px]
                  transition-all duration-200 flex items-center justify-center gap-2
                  focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 focus:ring-offset-2 focus:ring-offset-[#1A1A1A]"
                aria-busy={loading}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Đang xác thực…</span></>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Đăng nhập quản trị
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Back link */}
        <p className="mt-5 text-center text-xs text-[#4A4A4A]">
          <a href="/" className="hover:text-[#8A8A8A] transition-colors">
            ← Quay về trang chủ Lumina Eyewear
          </a>
        </p>
      </div>
    </div>
  );
}

