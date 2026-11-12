-- Migration 007: Lumina Notification & Customer Engagement System
-- Conforms to Prompt 06 — Transactional vs Service Reminders vs Marketing
-- Consent-based, event-driven, idempotent, provider failure isolated
-- Date: 2026-11-12

-- 1. Table: notification_templates
CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `template_code` VARCHAR(64) NOT NULL UNIQUE,
  `category` ENUM('transactional', 'service_reminder', 'marketing') NOT NULL,
  `title_template` VARCHAR(255) NOT NULL,
  `body_template` TEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_nt_cat` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: notification_preferences (Consent & channel controls)
CREATE TABLE IF NOT EXISTS `notification_preferences` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(100) NOT NULL UNIQUE,
  `order_updates_inapp` TINYINT(1) NOT NULL DEFAULT 1,
  `order_updates_email` TINYINT(1) NOT NULL DEFAULT 1,
  `care_reminders_inapp` TINYINT(1) NOT NULL DEFAULT 1,
  `care_reminders_email` TINYINT(1) NOT NULL DEFAULT 0,
  `marketing_inapp` TINYINT(1) NOT NULL DEFAULT 0,  -- Marketing MUST default to 0 (explicit consent only)
  `marketing_email` TINYINT(1) NOT NULL DEFAULT 0,  -- Marketing MUST default to 0 (explicit consent only)
  `marketing_sms` TINYINT(1) NOT NULL DEFAULT 0,    -- Marketing MUST default to 0 (explicit consent only)
  `consent_version` VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  `consent_source` VARCHAR(100) NOT NULL DEFAULT 'account_portal',
  `consent_updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_np_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: notifications (Authoritative in-app notification inbox)
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `notification_code` VARCHAR(64) NOT NULL UNIQUE,
  `user_id` VARCHAR(100) NOT NULL,
  `category` ENUM('transactional', 'service_reminder', 'marketing') NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `data` JSON NULL,
  `idempotency_key` VARCHAR(128) NOT NULL UNIQUE,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_user_read` (`user_id`, `is_read`),
  INDEX `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: notification_delivery_logs (Audit of delivery attempts per channel)
CREATE TABLE IF NOT EXISTS `notification_delivery_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `notification_id` INT NULL,
  `channel` ENUM('in_app', 'email', 'sms') NOT NULL,
  `recipient` VARCHAR(255) NOT NULL,
  `status` ENUM('delivered', 'queued', 'skipped_no_consent', 'skipped_no_provider', 'failed') NOT NULL,
  `provider_name` VARCHAR(50) NOT NULL DEFAULT 'in_app',
  `provider_response` TEXT NULL,
  `sent_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE,
  INDEX `idx_ndl_notif` (`notification_id`),
  INDEX `idx_ndl_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: notification_outbox (Outbox / Event queue for reliable processing)
CREATE TABLE IF NOT EXISTS `notification_outbox` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_name` VARCHAR(100) NOT NULL,
  `aggregate_id` VARCHAR(100) NOT NULL,
  `user_id` VARCHAR(100) NOT NULL,
  `payload` JSON NOT NULL,
  `idempotency_key` VARCHAR(128) NOT NULL UNIQUE,
  `status` ENUM('pending', 'processed', 'failed', 'blocked_no_consent') NOT NULL DEFAULT 'pending',
  `error_message` TEXT NULL,
  `processed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_outbox_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- SEED DEFAULT TEMPLATES
-- ===================================================================
INSERT INTO `notification_templates` (`template_code`, `category`, `title_template`, `body_template`)
VALUES
  ('ORDER_CONFIRMED', 'transactional', 'Đơn hàng {{orderCode}} đã được tiếp nhận', 'Cảm ơn quý khách. Lumina đã xác nhận đơn hàng {{orderCode}} và đang chuẩn bị chế tác.'),
  ('ORDER_PROCESSING', 'transactional', 'Đơn hàng {{orderCode}} đang được chế tác', 'Nghệ nhân Atelier Lumina đang tiến hành lắp ráp và kiểm tra độ chính xác quang học cho đơn hàng {{orderCode}}.'),
  ('DELIVERY_VERIFIED', 'transactional', 'Kiện hàng {{orderCode}} đã giao thành công', 'Kiện hàng của quý khách đã được xác nhận giao an toàn bởi {{carrier}}. Chính sách bảo hành Lumina Care chính thức được kích hoạt!'),
  ('CARE_TICKET_UPDATED', 'transactional', 'Cập nhật yêu cầu Lumina Care {{ticketCode}}', 'Yêu cầu hỗ trợ {{ticketCode}} đã được cập nhật sang trạng thái: {{statusLabel}}.'),
  ('LOYALTY_EARNED', 'transactional', 'Bạn vừa tích lũy +{{points}} điểm Lumina', 'Đơn hàng {{orderCode}} đủ điều kiện đã cộng +{{points}} điểm thưởng vào tài khoản của bạn. Hạng hiện tại: {{tierLabel}}.'),
  ('SERVICE_REMINDER_CLEANING', 'service_reminder', 'Nhắc nhở vệ sinh & cân chỉnh ve kính định kỳ', 'Đã 6 tháng kể từ khi nhận kính. Quý khách có thể ghé Lumina Atelier hoặc gửi yêu cầu Lumina Care để được vệ sinh sóng siêu âm miễn phí.'),
  ('MARKETING_NEW_COLLECTION', 'marketing', 'Ra mắt BST Kính Mắt Trending 2026', 'Khám phá các thiết kế kính mắt cao cấp với chất liệu Titanium mạ vàng 18K độc bản tại Lumina Studio.')
ON DUPLICATE KEY UPDATE
  `title_template` = VALUES(`title_template`),
  `body_template` = VALUES(`body_template`),
  `category` = VALUES(`category`);

