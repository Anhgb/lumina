import React from 'react';
import { useAuth } from '../../hooks/useAuth';

/**
 * ProtectedAction — Intercepts user interactions based on RBAC rules.
 * Conforms to PRD 6.3 & 7.1:
 * - When Guest performs an action, opens AuthModal with standard PRD message.
 * - When authorized, fires the provided onAction callback.
 */
export default function ProtectedAction({
  children,
  requiredRole = 'customer',
  message,
  onAction,
  className = '',
}) {
  const { requireAuth } = useAuth();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    requireAuth(onAction, {
      requiredRole,
      message,
    });
  };

  return (
    <span onClick={handleClick} className={`inline-block ${className}`}>
      {children}
    </span>
  );
}
