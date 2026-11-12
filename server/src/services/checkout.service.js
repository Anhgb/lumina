import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';
import { verifyOrderPricingAndStock } from './pricing.service.js';
import { BadRequestError } from '../middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/snapshots');

// Ensure uploads/snapshots directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Generates an official, unique Lumina order code.
 * Format: LUM-YYYYMMDD-XXXX (e.g. LUM-20261016-A8C2)
 */
export function generateOrderCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `LUM-${dateStr}-${randomHex}`;
}

/**
 * Safely saves base64 snapshot data URL as a file on server.
 * Conforms to PRD Section 5.7 & Prompt 7 Section 6.
 * @param {string} dataUrl - Base64 data URL
 * @param {string} orderCode - Associated order code
 * @param {number} itemIndex - Item index
 * @returns {string|null} - Relative public path to snapshot file
 */
export async function saveSnapshotImage(dataUrl, orderCode, itemIndex = 0) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;

  const matches = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
  if (!matches) {
    console.warn('[Snapshot] Invalid base64 data URL format, skipping file save.');
    return null;
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Validate maximum size (default 5MB)
  const maxBytes = (parseInt(process.env.MAX_SNAPSHOT_SIZE_MB, 10) || 5) * 1024 * 1024;
  if (buffer.length > maxBytes) {
    console.warn(`[Snapshot] File size (${buffer.length} bytes) exceeds limit, skipping.`);
    return null;
  }

  const safeOrderCode = orderCode.replace(/[^a-zA-Z0-9-]/g, '');
  const filename = `snap-${safeOrderCode}-${itemIndex}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    await fs.promises.writeFile(filePath, buffer);
    return `/uploads/snapshots/${filename}`;
  } catch (err) {
    console.error('[Snapshot] Failed to write file to disk:', err);
    return null;
  }
}

/**
 * Executes authoritative, transactional checkout process in MySQL.
 * Conforms to Prompt 7 Section 5.
 */
export async function processCheckout({
  user,
  customer,
  items,
  voucherCode,
  paymentMethod = 'cod',
  orderNotes = '',
  ipAddress = null,
  userAgent = null,
}) {
  const connection = await pool.getConnection();
  const createdFiles = [];

  try {
    // 1. Begin Database Transaction
    await connection.beginTransaction();

    // 2. Authoritatively verify pricing and inventory with row lock (FOR UPDATE)
    const pricingResult = await verifyOrderPricingAndStock(items, voucherCode, connection);
    const { verifiedItems, subtotalAmount, shippingFee, discountAmount, totalAmount } =
      pricingResult;

    // 3. Deduct stock for verified catalog items
    for (const vItem of verifiedItems) {
      if (vItem.productType === 'catalog') {
        await connection.query(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [vItem.quantity, vItem.productId]
        );
      }
    }

    // 4. Generate unique order code
    const orderCode = generateOrderCode();

    // 5. Insert Order record
    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        order_code, user_id, customer_name, customer_email, customer_phone,
        shipping_address, shipping_city, order_notes, payment_method,
        subtotal_amount, shipping_fee, discount_amount, voucher_code,
        total_amount, payment_status, status, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      [
        orderCode,
        user.id,
        customer.name.trim(),
        customer.email.trim(),
        customer.phone.trim(),
        customer.address.trim(),
        customer.city.trim(),
        orderNotes?.trim() || null,
        paymentMethod,
        subtotalAmount,
        shippingFee,
        discountAmount,
        pricingResult.voucherCode,
        totalAmount,
        'unpaid',
        ipAddress,
        userAgent,
      ]
    );

    const orderId = orderResult.insertId;

    // 6. Insert Order Items & Custom 3D Specs
    for (let idx = 0; idx < verifiedItems.length; idx++) {
      const vItem = verifiedItems[idx];

      const prescriptionJson = vItem.prescription
        ? JSON.stringify(vItem.prescription)
        : null;

      const [itemResult] = await connection.query(
        `INSERT INTO order_items (
          order_id, product_id, product_type, product_name,
          quantity, unit_price, subtotal, prescription_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          vItem.productId,
          vItem.productType,
          vItem.productName,
          vItem.quantity,
          vItem.unitPrice,
          vItem.subtotal,
          prescriptionJson,
        ]
      );

      const orderItemId = itemResult.insertId;

      // Handle 3D custom bespoke eyewear specs & snapshot storage
      if (vItem.productType === 'custom' && vItem.designSpec) {
        const spec = vItem.designSpec;

        let snapshotRelPath = null;
        if (vItem.snapshotDataUrl) {
          snapshotRelPath = await saveSnapshotImage(vItem.snapshotDataUrl, orderCode, idx);
          if (snapshotRelPath) createdFiles.push(snapshotRelPath);
        }

        const charmsJson = Array.isArray(spec.charms) ? JSON.stringify(spec.charms) : null;

        await connection.query(
          `INSERT INTO custom_specs (
            order_item_id, base_model, frame_type, frame_color,
            metalness, roughness, lens_color, lens_opacity,
            has_rhinestones, charms, engraving_text, snapshot_path,
            temple_style, engraving_placement
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderItemId,
            spec.baseModel?.toLowerCase() || 'aviator',
            spec.frameType || 'acetate',
            spec.frameColor || '#D4AF37',
            spec.metalness ?? 0.9,
            spec.roughness ?? 0.2,
            spec.lensColor || '#1F2937',
            spec.lensOpacity ?? 0.45,
            spec.hasRhinestones ? 1 : 0,
            charmsJson,
            spec.engravingText || null,
            snapshotRelPath,
            spec.templeStyle || 'classic-acetate',
            spec.engravingPlacement || 'outer_temple',
          ]
        );
      }
    }

    // 7. Commit Transaction
    await connection.commit();

    return {
      orderId,
      orderCode,
      totalAmount,
      subtotalAmount,
      discountAmount,
      shippingFee,
      voucherCode: pricingResult.voucherCode,
      itemsCount: verifiedItems.length,
      status: 'confirmed',
      paymentMethod,
      paymentStatus: 'unpaid',
      customerName: customer.name.trim(),
      customerEmail: customer.email.trim(),
      customer: {
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city.trim(),
      },
      items: verifiedItems.map((item) => ({
        productName: item.productName,
        productType: item.productType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    // Rollback on any failure
    await connection.rollback();

    // Cleanup any files written before error
    for (const relPath of createdFiles) {
      const fullPath = path.join(__dirname, '../../', relPath);
      if (fs.existsSync(fullPath)) {
        fs.unlink(fullPath, () => {});
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Retrieves an order and its items by order code.
 */
export async function getOrderByCode(orderCode) {
  const [orders] = await pool.query(
    'SELECT * FROM orders WHERE order_code = ?',
    [orderCode]
  );

  if (orders.length === 0) return null;

  const order = orders[0];

  const [items] = await pool.query(
    `SELECT oi.*, cs.base_model, cs.frame_color, cs.lens_color, cs.lens_opacity,
            cs.has_rhinestones, cs.charms, cs.engraving_text, cs.snapshot_path
     FROM order_items oi
     LEFT JOIN custom_specs cs ON oi.id = cs.order_item_id
     WHERE oi.order_id = ?`,
    [order.id]
  );

  const [payments] = await pool.query(
    `SELECT payment_code, provider, payment_method, amount, currency, status,
            provider_transaction_id, reconciliation_reference, verification_note,
            verified_by, created_at, updated_at, paid_at
     FROM payments WHERE order_id = ? ORDER BY created_at DESC, id DESC`,
    [order.id]
  );

  return {
    ...order,
    items,
    payments,
  };
}
