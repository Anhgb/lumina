import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingBag, Sparkles, Box, ShieldCheck, User, LogOut, ArrowRight } from 'lucide-react';
import BrandLogo from './BrandLogo';
import NotificationBell from '../notifications/NotificationBell';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { totalCount } = useCart();
  const { user, role, isGuest, isAdmin, logout, openAuthModal } = useAuth();

  // Scroll listener for compact navbar effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Trang chủ' },
    { to: '/catalog', label: 'Bộ sưu tập' },
    {
      to: '/studio-3d',
      label: '3D Atelier',
      icon: <Box className="w-3.5 h-3.5 text-[#D4AF37]" />,
    },
    {
      to: '/try-on',
      label: 'AI Try-On',
      icon: <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />,
      badge: '✦ AI',
    },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FAF8F5]/90 backdrop-blur-md shadow-sm py-2.5 border-b border-[#D6D3CD]'
          : 'bg-[#FAF8F5] py-4 border-b border-[#D6D3CD]/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <BrandLogo compact={isScrolled && window.innerWidth < 640} />

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] font-medium transition-colors duration-200 py-1 ${
                    isActive
                      ? 'text-[#141413] font-semibold'
                      : 'text-[#141413]/70 hover:text-[#141413]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.icon}
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-[#D4AF37]/15 text-[#141413] rounded-full font-bold ml-0.5 border border-[#D4AF37]/40">
                        {link.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#D4AF37]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Action Utilities */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Admin shortcut (Only if Admin or in testing) */}
            {isAdmin && (
              <Link
                to="/admin"
                aria-label="Admin Portal"
                className="hidden lg:flex items-center gap-1 text-[11px] uppercase tracking-wider text-white bg-[#141413] hover:bg-[#DC2626] transition-colors px-2.5 py-1 rounded border border-[#141413]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Admin Portal</span>
              </Link>
            )}

            {/* User Auth Section */}
            {isGuest ? (
              <button
                type="button"
                onClick={() => openAuthModal({ hint: 'Đăng nhập để khám phá trải nghiệm cá nhân hóa.' })}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#141413] hover:text-[#D4AF37] transition-colors px-2.5 py-1.5 rounded border border-[#D6D3CD] hover:border-[#141413]"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="text-xs font-bold text-[#141413] max-w-[120px] truncate">
                      {user?.name}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-semibold text-[#DC2626]">
                      Quản trị viên
                    </span>
                  </div>
                ) : (
                  <Link
                    to="/account"
                    title="Trang cá nhân My Lumina & Đơn hàng của tôi"
                    className="hidden sm:flex flex-col items-end leading-tight group hover:opacity-90 transition-opacity"
                  >
                    <span className="text-xs font-bold text-[#141413] max-w-[120px] truncate group-hover:text-[#D4AF37] transition-colors">
                      {user?.name}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest font-semibold text-[#D4AF37] flex items-center gap-0.5">
                      <span>Tài khoản</span>
                      <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 text-[#141413]/60 hover:text-[#DC2626] transition-colors rounded border border-transparent hover:border-[#D6D3CD]"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Notification Bell (Logged-in customer / admin) */}
            {!isGuest && <NotificationBell />}

            {/* Cart Icon with Live Synced Counter */}
            <Link
              to="/cart"
              aria-label={`Giỏ hàng Lumina (${totalCount} sản phẩm)`}
              className="relative p-2 text-[#141413] hover:text-[#D4AF37] transition-colors"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
              <span
                className={`absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center transition-all duration-300 ${
                  totalCount > 0
                    ? 'bg-[#141413] text-[#D4AF37] scale-100'
                    : 'bg-[#D6D3CD] text-[#141413] scale-90'
                }`}
              >
                {totalCount}
              </span>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#141413] hover:text-[#D4AF37] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 pb-4 border-t border-[#D6D3CD] flex flex-col space-y-3 bg-[#FAF8F5]">
            {/* User Auth Status in Mobile Menu */}
            <div className="px-3 py-2 bg-white rounded border border-[#D6D3CD] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#D4AF37]" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#141413]">
                    {isGuest ? 'Khách vãng lai' : user?.name}
                  </span>
                  <span className="text-[10px] text-[#141413]/60">
                    {isGuest ? 'Chưa đăng nhập' : (isAdmin ? 'Quản trị viên' : user?.email)}
                  </span>
                </div>
              </div>
              {isGuest ? (
                <button
                  type="button"
                  onClick={() => openAuthModal({})}
                  className="px-2.5 py-1 text-xs bg-[#141413] text-[#FAF8F5] font-semibold rounded uppercase tracking-wider"
                >
                  Đăng nhập
                </button>
              ) : (
                <button
                  type="button"
                  onClick={logout}
                  className="p-1 text-xs text-[#DC2626] font-semibold hover:underline"
                >
                  Đăng xuất
                </button>
              )}
            </div>

            {!isGuest && !isAdmin && (
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 bg-white border border-[#D4AF37]/50 rounded flex items-center justify-between text-xs font-semibold text-[#141413] hover:bg-[#D4AF37]/10 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#D4AF37]" />
                  <span>Trang cá nhân & Đơn hàng của tôi</span>
                </span>
                <span className="text-[10px] text-[#D4AF37] font-mono">My Lumina →</span>
              </Link>
            )}

            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 text-sm uppercase tracking-wider font-medium rounded transition-all ${
                    isActive
                      ? 'bg-[#141413] text-[#FAF8F5] border-l-4 border-[#D4AF37] pl-2.5 font-semibold shadow-sm'
                      : 'text-[#141413] hover:bg-[#D6D3CD]/30'
                  }`
                }
              >
                <div className="flex items-center gap-2">
                  {link.icon}
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#D4AF37] text-[#141413] rounded font-bold">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            ))}

            {/* Mobile Cart Link */}
            <NavLink
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 text-sm uppercase tracking-wider font-medium rounded transition-all ${
                  isActive
                    ? 'bg-[#141413] text-[#FAF8F5] border-l-4 border-[#D4AF37] pl-2.5 font-semibold shadow-sm'
                    : 'text-[#141413] hover:bg-[#D6D3CD]/30'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
                <span>Giỏ hàng</span>
              </div>
              <span className="text-xs px-2 py-0.5 bg-[#141413] text-[#D4AF37] rounded-full font-bold">
                {totalCount}
              </span>
            </NavLink>

            {isAdmin && (
              <div className="pt-2 border-t border-[#D6D3CD]/60 flex justify-between px-3">
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#DC2626] font-bold"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Trang quản trị (Admin)</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
