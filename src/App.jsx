import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CustomGlassesProvider } from './context/CustomGlassesContext';
import { ChatProvider } from './context/ChatContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AuthModal from './components/common/AuthModal';
import ChatWidget from './components/chat/ChatWidget';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import StudioPage from './pages/StudioPage';
import TryOnPage from './pages/TryOnPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import AccountPage from './pages/AccountPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLoginPage from './pages/AdminLoginPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <CustomGlassesProvider>
          <ChatProvider>
            <Routes>
              {/* ── Standalone routes (no Navbar/Footer) ── */}
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* ── Main layout routes ── */}
              <Route
                path="*"
                element={
                  <div className="flex flex-col min-h-screen bg-[var(--bg-ivory-primary)] text-[var(--text-obsidian)] font-sans antialiased">
                    <ScrollToTop />
                    <Navbar />
                    <main className="flex-grow pt-[72px]">
                      <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/catalog" element={<CatalogPage />} />
                        <Route path="/studio-3d" element={<StudioPage />} />
                        <Route path="/try-on" element={<TryOnPage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/403" element={<ForbiddenPage />} />

                        {/* Protected routes */}
                        <Route
                          path="/account"
                          element={
                            <ProtectedRoute requiredRole="customer">
                              <AccountPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/checkout"
                          element={
                            <ProtectedRoute requiredRole="customer">
                              <CheckoutPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute requiredRole="admin">
                              <AdminDashboard />
                            </ProtectedRoute>
                          }
                        />

                        {/* Fallback 404 */}
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </main>

                    {/* Global Auth Modal */}
                    <AuthModal />

                    {/* Lumina AI Assistant Chat Widget */}
                    <ChatWidget />

                    <Footer />
                  </div>
                }
              />
            </Routes>
          </ChatProvider>
        </CustomGlassesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
