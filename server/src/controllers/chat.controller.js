import {
  createSession,
  getUserSessions,
  verifySessionAccess,
  getSessionMessages,
  processUserMessage,
  deleteSession,
  recordFeedback,
} from '../services/chat.service.js';

/**
 * POST /api/chat/sessions — Create a new conversation session.
 */
export async function handleCreateSession(req, res, next) {
  try {
    const { title } = req.body || {};
    const userId = req.user?.id || null;
    const guestSessionId = req.guestSessionId || null;

    const session = await createSession({
      userId,
      guestSessionId,
      title,
    });

    res.status(201).json({
      success: true,
      message: 'Khởi tạo phiên trò chuyện thành công.',
      data: session,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/chat/sessions — List sessions of current user or guest.
 */
export async function handleGetSessions(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const guestSessionId = req.guestSessionId || null;
    const { limit, offset } = req.query;

    const sessions = await getUserSessions({
      userId,
      guestSessionId,
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/chat/sessions/:sessionCode/messages — Retrieve message history.
 */
export async function handleGetMessages(req, res, next) {
  try {
    const { sessionCode } = req.params;
    const userId = req.user?.id || null;
    const guestSessionId = req.guestSessionId || null;
    const userRole = req.user?.role || null;

    // Verify ownership and IDOR protection
    const session = await verifySessionAccess(sessionCode, {
      userId,
      guestSessionId,
      userRole,
    });

    const messages = await getSessionMessages(session.id);

    res.status(200).json({
      success: true,
      data: {
        session: {
          sessionCode: session.session_code,
          title: session.title,
          status: session.status,
          createdAt: session.created_at,
        },
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/chat/sessions/:sessionCode/messages — Send user message and get reply.
 */
export async function handleSendMessage(req, res, next) {
  try {
    const { sessionCode } = req.params;
    const { content, clientContext } = req.body;
    const userId = req.user?.id || null;
    const guestSessionId = req.guestSessionId || null;
    const userRole = req.user?.role || null;

    // Verify ownership and IDOR protection
    const session = await verifySessionAccess(sessionCode, {
      userId,
      guestSessionId,
      userRole,
    });

    const exchange = await processUserMessage({
      session,
      content,
      clientContext,
      user: req.user,
    });

    res.status(201).json({
      success: true,
      message: 'Gửi tin nhắn thành công.',
      data: exchange,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/chat/sessions/:sessionCode — Delete chat session.
 */
export async function handleDeleteSession(req, res, next) {
  try {
    const { sessionCode } = req.params;
    const userId = req.user?.id || null;
    const guestSessionId = req.guestSessionId || null;
    const userRole = req.user?.role || null;

    // Verify ownership before deleting
    const session = await verifySessionAccess(sessionCode, {
      userId,
      guestSessionId,
      userRole,
    });

    await deleteSession(session.id);

    res.status(200).json({
      success: true,
      message: 'Đã xóa phiên trò chuyện thành công.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/chat/feedback — Submit rating for AI response.
 */
export async function handleSaveFeedback(req, res, next) {
  try {
    const { sessionCode, messageId, rating, comment } = req.body;
    const userId = req.user?.id || null;
    const guestSessionId = req.guestSessionId || null;
    const userRole = req.user?.role || null;

    // Verify that client owns the session before submitting feedback
    const session = await verifySessionAccess(sessionCode, {
      userId,
      guestSessionId,
      userRole,
    });

    const feedback = await recordFeedback({
      session,
      messageId,
      userId,
      guestSessionId,
      rating,
      comment,
    });

    res.status(201).json({
      success: true,
      message: 'Cảm ơn quý khách đã gửi đánh giá phản hồi.',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
}

