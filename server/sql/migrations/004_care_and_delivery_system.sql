-- =============================================================================
-- LUMINA EYEWEAR — MIGRATION 004: Care, Delivery & Dynamic Configuration
-- Conforms to DECISION_REGISTER.md (APPROVED FOR PROJECT IMPLEMENTATION / DEMO)
-- =============================================================================

USE `lumina_eyewear_db`;

-- 1. Table: system_configurations (Dynamic Business Parameters)
CREATE TABLE IF NOT EXISTS `system_configurations` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `config_category` ENUM('care', 'loyalty', 'delivery', 'notification', 'general') NOT NULL,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` JSON NOT NULL,
  `environment` ENUM('demo', 'production') NOT NULL DEFAULT 'demo',
  `approval_status` ENUM('draft', 'pending_review', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  `version` VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `effective_from` TIMESTAMP NULL DEFAULT NULL,
  `effective_to` TIMESTAMP NULL DEFAULT NULL,
  `created_by` VARCHAR(100) NOT NULL DEFAULT 'system',
  `approved_by` VARCHAR(100) NULL,
  `approved_at` TIMESTAMP NULL,
  `change_reason` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key_env_ver` (`config_key`, `environment`, `version`),
  INDEX `idx_config_lookup` (`config_category`, `is_active`, `approval_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: system_configuration_audit_logs (Config Audit Trail)
CREATE TABLE IF NOT EXISTS `system_configuration_audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `configuration_id` INT NOT NULL,
  `action` ENUM('create', 'update', 'approve', 'reject', 'deprecate') NOT NULL,
  `old_value` JSON NULL,
  `new_value` JSON NOT NULL,
  `actor_id` VARCHAR(100) NOT NULL,
  `actor_role` VARCHAR(50) NOT NULL,
  `actor_ip` VARCHAR(50) NULL,
  `reason` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_config` (`configuration_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: order_delivery_events (Verified Delivery Tracking & Confirmation)
CREATE TABLE IF NOT EXISTS `order_delivery_events` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `order_id` INT NOT NULL,
  `carrier_name` VARCHAR(100) NOT NULL DEFAULT 'Lumina Express Delivery',
  `tracking_code` VARCHAR(100) NULL,
  `delivered_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_by` ENUM('admin', 'customer', 'carrier') NOT NULL DEFAULT 'admin',
  `confirmed_by_id` VARCHAR(100) NOT NULL,
  `proof_note` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_del_order` (`order_id`, `delivered_at`),
  CONSTRAINT `fk_delivery_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: after_sales_requests (Support & Warranty Tickets)
CREATE TABLE IF NOT EXISTS `after_sales_requests` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `ticket_code` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(100) NOT NULL,
  `order_id` INT NOT NULL,
  `order_item_id` INT NULL,
  `request_type` ENUM('warranty_claim', 'fit_adjustment', 'deep_cleaning', 'repair_service', 'usage_consultation', 'catalog_return', 'other') NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('submitted', 'reviewing', 'waiting_customer', 'approved', 'in_progress', 'resolved', 'rejected', 'closed') NOT NULL DEFAULT 'submitted',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `contact_phone` VARCHAR(50) NOT NULL,
  `assigned_to` VARCHAR(100) NULL,
  `resolution_summary` TEXT NULL,
  `customer_rating` TINYINT UNSIGNED NULL,
  `customer_feedback` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  `closed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_care_ticket_code` (`ticket_code`),
  INDEX `idx_care_user` (`user_id`, `created_at`),
  INDEX `idx_care_order` (`order_id`),
  INDEX `idx_care_status` (`status`),
  CONSTRAINT `fk_care_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_care_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: after_sales_events (Message Thread & Audit Trail for Care Tickets)
CREATE TABLE IF NOT EXISTS `after_sales_events` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  `request_id` BIGINT UNSIGNED NOT NULL,
  `actor_type` ENUM('customer', 'admin', 'technician', 'system') NOT NULL,
  `actor_id` VARCHAR(100) NOT NULL,
  `event_type` ENUM('created', 'status_change', 'customer_message', 'admin_reply', 'internal_note', 'assigned') NOT NULL,
  `content` TEXT NOT NULL,
  `is_internal_only` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_care_events_req` (`request_id`, `created_at`),
  CONSTRAINT `fk_care_events_request` FOREIGN KEY (`request_id`) REFERENCES `after_sales_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Insert Default Approved Configurations into system_configurations
INSERT INTO `system_configurations` 
  (`config_category`, `config_key`, `config_value`, `environment`, `approval_status`, `version`, `is_active`, `approved_by`, `approved_at`, `change_reason`)
VALUES 
  ('care', 'care_policy', JSON_OBJECT(
    'frame_warranty_months', 12,
    'lens_coating_warranty_months', 6,
    'deep_cleaning_months', 24,
    'nose_pad_adjustment_months', 24,
    'catalog_return_days', 7,
    'bespoke_policy', 'Hỗ trợ căn chỉnh, sửa chữa lỗi kỹ thuật và xử lý sản phẩm không đúng cấu hình đã xác nhận; không hoàn tiền vì đổi ý.'
  ), 'demo', 'approved', '1.0.0', 1, 'Lumina Executive', NOW(), 'Official Business Approval 2026-11-12'),

  ('delivery', 'delivery_policy', JSON_OBJECT(
    'default_carrier', 'Lumina Express Delivery',
    'allow_customer_confirmation', true,
    'warranty_start_basis', 'verified_delivery_date'
  ), 'demo', 'approved', '1.0.0', 1, 'Lumina Executive', NOW(), 'Official Business Approval 2026-11-12'),

  ('loyalty', 'loyalty_policy', JSON_OBJECT(
    'earn_percentage', 0.01,
    'spend_step_vnd', 100000,
    'points_per_step', 1,
    'redemption_rate_vnd', 1000,
    'max_discount_order_percentage', 0.20,
    'point_maturation_days', 7,
    'tiers', JSON_ARRAY(
      JSON_OBJECT('id', 'member', 'label', 'Thành Viên Lumina', 'min_points', 0, 'max_points', 49),
      JSON_OBJECT('id', 'silver', 'label', 'Hạng Bạc (Silver)', 'min_points', 50, 'max_points', 199),
      JSON_OBJECT('id', 'gold', 'label', 'Hạng Vàng (Gold)', 'min_points', 200, 'max_points', 499),
      JSON_OBJECT('id', 'diamond', 'label', 'Hạng Kim Cương (Diamond)', 'min_points', 500, 'max_points', null)
    )
  ), 'demo', 'approved', '1.0.0', 1, 'Lumina Executive', NOW(), 'Official Business Approval 2026-11-12')
ON DUPLICATE KEY UPDATE 
  `config_value` = VALUES(`config_value`),
  `approval_status` = VALUES(`approval_status`),
  `updated_at` = NOW();

