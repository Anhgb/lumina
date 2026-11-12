import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

/* ── helpers ── */
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
function validatePhone(v) {
  return v === '' || /^[0-9]{9,11}$/.test(v.replace(/\s/g, ''));
}

/* ── Password strength ── */
const PW_RULES = [
  { id: 'len', label: 'Ít nhất 8 ký tự', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'Có chữ hoa (A–Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'num', label: 'Có chữ số (0–9)', test: (v) => /[0-9]/.test(v) },
];

function getStrength(pw) {
  const passed = PW_RULES.filter((r) => r.test(pw)).length;
  if (pw.length === 0) return { score: 0, label: '', color: '' };
  if (passed === 1) return { score: 1, label: 'Yếu', color: '#C0392B' };
  if (passed === 2) return { score: 2, label: 'Trung bình', color: '#D4AF37' };
  return { score: 3, label: 'Mạnh', color: '#2E7D5B' };
}

export default function RegisterForm() {
  const { register, setAuthView } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [shake, setShake] = useState(false);
  const [touched, setTouched] = useState({});
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const strength = getStrength(form.password);

  const errors = {
    name: touched.name && form.name.trim().length < 2 ? 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự).' : '',
    email: touched.email && !validateEmail(form.email) ? 'Email chưa đúng định dạng.' : '',
    phone: touched.phone && !validatePhone(form.phone) ? 'Số điện thoại không hợp lệ.' : '',
    password: touched.password && strength.score < 2 ? 'Mật khẩu cần đáp ứng ít nhất 2 tiêu chí bên dưới.' : '',
    confirm:
      touched.confirm && form.password !== form.confirm ? 'Mật khẩu xác nhận không khớp.' : '',
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const touch = (key) => () => setTouched((t) => ({ ...t, [key]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true, confirm: true });
    const hasErr = Object.values(errors).some(Boolean);
    if (hasErr || !agreed) {
      triggerShake();
      if (!agreed) setFormError('Bạn cần đồng ý với Điều khoản & Chính sách bảo mật để tiếp tục.');
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    } catch (err) {
      setFormError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (err) =>
    `w-full pl-10 pr-4 py-3 text-sm bg-white border rounded-[10px] outline-none transition-all duration-200
     focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 text-[#141414] placeholder-[#6B6B6B]/60
     ${err ? 'border-[#C0392B] bg-[#C0392B]/4' : 'border-[#E4DFD3] hover:border-[#D4AF37]/50'}`;

  return (
    <div className={`space-y-5 ${shake ? 'animate-shake' : ''}`}>
      {formError && (
        <div role="alert" className="px-3 py-2.5 bg-[#C0392B]/8 border border-[#C0392B]/30 rounded-[10px] text-xs text-[#C0392B] font-medium">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Họ và tên */}
        <Field label="Họ và tên" htmlFor="reg-name" error={errors.name}>
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <input
            ref={nameRef}
            id="reg-name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={setField('name')}
            onBlur={touch('name')}
            placeholder="Nguyễn Văn A"
            className={inputClass(errors.name)}
            aria-invalid={!!errors.name}
          />
        </Field>

        {/* Email */}
        <Field label="Địa chỉ email" htmlFor="reg-email" error={errors.email}>
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={setField('email')}
            onBlur={touch('email')}
            placeholder="ten@email.com"
            className={inputClass(errors.email)}
            aria-invalid={!!errors.email}
          />
        </Field>

        {/* Phone — optional */}
        <Field label={<>Số điện thoại <span className="text-[#6B6B6B]/60 font-normal">(tùy chọn)</span></>} htmlFor="reg-phone" error={errors.phone}>
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={setField('phone')}
            onBlur={touch('phone')}
            placeholder="0912 345 678"
            className={inputClass(errors.phone)}
          />
        </Field>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="reg-pw" className="block text-xs font-medium text-[#141414] tracking-wide">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              id="reg-pw"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={setField('password')}
              onBlur={touch('password')}
              placeholder="••••••••"
              className={`${inputClass(errors.password)} pr-11`}
              aria-invalid={!!errors.password}
              aria-describedby="pw-strength"
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

          {/* Strength bar */}
          {form.password.length > 0 && (
            <div id="pw-strength" className="space-y-2 mt-2">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: i <= strength.score ? strength.color : '#E4DFD3',
                    }}
                  />
                ))}
              </div>
              {strength.label && (
                <p className="text-[11px] font-medium" style={{ color: strength.color }}>
                  Độ mạnh: {strength.label}
                </p>
              )}
              <ul className="space-y-1 mt-1">
                {PW_RULES.map((rule) => {
                  const ok = rule.test(form.password);
                  return (
                    <li key={rule.id} className="flex items-center gap-1.5 text-[11px]" style={{ color: ok ? '#2E7D5B' : '#6B6B6B' }}>
                      {ok ? <Check className="w-3 h-3 flex-shrink-0" /> : <span className="w-3 h-3 flex-shrink-0 inline-block border border-[#E4DFD3] rounded-full" />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {errors.password && (
            <p className="text-[11px] text-[#C0392B] mt-1">⚠ {errors.password}</p>
          )}
        </div>

        {/* Confirm password */}
        <Field label="Xác nhận mật khẩu" htmlFor="reg-confirm" error={errors.confirm}>
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
          <input
            id="reg-confirm"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.confirm}
            onChange={setField('confirm')}
            onBlur={touch('confirm')}
            placeholder="••••••••"
            className={`${inputClass(errors.confirm)} pr-11`}
            aria-invalid={!!errors.confirm}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#141414] transition-colors"
            aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </Field>

        {/* Terms */}
        <label className="flex items-start gap-2.5 cursor-pointer group">
          <div className="relative flex-shrink-0 mt-0.5">
            <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setFormError(''); }} className="sr-only peer" />
            <div className="w-4 h-4 border border-[#E4DFD3] rounded-[4px] bg-white peer-checked:bg-[#141414] peer-checked:border-[#141414] transition-all duration-200 flex items-center justify-center">
              {agreed && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs text-[#6B6B6B] leading-relaxed">
            Tôi đồng ý với{' '}
            <a href="#" className="text-[#141414] font-medium underline underline-offset-2 hover:text-[#D4AF37]" onClick={(e) => e.preventDefault()}>
              Điều khoản sử dụng
            </a>{' '}
            và{' '}
            <a href="#" className="text-[#141414] font-medium underline underline-offset-2 hover:text-[#D4AF37]" onClick={(e) => e.preventDefault()}>
              Chính sách bảo mật
            </a>{' '}
            của Lumina Eyewear.
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
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Đang tạo tài khoản…</span></>
          ) : (
            'Tạo tài khoản'
          )}
        </button>
      </form>

      <p className="text-center text-xs text-[#6B6B6B]">
        Đã có tài khoản?{' '}
        <button
          type="button"
          onClick={() => setAuthView('login')}
          className="text-[#141414] font-semibold hover:text-[#D4AF37] transition-colors underline-offset-2 hover:underline"
        >
          Đăng nhập
        </button>
      </p>
    </div>
  );
}

/* ── Reusable Field wrapper ── */
function Field({ label, htmlFor, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-[#141414] tracking-wide">
        {label}
      </label>
      <div className="relative">{children}</div>
      {error && (
        <p className="text-[11px] text-[#C0392B] flex items-center gap-1 mt-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

