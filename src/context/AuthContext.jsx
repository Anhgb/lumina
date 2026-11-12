import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AUTH_STORAGE_KEY = 'lumina_auth_user';
export const ACCOUNTS_STORAGE_KEY = 'lumina_registered_accounts';

export const DEMO_MODE = false;

function getStoredAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAccount(account) {
  try {
    const accounts = getStoredAccounts().filter((a) => a.email !== account.email);
    accounts.push(account);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore storage errors
  }
}

export const DEMO_USERS = {
  customer: {
    id: 'cust-lumina-01',
    name: 'Khách Hàng Lumina',
    email: 'khachhang@lumina.vn',
    role: 'customer',
    token: 'demo-jwt-customer-token-xyz123',
    savedFaceShape: 'Oval',
  },
  admin: {
    id: 'admin-lumina-01',
    name: 'Quản Trị Viên Lumina',
    email: 'admin@lumina.vn',
    role: 'admin',
    token: 'demo-jwt-admin-token-sec888',
  },
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  // Persisted auth user
  const [storedUser, setStoredUser] = useLocalStorage(AUTH_STORAGE_KEY, null);

  // Current authenticated user (kept in sync with storage)
  const [user, setUser] = useState(storedUser ?? null);

  // Modal visibility
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // View inside the auth modal: 'login' | 'register' | 'forgot' | 'success'
  const [authView, setAuthView] = useState('login');

  // Small context hint shown inside the modal (e.g. "Lưu cấu hình kính")
  const [authContextHint, setAuthContextHint] = useState('');

  // Action to execute after successful login
  const [pendingAction, setPendingAction] = useState(null);

  const persistUser = useCallback(
    (userData) => {
      setStoredUser(userData);
      setUser(userData);
    },
    [setStoredUser],
  );

  // Keep state in sync whenever storage changes & auto-heal missing/stale demo tokens
  useEffect(() => {
    if (storedUser && typeof storedUser === 'object') {
      if (storedUser.role === 'admin' && storedUser.token !== 'demo-jwt-admin-token-sec888') {
        persistUser({
          ...storedUser,
          token: 'demo-jwt-admin-token-sec888',
        });
      } else if (storedUser.role === 'customer' && !storedUser.token) {
        persistUser({
          ...storedUser,
          token: 'demo-jwt-customer-token-xyz123',
        });
      } else {
        setUser(storedUser);
      }
    } else {
      setUser(null);
    }
  }, [storedUser, persistUser]);

  // ---------------------------------------------------------------------------
  // Core login helpers (role-based)
  // ---------------------------------------------------------------------------

  /** Log in as the demo customer (optionally override with custom userData). */
  const loginAsCustomer = useCallback(
    (userData = null) => {
      persistUser(userData ?? DEMO_USERS.customer);
      setAuthView('success');
    },
    [persistUser],
  );

  /** Log in as admin. */
  const loginAsAdmin = useCallback(
    (adminData = null) => {
      persistUser({
        id: 'admin-lumina-01',
        name: adminData?.name || 'Quản Trị Viên Lumina',
        email: adminData?.email || 'admin@lumina.vn',
        role: 'admin',
        token: 'demo-jwt-admin-token-sec888',
      });
    },
    [persistUser],
  );

  /** Switch role between customer ↔ admin. */
  const switchRole = useCallback(
    (targetRole) => {
      if (targetRole === 'guest') {
        setStoredUser(null);
        setUser(null);
        setPendingAction(null);
      } else if (targetRole === 'admin') {
        persistUser(DEMO_USERS.admin);
      } else {
        persistUser(DEMO_USERS.customer);
      }
    },
    [persistUser, setStoredUser]
  );

  /** Clear session. */
  const logout = useCallback(() => {
    setStoredUser(null);
    setUser(null);
    setPendingAction(null);
  }, [setStoredUser]);

  // ---------------------------------------------------------------------------
  // Async auth functions
  // ---------------------------------------------------------------------------

  /**
   * Async login — validates credentials against registered accounts or format.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  const login = useCallback(
    async (email, password) => {
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 600));

      if (!email || !password) {
        throw new Error('Vui lòng nhập email và mật khẩu.');
      }

      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail === 'admin@lumina.vn') {
        throw new Error(
          'Tài khoản quản trị viên. Vui lòng truy cập /admin/login',
        );
      }

      // 1. Check registered accounts in storage
      const existingAccount = getStoredAccounts().find((a) => a.email === cleanEmail);
      if (existingAccount) {
        if (existingAccount.password && existingAccount.password !== password) {
          throw new Error('Mật khẩu không chính xác.');
        }
        const { password: _, ...safeUser } = existingAccount;
        if (!safeUser.token) {
          safeUser.token = 'demo-jwt-customer-token-xyz123';
        }
        persistUser(safeUser);
        setAuthView('success');
        return;
      }

      // 2. Allow valid customer credentials
      if (password.length >= 6) {
        const username = cleanEmail.split('@')[0];
        const formattedName = username.charAt(0).toUpperCase() + username.slice(1);
        const newUser = {
          id: `user-${Date.now()}`,
          name: formattedName,
          email: cleanEmail,
          role: 'customer',
          token: 'demo-jwt-customer-token-xyz123',
        };
        saveAccount({ ...newUser, password });
        persistUser(newUser);
        setAuthView('success');
        return;
      }

      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    },
    [persistUser],
  );

  /**
   * Async register — creates a new customer account.
   * @param {{ name: string, email: string, password: string }} data
   * @returns {Promise<void>}
   */
  const register = useCallback(
    async (data) => {
      const { name, email, password } = data ?? {};

      if (!name || !name.trim()) throw new Error('Vui lòng nhập họ và tên.');
      if (!email || !email.trim()) throw new Error('Vui lòng nhập email.');
      if (!password || password.length < 6)
        throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');

      // Simulate network latency
      await new Promise((r) => setTimeout(r, 800));

      const cleanEmail = email.trim().toLowerCase();
      const existing = getStoredAccounts().find((a) => a.email === cleanEmail);
      if (existing) {
        throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập.');
      }

      const now = Date.now();
      const newAccount = {
        id: `user-${now}`,
        name: name.trim(),
        email: cleanEmail,
        password,
        role: 'customer',
        token: 'demo-jwt-customer-token-xyz123',
      };

      saveAccount(newAccount);
      const { password: _, ...safeUser } = newAccount;
      persistUser(safeUser);
      setAuthView('success');
    },
    [persistUser],
  );

  /**
   * Async forgot-password — simulates sending a reset email.
   * @param {string} email
   * @returns {Promise<void>}
   */
  const forgotPassword = useCallback(async (email) => {
    if (!email || !email.trim()) {
      throw new Error('Vui lòng nhập địa chỉ email.');
    }
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 800));
    // In demo mode we always resolve successfully
  }, []);

  // ---------------------------------------------------------------------------
  // Modal helpers
  // ---------------------------------------------------------------------------

  /**
   * Open the auth modal, optionally set a context hint and/or a pending action.
   * @param {{ hint?: string, view?: string, onSuccess?: Function }} options
   */
  const openAuthModal = useCallback(
    ({ hint = '', view = 'login', onSuccess = null } = {}) => {
      setAuthContextHint(hint);
      setAuthView(view);
      setPendingAction(() => onSuccess);
      setIsAuthModalOpen(true);
    },
    [],
  );

  /** Close the auth modal and reset transient state. */
  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthContextHint('');
    setAuthView('login');
    setPendingAction(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Gate helper
  // ---------------------------------------------------------------------------

  /**
   * Guard a user action behind authentication.
   * If the user is already logged in, the callback is executed immediately;
   * otherwise the auth modal is opened and the callback is stored as a
   * pending action to run after a successful login.
   *
   * @param {Function} action  — callback to run when authenticated
   * @param {{ hint?: string, view?: string }} options
   */
  const requireAuth = useCallback(
    (action, { hint = '', view = 'login' } = {}) => {
      if (user) {
        action();
      } else {
        openAuthModal({ hint, view, onSuccess: action });
      }
    },
    [user, openAuthModal],
  );

  // ---------------------------------------------------------------------------
  // RBAC helpers
  // ---------------------------------------------------------------------------

  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';
  const isGuest = !isAuthenticated;
  const role = user?.role ?? 'guest';

  // ---------------------------------------------------------------------------
  // Context value (memoised)
  // ---------------------------------------------------------------------------

  const value = useMemo(
    () => ({
      // State
      user,
      role,
      isAuthenticated,
      isAdmin,
      isCustomer,
      isGuest,
      isAuthModalOpen,
      authView,
      authContextHint,
      pendingAction,

      // Auth functions
      login,
      register,
      forgotPassword,
      loginAsCustomer,
      loginAsAdmin,
      switchRole,
      logout,

      // Modal control
      openAuthModal,
      closeAuthModal,
      setAuthView,
      // Aliases for backward compat
      authModalOpen: isAuthModalOpen,
      authModalMessage: authContextHint,

      // Gate helper
      requireAuth,

      // Flags
      DEMO_MODE,
    }),
    [
      user,
      role,
      isAuthenticated,
      isAdmin,
      isCustomer,
      isGuest,
      isAuthModalOpen,
      authView,
      authContextHint,
      pendingAction,
      login,
      register,
      forgotPassword,
      loginAsCustomer,
      loginAsAdmin,
      switchRole,
      logout,
      openAuthModal,
      closeAuthModal,
      requireAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Consume the auth context.
 * Must be used inside an <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
