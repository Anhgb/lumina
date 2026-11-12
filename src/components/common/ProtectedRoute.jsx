import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/**
 * ProtectedRoute — Route guard enforcing RBAC before rendering protected pages.
 * Conforms to PRD 6.3:
 * - Admin route (/admin): Accessible ONLY to role 'admin'. Others redirected to /403.
 * - Customer route (/checkout): Accessible ONLY to role 'customer'. Guests redirected with login modal.
 */
export default function ProtectedRoute({ children, requiredRole = 'customer' }) {
  const { role, isGuest, isAdmin, isCustomer, openAuthModal } = useAuth();
  const location = useLocation();

  // If route requires admin
  if (requiredRole === 'admin') {
    if (!isAdmin) {
      // Direct redirect to 403 Forbidden page as mandated by PRD 6.3
      return <Navigate to="/403" replace state={{ from: location }} />;
    }
    return children;
  }

  // If route requires customer (e.g. checkout)
  if (requiredRole === 'customer') {
    if (isGuest) {
      // Redirect to cart and trigger login modal
      return <Navigate to="/cart" replace state={{ requireLogin: true }} />;
    }
    if (isAdmin) {
      // Admin is not allowed to checkout
      return <Navigate to="/admin" replace state={{ adminNotice: true }} />;
    }
    return children;
  }

  return children;
}
