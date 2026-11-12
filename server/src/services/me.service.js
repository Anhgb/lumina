import { pool } from '../config/database.js';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler.js';

/**
 * me.service.js — Authoritative Service for Logged-in Customer Portal.
 * Conforms to Customer Retention PRD (Prompt 02):
 * - Enforces server-side identity & ownership
 * - Aggregates customer order history, bespoke designs, and profile metrics
 * - Prevents IDOR: never accepts client-provided userId
 */

/**
 * Get profile, order metrics and loyalty status for the authenticated customer.
 */
export async function getCustomerProfile(userId, userObj = {}) {
  // 1. Aggregate customer order metrics from MySQL
  const [metricsRows] = await pool.query(
    `SELECT 
       COUNT(*) AS total_orders,
       COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS total_spent,
       COUNT(CASE WHEN status IN ('pending', 'confirmed', 'processing') THEN 1 END) AS active_orders,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_orders,
       MAX(created_at) AS last_order_at
     FROM orders
     WHERE user_id = ?`,
    [userId]
  );

  const metrics = metricsRows[0] || {
    total_orders: 0,
    total_spent: 0,
    active_orders: 0,
    completed_orders: 0,
    last_order_at: null,
  };

  const totalSpent = parseFloat(metrics.total_spent) || 0;
  const totalOrders = parseInt(metrics.total_orders, 10) || 0;
  const activeOrders = parseInt(metrics.active_orders, 10) || 0;
  const completedOrders = parseInt(metrics.completed_orders, 10) || 0;

  // 2. Count 3D Bespoke designs ordered
  const [bespokeRows] = await pool.query(
    `SELECT COUNT(cs.id) AS custom_count
     FROM custom_specs cs
     JOIN order_items oi ON cs.order_item_id = oi.id
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = ?`,
    [userId]
  );

  const customOrdersCount = parseInt(bespokeRows[0]?.custom_count, 10) || 0;

  // 3. Draft Loyalty Tier calculation (conforms to Architecture Draft Rules)
  // 1% of total spent = points. Tiers: Member (0-49), Silver (50-199), Gold (200-499), Diamond (500+)
  const draftPoints = Math.floor(totalSpent / 100000);
  let draftTier = 'member';
  let draftTierLabel = 'Thành Viên Lumina';

  if (draftPoints >= 500) {
    draftTier = 'diamond';
    draftTierLabel = 'Hạng Kim Cương (Diamond)';
  } else if (draftPoints >= 200) {
    draftTier = 'gold';
    draftTierLabel = 'Hạng Vàng (Gold)';
  } else if (draftPoints >= 50) {
    draftTier = 'silver';
    draftTierLabel = 'Hạng Bạc (Silver)';
  }

  return {
    id: userId,
    name: userObj.name || 'Khách Hàng Lumina',
    email: userObj.email || '',
    phone: userObj.phone || null,
    role: userObj.role || 'customer',
    savedFaceShape: userObj.savedFaceShape || null,
    stats: {
      totalOrders,
      totalSpent,
      activeOrders,
      completedOrders,
      customOrdersCount,
      lastOrderAt: metrics.last_order_at,
    },
    loyalty: {
      points: draftPoints,
      tier: draftTier,
      tierLabel: draftTierLabel,
      isOfficialPolicy: false, // Flagged DRAFT per Prompt rules
      note: 'DRAFT / Tích lũy 1% giá trị đơn hàng đã hoàn tất',
    },
    preferences: {
      orderUpdates: true,
      emailMarketing: false,
      careReminders: true,
    },
  };
}

/**
 * Get paginated list of orders for the authenticated customer.
 */
export async function getCustomerOrders(userId, { page = 1, limit = 10, status = 'all' } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  let query = 'SELECT * FROM orders WHERE user_id = ?';
  let countQuery = 'SELECT COUNT(*) AS total FROM orders WHERE user_id = ?';
  const queryParams = [userId];
  const countParams = [userId];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    queryParams.push(status);
    countParams.push(status);
  }

  query += ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?';
  queryParams.push(safeLimit, offset);

  // Execute count and list in parallel
  const [[countRows], [orderRows]] = await Promise.all([
    pool.query(countQuery, countParams),
    pool.query(query, queryParams),
  ]);

  const total = parseInt(countRows[0]?.total, 10) || 0;
  const totalPages = Math.ceil(total / safeLimit) || 1;

  if (orderRows.length === 0) {
    return {
      orders: [],
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
      },
    };
  }

  // Fetch items for retrieved orders
  const orderIds = orderRows.map((o) => o.id);
  const [itemsRows] = await pool.query(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_type, oi.product_name,
            oi.quantity, oi.unit_price, oi.subtotal, oi.prescription_data,
            cs.id AS custom_spec_id, cs.base_model, cs.frame_type, cs.frame_color,
            cs.metalness, cs.roughness, cs.lens_color, cs.lens_opacity,
            cs.has_rhinestones, cs.charms, cs.engraving_text, cs.snapshot_path,
            cs.temple_style, cs.engraving_placement
     FROM order_items oi
     LEFT JOIN custom_specs cs ON oi.id = cs.order_item_id
     WHERE oi.order_id IN (?)
     ORDER BY oi.id ASC`,
    [orderIds]
  );

  // Group items by order_id
  const itemsByOrderId = {};
  for (const item of itemsRows) {
    if (!itemsByOrderId[item.order_id]) {
      itemsByOrderId[item.order_id] = [];
    }

    let charms = [];
    if (item.charms) {
      try {
        charms = typeof item.charms === 'string' ? JSON.parse(item.charms) : item.charms;
      } catch {
        charms = [];
      }
    }

    let prescription = null;
    if (item.prescription_data) {
      try {
        prescription =
          typeof item.prescription_data === 'string'
            ? JSON.parse(item.prescription_data)
            : item.prescription_data;
      } catch {
        prescription = null;
      }
    }

    itemsByOrderId[item.order_id].push({
      id: item.id,
      productId: item.product_id,
      productType: item.product_type,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      subtotal: parseFloat(item.subtotal),
      prescription,
      customSpec: item.custom_spec_id
        ? {
            id: item.custom_spec_id,
            baseModel: item.base_model || 'aviator',
            frameType: item.frame_type || 'acetate',
            frameColor: item.frame_color || '#D4AF37',
            metalness: !isNaN(parseFloat(item.metalness)) ? parseFloat(item.metalness) : 0.9,
            roughness: !isNaN(parseFloat(item.roughness)) ? parseFloat(item.roughness) : 0.2,
            lensColor: item.lens_color || '#1F2937',
            lensOpacity: !isNaN(parseFloat(item.lens_opacity)) ? parseFloat(item.lens_opacity) : 0.45,
            hasRhinestones: Boolean(item.has_rhinestones),
            charms,
            engravingText: item.engraving_text || '',
            templeStyle: item.temple_style || 'classic-acetate',
            engravingPlacement: item.engraving_placement || 'outer_temple',
            snapshotPath: item.snapshot_path,
          }
        : null,
    });
  }

  const enrichedOrders = orderRows.map((ord) => {
    const items = itemsByOrderId[ord.id] || [];
    const hasBespoke = items.some((i) => i.productType === 'custom' || Boolean(i.customSpec));

    return {
      id: ord.id,
      orderCode: ord.order_code,
      status: ord.status,
      paymentMethod: ord.payment_method,
      paymentStatus: ord.payment_status,
      customerName: ord.customer_name,
      customerEmail: ord.customer_email,
      customerPhone: ord.customer_phone,
      shippingAddress: ord.shipping_address,
      shippingCity: ord.shipping_city,
      orderNotes: ord.order_notes,
      subtotalAmount: parseFloat(ord.subtotal_amount),
      shippingFee: parseFloat(ord.shipping_fee),
      discountAmount: parseFloat(ord.discount_amount),
      voucherCode: ord.voucher_code,
      totalAmount: parseFloat(ord.total_amount),
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      hasBespoke,
      items,
      createdAt: ord.created_at,
      updatedAt: ord.updated_at,
    };
  });

  return {
    orders: enrichedOrders,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

/**
 * Get detailed order by orderCode, strictly verifying ownership.
 */
export async function getCustomerOrderByCode(userId, orderCode) {
  const [orders] = await pool.query(
    'SELECT * FROM orders WHERE order_code = ?',
    [orderCode]
  );

  if (orders.length === 0) {
    throw new NotFoundError(`Không tìm thấy đơn hàng với mã "${orderCode}".`);
  }

  const order = orders[0];

  // Strictly enforce ownership check (IDOR protection)
  if (order.user_id !== userId) {
    throw new ForbiddenError('Bạn không có quyền truy cập vào thông tin đơn hàng này.');
  }

  // Get items and 3D custom specs
  const [items] = await pool.query(
    `SELECT oi.*, 
            cs.id AS custom_spec_id, cs.base_model, cs.frame_type, cs.frame_color,
            cs.metalness, cs.roughness, cs.lens_color, cs.lens_opacity,
            cs.has_rhinestones, cs.charms, cs.engraving_text, cs.snapshot_path,
            cs.temple_style, cs.engraving_placement
     FROM order_items oi
     LEFT JOIN custom_specs cs ON oi.id = cs.order_item_id
     WHERE oi.order_id = ?
     ORDER BY oi.id ASC`,
    [order.id]
  );

  // Get payment history
  const [payments] = await pool.query(
    `SELECT payment_code, provider, payment_method, amount, currency, status,
            paid_at, created_at
     FROM payments WHERE order_id = ? ORDER BY created_at DESC`,
    [order.id]
  );

  const formattedItems = items.map((item) => {
    let charms = [];
    if (item.charms) {
      try {
        charms = typeof item.charms === 'string' ? JSON.parse(item.charms) : item.charms;
      } catch {
        charms = [];
      }
    }

    let prescription = null;
    if (item.prescription_data) {
      try {
        prescription =
          typeof item.prescription_data === 'string'
            ? JSON.parse(item.prescription_data)
            : item.prescription_data;
      } catch {
        prescription = null;
      }
    }

    return {
      id: item.id,
      productId: item.product_id,
      productType: item.product_type,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unit_price),
      subtotal: parseFloat(item.subtotal),
      prescription,
      customSpec: item.custom_spec_id
        ? {
            id: item.custom_spec_id,
            baseModel: item.base_model || 'aviator',
            frameType: item.frame_type || 'acetate',
            frameColor: item.frame_color || '#D4AF37',
            metalness: !isNaN(parseFloat(item.metalness)) ? parseFloat(item.metalness) : 0.9,
            roughness: !isNaN(parseFloat(item.roughness)) ? parseFloat(item.roughness) : 0.2,
            lensColor: item.lens_color || '#1F2937',
            lensOpacity: !isNaN(parseFloat(item.lens_opacity)) ? parseFloat(item.lens_opacity) : 0.45,
            hasRhinestones: Boolean(item.has_rhinestones),
            charms,
            engravingText: item.engraving_text || '',
            templeStyle: item.temple_style || 'classic-acetate',
            engravingPlacement: item.engraving_placement || 'outer_temple',
            snapshotPath: item.snapshot_path,
          }
        : null,
    };
  });

  return {
    id: order.id,
    orderCode: order.order_code,
    status: order.status,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    shippingAddress: order.shipping_address,
    shippingCity: order.shipping_city,
    orderNotes: order.order_notes,
    subtotalAmount: parseFloat(order.subtotal_amount),
    shippingFee: parseFloat(order.shipping_fee),
    discountAmount: parseFloat(order.discount_amount),
    voucherCode: order.voucher_code,
    totalAmount: parseFloat(order.total_amount),
    items: formattedItems,
    payments,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

/**
 * Get all 3D Bespoke designs ordered by the customer.
 */
export async function getCustomerBespokeDesigns(userId) {
  const [rows] = await pool.query(
    `SELECT cs.id AS custom_spec_id, cs.base_model, cs.frame_type, cs.frame_color,
            cs.metalness, cs.roughness, cs.lens_color, cs.lens_opacity,
            cs.has_rhinestones, cs.charms, cs.engraving_text, cs.snapshot_path,
            cs.temple_style, cs.engraving_placement, cs.created_at AS spec_created_at,
            oi.id AS order_item_id, oi.product_name, oi.unit_price,
            o.id AS order_id, o.order_code, o.status AS order_status, o.created_at AS ordered_at
     FROM custom_specs cs
     JOIN order_items oi ON cs.order_item_id = oi.id
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = ?
     ORDER BY cs.id DESC`,
    [userId]
  );

  return rows.map((row) => {
    let charms = [];
    if (row.charms) {
      try {
        charms = typeof row.charms === 'string' ? JSON.parse(row.charms) : row.charms;
      } catch {
        charms = [];
      }
    }

    const designSpec = {
      baseModel: row.base_model || 'aviator',
      frameType: row.frame_type || 'acetate',
      frameColor: row.frame_color || '#D4AF37',
      metalness: !isNaN(parseFloat(row.metalness)) ? parseFloat(row.metalness) : 0.9,
      roughness: !isNaN(parseFloat(row.roughness)) ? parseFloat(row.roughness) : 0.2,
      lensColor: row.lens_color || '#1F2937',
      lensOpacity: !isNaN(parseFloat(row.lens_opacity)) ? parseFloat(row.lens_opacity) : 0.45,
      hasRhinestones: Boolean(row.has_rhinestones),
      charms,
      engravingText: row.engraving_text || '',
      templeStyle: row.temple_style || 'classic-acetate',
      engravingPlacement: row.engraving_placement || 'outer_temple',
    };

    return {
      id: row.custom_spec_id,
      orderCode: row.order_code,
      orderStatus: row.order_status,
      productName: row.product_name,
      unitPrice: parseFloat(row.unit_price),
      orderedAt: row.ordered_at,
      snapshotPath: row.snapshot_path,
      designSpec,
    };
  });
}
