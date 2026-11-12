import { Router } from 'express';
import {
  handleCreateSession,
  handleGetSessions,
  handleGetMessages,
  handleSendMessage,
  handleDeleteSession,
  handleSaveFeedback,
} from '../controllers/chat.controller.js';
import { identifyChatUser } from '../middleware/identifyChatUser.js';
import { createChatRateLimiter } from '../middleware/chatRateLimit.js';
import {
  validateCreateSession,
  validateSessionCodeParam,
  validateSendMessage,
  validateFeedback,
} from '../validators/chat.validator.js';

const router = Router();

// Identify user or guest on all chat routes
router.use(identifyChatUser);

// General rate limiter for creating sessions and general endpoints (60 req/min)
const generalLimiter = createChatRateLimiter({
  windowMs: 60000,
  max: 60,
  message: 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau giây lát.',
});

// Strict rate limiter for sending messages (30 msgs/min)
const messageLimiter = createChatRateLimiter({
  windowMs: 60000,
  max: 30,
  message: 'Bạn gửi tin nhắn quá nhanh. Vui lòng chờ vài giây trước khi gửi tiếp.',
});

// 1. POST /api/chat/sessions — Create new chat session
router.post('/sessions', generalLimiter, validateCreateSession, handleCreateSession);

// 2. GET /api/chat/sessions — List sessions of current user/guest
router.get('/sessions', generalLimiter, handleGetSessions);

// 3. GET /api/chat/sessions/:sessionCode/messages — Get message history
router.get('/sessions/:sessionCode/messages', generalLimiter, validateSessionCodeParam, handleGetMessages);

// 4. POST /api/chat/sessions/:sessionCode/messages — Send message
router.post('/sessions/:sessionCode/messages', messageLimiter, validateSessionCodeParam, validateSendMessage, handleSendMessage);

// 5. DELETE /api/chat/sessions/:sessionCode — Delete session
router.delete('/sessions/:sessionCode', generalLimiter, validateSessionCodeParam, handleDeleteSession);

// 6. POST /api/chat/feedback — Submit feedback
router.post('/feedback', generalLimiter, validateFeedback, handleSaveFeedback);

export default router;

