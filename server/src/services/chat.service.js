import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../middleware/errorHandler.js';
import { generateLuminaResponse } from '../ai/ai.service.js';

/**
 * Generates a unique, high-entropy session code.
 * Format: SES-<timestamp_base36>-<hex_random> (e.g. SES-M2K91A-8F4C2E9A)
 */
function generateSessionCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `SES-${ts}-${rand}`;
}

const INITIAL_WELCOME_TEXT = `Xin chào! Tôi là Lumina AI Assistant ✦\n\nTôi có thể giúp bạn lựa chọn gọng kính phù hợp, tư vấn thiết kế kính 3D, hỗ trợ thử kính AI và giải đáp các câu hỏi về đơn hàng.\n\nBạn cần tôi hỗ trợ điều gì hôm nay?`;

/**
 * 1. Create a new chat session for Customer or Guest.
 */
export async function createSession({ userId = null, guestSessionId = null, title = null }) {
  if (!userId && !guestSessionId) {
    throw new BadRequestError('Cần cung cấp thông tin tài khoản hoặc guestSessionId để khởi tạo phiên trò chuyện.');
  }

  const sessionCode = generateSessionCode();
  const finalTitle = title && title.trim() ? title.trim() : 'Tư vấn Lumina Concierge';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO chat_sessions (session_code, user_id, guest_session_id, title, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [sessionCode, userId, guestSessionId, finalTitle]
    );

    const sessionId = result.insertId;

    // Seed the initial welcome message from Lumina Concierge
    const [msgResult] = await connection.query(
      `INSERT INTO chat_messages (session_id, role, content, message_type, metadata)
       VALUES (?, 'assistant', ?, 'welcome', ?)`,
      [
        sessionId,
        INITIAL_WELCOME_TEXT,
        JSON.stringify({
          quickActions: [
            'Tư vấn chọn kính',
            'Tìm sản phẩm',
            'Khám phá 3D Atelier',
            'Hỗ trợ đơn hàng',
          ],
        }),
      ]
    );

    await connection.commit();

    return {
      id: sessionId,
      sessionCode,
      userId,
      guestSessionId,
      title: finalTitle,
      status: 'active',
      createdAt: new Date().toISOString(),
      initialMessage: {
        id: msgResult.insertId,
        role: 'assistant',
        content: INITIAL_WELCOME_TEXT,
        messageType: 'welcome',
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 2. Get list of active sessions for the current user or guest.
 */
export async function getUserSessions({ userId = null, guestSessionId = null, limit = 20, offset = 0 }) {
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

  let query = '';
  let params = [];

  if (userId) {
    query = `
      SELECT id, session_code, user_id, guest_session_id, title, status, created_at, updated_at
      FROM chat_sessions
      WHERE user_id = ? AND status != 'deleted'
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;
    params = [userId, safeLimit, safeOffset];
  } else if (guestSessionId) {
    query = `
      SELECT id, session_code, user_id, guest_session_id, title, status, created_at, updated_at
      FROM chat_sessions
      WHERE guest_session_id = ? AND user_id IS NULL AND status != 'deleted'
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;
    params = [guestSessionId, safeLimit, safeOffset];
  } else {
    return [];
  }

  const [rows] = await pool.query(query, params);
  return rows.map((row) => ({
    id: row.id,
    sessionCode: row.session_code,
    userId: row.user_id,
    guestSessionId: row.guest_session_id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * 3. Verify session ownership & enforce IDOR protection.
 */
export async function verifySessionAccess(sessionCode, { userId = null, guestSessionId = null, userRole = null }) {
  const [rows] = await pool.query(
    `SELECT * FROM chat_sessions WHERE session_code = ? AND status != 'deleted'`,
    [sessionCode]
  );

  if (rows.length === 0) {
    throw new NotFoundError(`Không tìm thấy phiên trò chuyện với mã "${sessionCode}".`);
  }

  const session = rows[0];

  // RBAC & IDOR Rules:
  // Rule A: Admin is NOT permitted by default to inspect private customer chats
  if (userRole === 'admin') {
    throw new ForbiddenError('Quản trị viên không có quyền truy cập nội dung trò chuyện riêng tư của khách hàng.');
  }

  // Rule B: Registered Customer session ownership check
  if (session.user_id) {
    if (!userId || session.user_id !== userId) {
      throw new ForbiddenError('Bạn không có quyền truy cập phiên trò chuyện này.');
    }
    return session;
  }

  // Rule C: Guest session ownership check
  if (session.guest_session_id) {
    if (!guestSessionId || session.guest_session_id !== guestSessionId) {
      throw new ForbiddenError('Bạn không có quyền truy cập phiên trò chuyện của khách khác.');
    }
    return session;
  }

  throw new ForbiddenError('Không xác định được quyền sở hữu phiên trò chuyện.');
}

/**
 * 4. Fetch all messages in a verified session.
 */
export async function getSessionMessages(sessionId) {
  const [rows] = await pool.query(
    `SELECT id, session_id, role, content, message_type, metadata, created_at
     FROM chat_messages
     WHERE session_id = ?
     ORDER BY created_at ASC, id ASC`,
    [sessionId]
  );

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    messageType: row.message_type,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    createdAt: row.created_at,
  }));
}

/**
 * Helper to generate assistant responses backed by Hybrid AI & rules.
 */
export async function generateAssistantReply(content, user = null, clientContext = null, history = []) {
  return generateLuminaResponse({ content, user, clientContext, history });
}

/**
 * 5. Send message in session, process with assistant, and store both messages.
 */
export async function processUserMessage({ session, content, clientContext = null, user = null }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // A. Fetch recent message history before inserting current message (up to 10 messages)
    const [historyRows] = await connection.query(
      `SELECT role, content, message_type
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY id DESC
       LIMIT 10`,
      [session.id]
    );
    const history = historyRows.reverse();

    // B. Insert User message
    const [userMsgResult] = await connection.query(
      `INSERT INTO chat_messages (session_id, role, content, message_type, metadata)
       VALUES (?, 'user', ?, 'text', ?)`,
      [session.id, content, clientContext ? JSON.stringify(clientContext) : null]
    );

    // C. Generate assistant reply via Hybrid AI Orchestrator
    const reply = await generateLuminaResponse({
      content,
      user,
      clientContext,
      history,
    });

    // D. Insert Assistant message
    const [aiMsgResult] = await connection.query(
      `INSERT INTO chat_messages (session_id, role, content, message_type, metadata)
       VALUES (?, 'assistant', ?, ?, ?)`,
      [
        session.id,
        reply.content,
        reply.messageType || 'text',
        reply.metadata ? JSON.stringify(reply.metadata) : null,
      ]
    );

    // E. Update session updated_at
    await connection.query(
      `UPDATE chat_sessions SET updated_at = NOW() WHERE id = ?`,
      [session.id]
    );

    await connection.commit();

    return {
      userMessage: {
        id: userMsgResult.insertId,
        sessionId: session.id,
        role: 'user',
        content,
        messageType: 'text',
        createdAt: new Date().toISOString(),
      },
      assistantMessage: {
        id: aiMsgResult.insertId,
        sessionId: session.id,
        role: 'assistant',
        content: reply.content,
        messageType: reply.messageType || 'text',
        metadata: reply.metadata || null,
        createdAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 6. Delete a chat session and cascade related records.
 */
export async function deleteSession(sessionId) {
  const [result] = await pool.query(
    `DELETE FROM chat_sessions WHERE id = ?`,
    [sessionId]
  );
  return result.affectedRows > 0;
}

/**
 * 7. Submit user feedback for an AI message.
 */
export async function recordFeedback({ session, messageId = null, userId = null, guestSessionId = null, rating, comment = null }) {
  const [result] = await pool.query(
    `INSERT INTO chat_feedbacks (session_id, message_id, user_id, guest_session_id, rating, comment)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [session.id, messageId, userId, guestSessionId, rating, comment ? comment.trim() : null]
  );

  return {
    id: result.insertId,
    sessionId: session.id,
    sessionCode: session.session_code,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
}

