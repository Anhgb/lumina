import careService from '../services/care.service.js';

/**
 * Controller xử lý các yêu cầu Lumina Care cho Customer và Admin.
 */

// ── Customer Handlers ──

export async function createCareRequest(req, res, next) {
  try {
    const userId = req.user?.id;
    const { orderId, orderCode, orderItemId, requestType, title, description, contactPhone } = req.body;

    const result = await careService.createCareRequest({
      userId,
      orderIdOrCode: orderId || orderCode,
      orderItemId,
      requestType,
      title,
      description,
      contactPhone,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyCareRequests(req, res, next) {
  try {
    const userId = req.user?.id;
    const requests = await careService.getCustomerCareRequests(userId);
    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyCareRequestByCode(req, res, next) {
  try {
    const userId = req.user?.id;
    const { ticketCode } = req.params;
    const request = await careService.getCustomerCareRequestByCode(userId, ticketCode);
    return res.status(200).json({
      success: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
}

export async function addCustomerMessage(req, res, next) {
  try {
    const userId = req.user?.id;
    const { ticketCode } = req.params;
    const { content } = req.body;
    const result = await careService.addCustomerMessage(userId, ticketCode, content);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function rateCareRequest(req, res, next) {
  try {
    const userId = req.user?.id;
    const { ticketCode } = req.params;
    const { rating, feedback } = req.body;
    const result = await careService.rateCareRequest(userId, ticketCode, rating, feedback);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmCustomerReceipt(req, res, next) {
  try {
    const userId = req.user?.id;
    const { orderCode } = req.params;
    const { note } = req.body || {};
    const result = await careService.confirmCustomerReceipt(userId, orderCode, note);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function checkWarrantyCoverage(req, res, next) {
  try {
    const { orderCode } = req.params;
    const { orderItemId } = req.query;
    const result = await careService.checkWarrantyCoverage(orderCode, orderItemId ? parseInt(orderItemId, 10) : null);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

// ── Admin Handlers ──

export async function getAdminCareRequests(req, res, next) {
  try {
    const { page, limit, status, requestType, search } = req.query;
    const result = await careService.getAdminCareRequests({
      page,
      limit,
      status,
      requestType,
      search,
    });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminCareRequestByCode(req, res, next) {
  try {
    const { ticketCode } = req.params;
    const request = await careService.getAdminCareRequestByCode(ticketCode);
    return res.status(200).json({
      success: true,
      data: request,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminCareStatus(req, res, next) {
  try {
    const { ticketCode } = req.params;
    const adminId = req.user?.id || 'admin';
    const { nextStatus, assignedTo, resolutionSummary, note, isInternalOnly } = req.body;

    const result = await careService.updateAdminCareStatus(ticketCode, {
      nextStatus,
      adminId,
      assignedTo,
      resolutionSummary,
      note,
      isInternalOnly: Boolean(isInternalOnly),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function addAdminCareEvent(req, res, next) {
  try {
    const { ticketCode } = req.params;
    const adminId = req.user?.id || 'admin';
    const { content, isInternalOnly } = req.body;

    const result = await careService.addAdminCareEvent(ticketCode, {
      adminId,
      content,
      isInternalOnly: Boolean(isInternalOnly),
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmAdminOrderDelivery(req, res, next) {
  try {
    const { orderCode } = req.params;
    const adminId = req.user?.id || 'admin';
    const { carrierName, trackingCode, deliveredAt, proofNote } = req.body;

    const result = await careService.confirmAdminOrderDelivery({
      orderIdOrCode: orderCode,
      carrierName,
      trackingCode,
      deliveredAt,
      adminId,
      proofNote,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  createCareRequest,
  getMyCareRequests,
  getMyCareRequestByCode,
  addCustomerMessage,
  rateCareRequest,
  confirmCustomerReceipt,
  checkWarrantyCoverage,
  getAdminCareRequests,
  getAdminCareRequestByCode,
  updateAdminCareStatus,
  addAdminCareEvent,
  confirmAdminOrderDelivery,
};

