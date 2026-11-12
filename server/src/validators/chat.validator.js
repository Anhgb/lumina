import { BadRequestError } from '../middleware/errorHandler.js';

const SESSION_CODE_REGEX = /^[a-zA-Z0-9_-]{6,64}$/;

/**
 * Validates request payload for creating a new chat session.
 */
export function validateCreateSession(req, res, next) {
  const { title, guestSessionId } = req.body || {};

  // If unauthenticated, verify guestSessionId is available either from header or body
  if (!req.user) {
    const effectiveGuestId = req.guestSessionId || guestSessionId;
    if (!effectiveGuestId || typeof effectiveGuestId !== 'string' || effectiveGuestId.trim().length < 8) {
      return next(
        new BadRequestError('Khách vãng lai cần cung cấp định danh phiên tạm thời (guestSessionId).')
      );
    }
    req.guestSessionId = effectiveGuestId.trim();
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length > 255) {
      return next(new BadRequestError('Tiêu đề cuộc trò chuyện không được vượt quá 255 ký tự.'));
    }
  }

  next();
}

/**
 * Validates session code parameter in route URL (/sessions/:sessionCode).
 */
export function validateSessionCodeParam(req, res, next) {
  const { sessionCode } = req.params;

  if (!sessionCode || !SESSION_CODE_REGEX.test(sessionCode)) {
    return next(new BadRequestError('Mã phiên trò chuyện không hợp lệ.'));
  }

  next();
}

/**
 * Validates message submission payload.
 */
export function validateSendMessage(req, res, next) {
  const { content, clientContext } = req.body || {};

  if (content === undefined || content === null || typeof content !== 'string') {
    return next(new BadRequestError('Nội dung tin nhắn không được để trống.'));
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return next(new BadRequestError('Nội dung tin nhắn không được để trống.'));
  }

  if (trimmed.length > 1000) {
    return next(new BadRequestError('Nội dung tin nhắn không được vượt quá 1000 ký tự.'));
  }

  if (clientContext !== undefined && (typeof clientContext !== 'object' || clientContext === null)) {
    return next(new BadRequestError('Ngữ cảnh gửi kèm (clientContext) phải là đối tượng hợp lệ.'));
  }

  req.body.content = trimmed;
  next();
}

/**
 * Validates chat feedback submission.
 */
export function validateFeedback(req, res, next) {
  const { sessionCode, rating, comment } = req.body || {};

  if (!sessionCode || typeof sessionCode !== 'string' || !SESSION_CODE_REGEX.test(sessionCode)) {
    return next(new BadRequestError('Mã phiên trò chuyện (sessionCode) không hợp lệ.'));
  }

  if (rating !== 'liked' && rating !== 'disliked') {
    return next(new BadRequestError('Đánh giá phản hồi chỉ chấp nhận "liked" hoặc "disliked".'));
  }

  if (comment !== undefined && comment !== null) {
    if (typeof comment !== 'string' || comment.trim().length > 1000) {
      return next(new BadRequestError('Nội dung nhận xét không được vượt quá 1000 ký tự.'));
    }
  }

  next();
}

