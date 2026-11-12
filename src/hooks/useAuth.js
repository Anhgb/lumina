/**
 * useAuth — Hook to access authentication context, RBAC, and auth modal controls.
 * Must be used within an <AuthProvider>.
 *
 * Re-exports from AuthContext for convenience.
 */
export { useAuth, DEMO_USERS, DEMO_MODE, AUTH_STORAGE_KEY } from '../context/AuthContext';
