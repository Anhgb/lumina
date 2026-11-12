import { backendClient } from './apiClient';

/**
 * chatService.js — Frontend API client for Lumina AI Assistant.
 * Connects with Express Backend /api/chat endpoints.
 */

const GUEST_SESSION_STORAGE_KEY = 'lumina_guest_chat_session_id';

/**
 * Retrieves or generates a consistent guest session UUID for anonymous users.
 */
export function getOrCreateGuestSessionId() {
  try {
    let guestId = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(GUEST_SESSION_STORAGE_KEY, guestId);
    }
    return guestId;
  } catch {
    return `guest_fallback_${Date.now()}`;
  }
}

/**
 * Returns common headers for chat API calls.
 */
function getChatHeaders() {
  const headers = {};
  const guestId = getOrCreateGuestSessionId();
  if (guestId) {
    headers['x-guest-session-id'] = guestId;
  }
  return headers;
}

/**
 * 1. Create a new chat session
 * @param {Object} payload { title, metadata }
 */
export async function createChatSession(payload = {}) {
  try {
    const res = await backendClient.post('/api/chat/sessions', payload, {
      headers: getChatHeaders(),
    });
    return res.data;
  } catch (err) {
    handleChatError(err, 'Không thể khởi tạo phiên trò chuyện với Lumina AI.');
  }
}

/**
 * 2. Get list of sessions for current user/guest
 */
export async function getChatSessions(params = {}) {
  try {
    const res = await backendClient.get('/api/chat/sessions', {
      params,
      headers: getChatHeaders(),
    });
    return res.data;
  } catch (err) {
    handleChatError(err, 'Không thể tải danh sách phiên hội thoại.');
  }
}

/**
 * 3. Get message history for a session
 * @param {string} sessionCode
 */
export async function getChatMessages(sessionCode) {
  try {
    const res = await backendClient.get(`/api/chat/sessions/${encodeURIComponent(sessionCode)}/messages`, {
      headers: getChatHeaders(),
    });
    return res.data;
  } catch (err) {
    handleChatError(err, 'Không thể tải lịch sử tin nhắn.');
  }
}

/**
 * 4. Send a message and receive AI reply
 * @param {string} sessionCode
 * @param {Object} payload { content, metadata, clientContext }
 */
export async function sendChatMessage(sessionCode, payload) {
  try {
    // Sanitize clientContext: đảm bảo không gửi dữ liệu sinh trắc học hay ảnh camera
    const sanitizedPayload = { ...payload };
    if (sanitizedPayload.clientContext) {
      const ctx = sanitizedPayload.clientContext;
      // Chỉ cho phép các trường an toàn
      sanitizedPayload.clientContext = {
        currentPage: ctx.currentPage,
        pageType: ctx.pageType,
        ...(ctx.designSpec && { designSpec: ctx.designSpec }),
        ...(ctx.customPrice && { customPrice: ctx.customPrice }),
        ...(ctx.detectedFaceShape && { detectedFaceShape: ctx.detectedFaceShape }),
        ...(ctx.activeFrameModel && { activeFrameModel: ctx.activeFrameModel }),
        ...(ctx.activeProductId && { activeProductId: ctx.activeProductId }),
      };
    }

    const res = await backendClient.post(
      `/api/chat/sessions/${encodeURIComponent(sessionCode)}/messages`,
      sanitizedPayload,
      {
        headers: getChatHeaders(),
      }
    );
    return res.data;
  } catch (err) {
    handleChatError(err, 'Không thể gửi tin nhắn đến Lumina AI.');
  }
}

/**
 * 5. Delete a session (soft/hard per policy)
 * @param {string} sessionCode
 */
export async function deleteChatSession(sessionCode) {
  try {
    const res = await backendClient.delete(`/api/chat/sessions/${encodeURIComponent(sessionCode)}`, {
      headers: getChatHeaders(),
    });
    return res.data;
  } catch (err) {
    handleChatError(err, 'Không thể xóa phiên hội thoại.');
  }
}

/**
 * 6. Submit feedback for an AI message
 * @param {Object} payload { messageId, rating, feedbackText }
 */
export async function submitChatFeedback(payload) {
  try {
    const res = await backendClient.post('/api/chat/feedback', payload, {
      headers: getChatHeaders(),
    });
    return res.data;
  } catch (err) {
    handleChatError(err, 'Không thể gửi đánh giá phản hồi.');
  }
}

function handleChatError(error, defaultMessage) {
  if (error.response) {
    const errData = error.response.data || {};
    const err = new Error(errData.message || defaultMessage);
    err.status = error.response.status;
    err.code = errData.code;
    throw err;
  } else if (error.request) {
    const err = new Error(
      'Không thể kết nối đến máy chủ trợ lý Lumina AI. Vui lòng kiểm tra lại kết nối mạng.'
    );
    err.status = 503;
    throw err;
  } else {
    throw error;
  }
}

