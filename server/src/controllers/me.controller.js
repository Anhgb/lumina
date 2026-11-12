import {
  getCustomerProfile,
  getCustomerOrders,
  getCustomerOrderByCode,
  getCustomerBespokeDesigns,
} from '../services/me.service.js';

/**
 * me.controller.js — Request Handlers for Authenticated Customer Endpoints.
 * Conforms to Customer Retention PRD (Prompt 02).
 */

export async function handleGetProfile(req, res, next) {
  try {
    const profile = await getCustomerProfile(req.user.id, req.user);
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetOrders(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const result = await getCustomerOrders(req.user.id, { page, limit, status });
    res.status(200).json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetOrderDetails(req, res, next) {
  try {
    const { orderCode } = req.params;
    const order = await getCustomerOrderByCode(req.user.id, orderCode);
    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function handleGetDesigns(req, res, next) {
  try {
    const designs = await getCustomerBespokeDesigns(req.user.id);
    res.status(200).json({
      success: true,
      data: designs,
    });
  } catch (error) {
    next(error);
  }
}

