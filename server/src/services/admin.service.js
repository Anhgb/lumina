import { pool } from '../config/database.js';
import { BadRequestError, ConflictError, NotFoundError } from '../middleware/errorHandler.js';
import { listPaymentHistory } from './payment.service.js';
import { triggerOrderConfirmed, triggerOrderProcessing } from './notification.service.js';

/**
 * admin.service.js — Authoritative Business Logic & MySQL Queries for Admin Dashboard.
 * Conforms to PRD Section 6 & Prompt 8 (Admin Dashboard & Order Management):
 * - Aggregates real-time stats directly from MySQL (Zero hardcoded metrics)
 * - Manages order listings, pagination, filtering and 3D custom specs inspection
 * - Enforces strict state machine for order status transitions
 * - Manages product catalog pricing and inventory levels in MySQL
 */

// Valid Order Status State Machine Transitions
export const VALID_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

/**
 * 1. Calculate live statistics from MySQL
 */
export async function getAdminStats() {
  // Aggregate order metrics
  const [orderMetrics] = await pool.query(`
    SELECT
      COUNT(*) AS totalOrders,
      COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS totalRevenue,
      COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END), 0) AS completedRevenue,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pendingCount,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS confirmedCount,
      COUNT(CASE WHEN status = 'processing' THEN 1 END) AS processingCount,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completedCount,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelledCount
    FROM orders
  `);

  // Count bespoke 3D orders
  const [bespokeMetrics] = await pool.query(`
    SELECT COUNT(DISTINCT order_id) AS bespokeOrdersCount
    FROM order_items
    WHERE product_type = 'custom'
  `);

  // Aggregate product inventory metrics
  const [inventoryMetrics] = await pool.query(`
    SELECT
      COUNT(*) AS totalProducts,
      COUNT(CASE WHEN stock <= 5 THEN 1 END) AS lowStockCount,
      COUNT(CASE WHEN is_active = 1 THEN 1 END) AS activeProductsCount
    FROM products
  `);

  // Fetch specific low-stock alert items (stock <= 5)
  const [lowStockProducts] = await pool.query(`
    SELECT id, name, category, category_label, price, stock, is_active
    FROM products
    WHERE stock <= 5
    ORDER BY stock ASC, name ASC
    LIMIT 10
  `);

  const stats = orderMetrics[0] || {};
  const activeOrdersCount =
    (parseInt(stats.pendingCount, 10) || 0) +
    (parseInt(stats.confirmedCount, 10) || 0) +
    (parseInt(stats.processingCount, 10) || 0);

  return {
    totalOrders: parseInt(stats.totalOrders, 10) || 0,
    totalRevenue: parseFloat(stats.totalRevenue) || 0,
    completedRevenue: parseFloat(stats.completedRevenue) || 0,
    activeOrdersCount,
    statusBreakdown: {
      pending: parseInt(stats.pendingCount, 10) || 0,
      confirmed: parseInt(stats.confirmedCount, 10) || 0,
      processing: parseInt(stats.processingCount, 10) || 0,
      completed: parseInt(stats.completedCount, 10) || 0,
      cancelled: parseInt(stats.cancelledCount, 10) || 0,
    },
    bespokeOrdersCount: parseInt(bespokeMetrics[0]?.bespokeOrdersCount, 10) || 0,
    inventory: {
      totalProducts: parseInt(inventoryMetrics[0]?.totalProducts, 10) || 0,
      activeProductsCount: parseInt(inventoryMetrics[0]?.activeProductsCount, 10) || 0,
      lowStockCount: parseInt(inventoryMetrics[0]?.lowStockCount, 10) || 0,
      lowStockProducts,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 2. Fetch paginated order list with search and status filtering
 */
export async function getAdminOrders({ page = 1, limit = 10, status, search }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  const whereClauses = [];
  const queryParams = [];

  // Filter by status
  if (status && status !== 'all') {
    const validStatuses = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
    if (validStatuses.includes(status.toLowerCase())) {
      whereClauses.push('o.status = ?');
      queryParams.push(status.toLowerCase());
    }
  }

  // Search by order_code, customer_name, customer_phone, or customer_email
  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    whereClauses.push(
      '(o.order_code LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.customer_email LIKE ?)'
    );
    queryParams.push(term, term, term, term);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total matching orders
  const countSql = `SELECT COUNT(*) AS total FROM orders o ${whereSql}`;
  const [countResult] = await pool.query(countSql, queryParams);
  const totalOrders = countResult[0]?.total || 0;
  const totalPages = Math.ceil(totalOrders / limitNum) || 1;

  // Query paginated orders with item count & 3D custom items indicator
  const ordersSql = `
    SELECT
      o.id,
      o.order_code,
      o.user_id,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.shipping_city,
      o.payment_method,
      o.payment_status,
      o.total_amount,
      o.status,
      o.created_at,
      o.updated_at,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS total_items,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id AND oi.product_type = 'custom') AS custom_items_count
    FROM orders o
    ${whereSql}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [orders] = await pool.query(ordersSql, [...queryParams, limitNum, offset]);

  return {
    orders: orders.map((ord) => ({
      ...ord,
      total_amount: parseFloat(ord.total_amount),
      total_items: parseInt(ord.total_items, 10) || 0,
      custom_items_count: parseInt(ord.custom_items_count, 10) || 0,
      has_bespoke: (parseInt(ord.custom_items_count, 10) || 0) > 0,
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalOrders,
      totalPages,
    },
  };
}

/**
 * 3. Fetch comprehensive order details by orderCode
 */
export async function getAdminOrderDetails(orderCode) {
  const [orders] = await pool.query('SELECT * FROM orders WHERE order_code = ?', [orderCode]);

  if (orders.length === 0) {
    throw new NotFoundError(`Không tìm thấy đơn hàng với mã "${orderCode}".`);
  }

  const order = orders[0];
  const payments = await listPaymentHistory(order.id);

  // Fetch items joined with custom_specs
  const [items] = await pool.query(
    `SELECT
      oi.id AS order_item_id,
      oi.product_id,
      oi.product_type,
      oi.product_name,
      oi.quantity,
      oi.unit_price,
      oi.subtotal,
      oi.prescription_data,
      cs.id AS custom_spec_id,
      cs.base_model,
      cs.frame_type,
      cs.frame_color,
      cs.metalness,
      cs.roughness,
      cs.lens_color,
      cs.lens_opacity,
      cs.has_rhinestones,
      cs.charms,
      cs.engraving_text,
      cs.snapshot_path,
      cs.temple_style,
      cs.engraving_placement
    FROM order_items oi
    LEFT JOIN custom_specs cs ON oi.id = cs.order_item_id
    WHERE oi.order_id = ?
    ORDER BY oi.id ASC`,
    [order.id]
  );

  const formattedItems = items.map((item) => {
    let prescription = null;
    if (item.prescription_data) {
      try {
        prescription =
          typeof item.prescription_data === 'string'
            ? JSON.parse(item.prescription_data)
            : item.prescription_data;
      } catch {
        prescription = item.prescription_data;
      }
    }

    let charms = [];
    if (item.charms) {
      try {
        charms = typeof item.charms === 'string' ? JSON.parse(item.charms) : item.charms;
      } catch {
        charms = [];
      }
    }

    return {
      orderItemId: item.order_item_id,
      productId: item.product_id,
      productType: item.product_type,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      subtotal: parseFloat(item.subtotal),
      prescription,
      customSpec:
        item.product_type === 'custom' || item.base_model
          ? {
              baseModel: item.base_model,
              frameType: item.frame_type,
              frameColor: item.frame_color,
              metalness: parseFloat(item.metalness),
              roughness: parseFloat(item.roughness),
              lensColor: item.lens_color,
              lensOpacity: parseFloat(item.lens_opacity),
              hasRhinestones: Boolean(item.has_rhinestones),
              charms,
              engravingText: item.engraving_text,
              snapshotPath: item.snapshot_path,
              templeStyle: item.temple_style || 'classic-acetate',
              engravingPlacement: item.engraving_placement || 'outer_temple',
            }
          : null,
    };
  });

  return {
    ...order,
    subtotal_amount: parseFloat(order.subtotal_amount),
    shipping_fee: parseFloat(order.shipping_fee),
    discount_amount: parseFloat(order.discount_amount),
    total_amount: parseFloat(order.total_amount),
    payments,
    items: formattedItems,
  };
}

/**
 * 4. Update order status adhering to strict state transitions
 */
export async function updateOrderStatus(orderCode, newStatus) {
  const validStatuses = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
  const targetStatus = (newStatus || '').toLowerCase().trim();

  if (!validStatuses.includes(targetStatus)) {
    throw new BadRequestError(
      `Trạng thái "${newStatus}" không hợp lệ. Các trạng thái được chấp nhận: ${validStatuses.join(', ')}.`
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Query current order with row lock
    const [orders] = await connection.query(
      'SELECT id, order_code, status, total_amount, payment_status FROM orders WHERE order_code = ? FOR UPDATE',
      [orderCode]
    );

    if (orders.length === 0) {
      throw new NotFoundError(`Không tìm thấy đơn hàng với mã "${orderCode}".`);
    }

    const currentOrder = orders[0];
    const currentStatus = currentOrder.status;

    // If identical, return early without error
    if (currentStatus === targetStatus) {
      await connection.commit();
      return {
        orderCode,
        previousStatus: currentStatus,
        status: targetStatus,
        message: 'Trạng thái đơn hàng không thay đổi.',
      };
    }

    // Check valid transition from state machine
    const allowedNextStatuses = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(targetStatus)) {
      throw new BadRequestError(
        `Không thể chuyển trạng thái từ "${currentStatus}" sang "${targetStatus}". Các trạng thái cho phép tiếp theo: ${
          allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'Không có (Trạng thái kết thúc)'
        }.`
      );
    }

    if (targetStatus === 'cancelled' && currentOrder.payment_status === 'paid') {
      throw new ConflictError('Đơn đã thanh toán; cần xử lý hoàn tiền trước khi hủy đơn.');
    }

    // If cancelling an order, return catalog items back to inventory stock
    if (targetStatus === 'cancelled') {
      const [items] = await connection.query(
        'SELECT product_id, quantity, product_type FROM order_items WHERE order_id = ?',
        [currentOrder.id]
      );

      for (const item of items) {
        if (item.product_type === 'catalog') {
          await connection.query(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
        }
      }
    }

    // Update status in orders table
    await connection.query(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [targetStatus, currentOrder.id]
    );

    await connection.commit();

    // Trigger non-blocking event-driven notifications (Prompt 06)
    if (targetStatus === 'confirmed') {
      triggerOrderConfirmed({ ...currentOrder, id: currentOrder.id, order_code: orderCode }).catch(() => {});
    } else if (targetStatus === 'processing') {
      triggerOrderProcessing({ ...currentOrder, id: currentOrder.id, order_code: orderCode }).catch(() => {});
    }

    return {
      orderCode,
      previousStatus: currentStatus,
      status: targetStatus,
      message: `Đã cập nhật trạng thái đơn hàng thành công sang "${targetStatus}".`,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 5. Fetch all products from MySQL for Admin inventory management
 */
export async function getAdminProducts({ category, search, lowStock } = {}) {
  const whereClauses = [];
  const queryParams = [];

  if (category && category !== 'all') {
    whereClauses.push('category = ?');
    queryParams.push(category);
  }

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    whereClauses.push('(id LIKE ? OR name LIKE ? OR category_label LIKE ?)');
    queryParams.push(term, term, term);
  }

  if (lowStock === true || lowStock === 'true') {
    whereClauses.push('stock <= 5');
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT
      id,
      name,
      category,
      category_label,
      price,
      original_price,
      stock,
      is_active,
      frame_material,
      dimensions,
      image_url,
      created_at,
      updated_at
    FROM products
    ${whereSql}
    ORDER BY stock ASC, name ASC
  `;

  const [products] = await pool.query(sql, queryParams);

  return products.map((p) => ({
    ...p,
    price: parseFloat(p.price),
    original_price: p.original_price ? parseFloat(p.original_price) : null,
    stock: parseInt(p.stock, 10),
    is_active: Boolean(p.is_active),
    isLowStock: p.stock <= 5,
  }));
}

/**
 * 6. Update product inventory and price in MySQL
 */
export async function updateAdminProduct(productId, updates = {}) {
  const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);

  if (existing.length === 0) {
    throw new NotFoundError(`Sản phẩm với mã "${productId}" không tồn tại.`);
  }

  const current = existing[0];
  const fields = [];
  const params = [];

  if (updates.stock !== undefined) {
    const stockVal = parseInt(updates.stock, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      throw new BadRequestError('Số lượng tồn kho (stock) phải là số nguyên không âm (>= 0).');
    }
    fields.push('stock = ?');
    params.push(stockVal);
  }

  if (updates.price !== undefined) {
    const priceVal = parseFloat(updates.price);
    if (isNaN(priceVal) || priceVal <= 0) {
      throw new BadRequestError('Đơn giá sản phẩm (price) phải là số dương (> 0).');
    }
    fields.push('price = ?');
    params.push(priceVal);
  }

  if (updates.is_active !== undefined) {
    const activeVal = updates.is_active === true || updates.is_active === 1 || updates.is_active === '1' ? 1 : 0;
    fields.push('is_active = ?');
    params.push(activeVal);
  }

  if (fields.length === 0) {
    return {
      id: productId,
      name: current.name,
      stock: current.stock,
      price: parseFloat(current.price),
      is_active: Boolean(current.is_active),
      message: 'Không có thông tin thay đổi.',
    };
  }

  params.push(productId);

  await pool.query(
    `UPDATE products SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  );

  const [updated] = await pool.query('SELECT * FROM products WHERE id = ?', [productId]);
  const product = updated[0];

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: parseFloat(product.price),
    stock: parseInt(product.stock, 10),
    is_active: Boolean(product.is_active),
    updated_at: product.updated_at,
    message: 'Cập nhật sản phẩm thành công.',
  };
}
