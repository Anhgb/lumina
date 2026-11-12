import { pool } from '../config/database.js';

/**
 * Cache in-memory with TTL to reduce DB roundtrips.
 */
const configCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Lấy cấu hình hệ thống từ bảng system_configurations.
 * 
 * @param {string} category 
 * @param {string} key 
 * @param {string} [environment='demo'] 
 * @returns {Promise<any>} Parsed config value
 */
export async function getSystemConfig(category, key, environment = 'demo') {
  const cacheKey = `${category}:${key}:${environment}`;
  const cached = configCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.value;
  }

  const [rows] = await pool.query(
    `SELECT config_value, approval_status, version 
     FROM system_configurations 
     WHERE config_category = ? AND config_key = ? AND environment = ? AND is_active = 1
     ORDER BY id DESC LIMIT 1`,
    [category, key, environment]
  );

  if (!rows || rows.length === 0) {
    return null;
  }

  let value = rows[0].config_value;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      // keep as string
    }
  }

  configCache.set(cacheKey, { value, timestamp: Date.now() });
  return value;
}

/**
 * Cập nhật cấu hình hệ thống và ghi nhận vào bảng audit log.
 * 
 * @param {object} params
 * @param {string} params.category
 * @param {string} params.key
 * @param {any} params.value
 * @param {string} [params.environment='demo']
 * @param {string} params.actorId
 * @param {string} [params.actorRole='admin']
 * @param {string} [params.actorIp=null]
 * @param {string} params.reason
 * @returns {Promise<object>}
 */
export async function updateSystemConfig({
  category,
  key,
  value,
  environment = 'demo',
  actorId,
  actorRole = 'admin',
  actorIp = null,
  reason,
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query(
      `SELECT id, config_value FROM system_configurations 
       WHERE config_category = ? AND config_key = ? AND environment = ? AND is_active = 1
       FOR UPDATE`,
      [category, key, environment]
    );

    const stringifiedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    let configId;
    let oldValue = null;

    if (existing && existing.length > 0) {
      configId = existing[0].id;
      oldValue = existing[0].config_value;

      await conn.query(
        `UPDATE system_configurations 
         SET config_value = ?, change_reason = ?, updated_at = NOW() 
         WHERE id = ?`,
        [stringifiedValue, reason, configId]
      );
    } else {
      const [insertRes] = await conn.query(
        `INSERT INTO system_configurations 
         (config_category, config_key, config_value, environment, approval_status, created_by, change_reason)
         VALUES (?, ?, ?, ?, 'approved', ?, ?)`,
        [category, key, stringifiedValue, environment, actorId, reason]
      );
      configId = insertRes.insertId;
    }

    // Insert into audit log
    await conn.query(
      `INSERT INTO system_configuration_audit_logs 
       (configuration_id, action, old_value, new_value, actor_id, actor_role, actor_ip, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        configId,
        oldValue ? 'update' : 'create',
        typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue),
        stringifiedValue,
        actorId,
        actorRole,
        actorIp,
        reason,
      ]
    );

    await conn.commit();

    // Clear cache
    configCache.delete(`${category}:${key}:${environment}`);

    return { success: true, configId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export default {
  getSystemConfig,
  updateSystemConfig,
};

