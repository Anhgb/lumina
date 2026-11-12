/**
 * chatRateLimit.js — Sliding-window In-memory Rate Limiter for Lumina AI Chat API.
 * Protects server and downstream services against spamming, scraping, and automated flooding.
 */

const requestLog = new Map();

/**
 * Creates an Express rate limit middleware with configurable window and request count.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.max - Maximum requests allowed within window (default: 30)
 * @param {string} options.message - Error message when rate limit is exceeded
 */
export function createChatRateLimiter({
  windowMs = 60000,
  max = 30,
  message = 'Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau giây lát.',
} = {}) {
  return function rateLimitMiddleware(req, res, next) {
    // Unique client key: user ID if authenticated, or guest session ID, or IP address
    const clientKey = req.user?.id || req.guestSessionId || req.ip || req.socket.remoteAddress || 'unknown-client';
    const routeKey = `${req.baseUrl || ''}${req.path}`;
    const key = `${clientKey}:${routeKey}`;
    const now = Date.now();

    const clientRecords = requestLog.get(key) || [];
    // Filter timestamps within current window
    const validTimestamps = clientRecords.filter((timestamp) => now - timestamp < windowMs);

    if (validTimestamps.length >= max) {
      const oldestValid = validTimestamps[0];
      const retryAfterSec = Math.ceil((oldestValid + windowMs - now) / 1000);

      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: retryAfterSec,
      });
    }

    validTimestamps.push(now);
    requestLog.set(key, validTimestamps);

    next();
  };
}

/**
 * Reset all rate limit records (used in automated test suites).
 */
export function resetRateLimits() {
  requestLog.clear();
}

