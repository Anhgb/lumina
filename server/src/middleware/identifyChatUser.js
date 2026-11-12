import { KNOWN_DEMO_TOKENS } from './authMiddleware.js';

/**
 * identifyChatUser.js — Permissive identity middleware for Lumina AI Chat.
 * Allows both authenticated Customers/Admins and unauthenticated Guests to interact with the chat service.
 *
 * Rules:
 * - If Bearer token is provided & valid: populates req.user.
 * - If Bearer token is provided but forged/invalid: returns 401 Unauthorized.
 * - If no Bearer token: req.user is null, client is treated as Guest.
 * - Extracts and normalizes guestSessionId from 'x-guest-session-id' header or body/query.
 */
export function identifyChatUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]?.trim();

    if (process.env.DEMO_MODE === 'true' && token) {
      const demoUser = KNOWN_DEMO_TOKENS[token];
      if (demoUser) {
        req.user = demoUser;
      } else if (token.startsWith('jwt-admin-')) {
        req.user = {
          id: 'admin-lumina-01',
          name: 'Quản Trị Viên Lumina',
          email: 'admin@lumina.vn',
          role: 'admin',
        };
      } else if (token.startsWith('jwt-') && !token.startsWith('jwt-admin-')) {
        req.user = {
          id: 'cust-lumina-01',
          name: 'Khách Hàng Lumina',
          email: 'khachhang@lumina.vn',
          role: 'customer',
        };
      } else {
        // Token provided but unrecognized/forged
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
        });
      }
    }
  }

  // Extract guest session identifier if present
  const guestHeader = req.headers['x-guest-session-id'];
  const guestParam = req.body?.guestSessionId || req.query?.guestSessionId;
  const rawGuestId = guestHeader || guestParam;

  if (typeof rawGuestId === 'string' && rawGuestId.trim().length >= 8 && rawGuestId.trim().length <= 100) {
    req.guestSessionId = rawGuestId.trim();
  }

  next();
}

