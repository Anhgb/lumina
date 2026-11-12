-- Migration 005: Lumina Membership & Loyalty Points System
-- Conforms to Prompt 04 & DECISION_REGISTER.md (DEC-LOY-001 to DEC-LOY-006)
-- Date: 2026-11-12

-- 1. Table: loyalty_tiers
CREATE TABLE IF NOT EXISTS `loyalty_tiers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tier_code` VARCHAR(50) NOT NULL UNIQUE,
  `tier_name` VARCHAR(100) NOT NULL,
  `min_lifetime_points` INT NOT NULL DEFAULT 0,
  `max_lifetime_points` INT NULL,
  `earn_multiplier` DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  `benefits` JSON NOT NULL,
  `badge_color` VARCHAR(30) NOT NULL DEFAULT '#B8860B',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: loyalty_accounts
CREATE TABLE IF NOT EXISTS `loyalty_accounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(100) NOT NULL UNIQUE,
  `available_points` INT NOT NULL DEFAULT 0,
  `lifetime_points` INT NOT NULL DEFAULT 0,
  `current_tier` VARCHAR(50) NOT NULL DEFAULT 'member',
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_available_points_non_negative` CHECK (`available_points` >= 0),
  CONSTRAINT `chk_lifetime_points_non_negative` CHECK (`lifetime_points` >= 0),
  INDEX `idx_loyalty_accounts_user` (`user_id`),
  INDEX `idx_loyalty_accounts_tier` (`current_tier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: loyalty_transactions (Immutable Ledger)
CREATE TABLE IF NOT EXISTS `loyalty_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `account_id` INT NOT NULL,
  `user_id` VARCHAR(100) NOT NULL,
  `transaction_type` ENUM('earn', 'redeem', 'refund_clawback', 'manual_adjustment', 'expire') NOT NULL,
  `points` INT NOT NULL,
  `balance_after` INT NOT NULL,
  `source_reference` VARCHAR(100) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `order_code` VARCHAR(50) NULL,
  `admin_id` VARCHAR(100) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_loyalty_source_ref` (`source_reference`),
  INDEX `idx_loyalty_tx_account` (`account_id`),
  INDEX `idx_loyalty_tx_user` (`user_id`),
  INDEX `idx_loyalty_tx_type` (`transaction_type`),
  INDEX `idx_loyalty_tx_order` (`order_code`),
  CONSTRAINT `fk_loyalty_tx_account` FOREIGN KEY (`account_id`) REFERENCES `loyalty_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: loyalty_rules
CREATE TABLE IF NOT EXISTS `loyalty_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rule_code` VARCHAR(50) NOT NULL UNIQUE,
  `rule_name` VARCHAR(100) NOT NULL,
  `rule_type` ENUM('earn', 'redeem', 'tier', 'general') NOT NULL,
  `config_value` JSON NOT NULL,
  `status` ENUM('draft', 'approved', 'deprecated') NOT NULL DEFAULT 'approved',
  `approved_by` VARCHAR(100) NULL,
  `effective_from` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `effective_to` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_loyalty_rules_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: loyalty_redemptions
CREATE TABLE IF NOT EXISTS `loyalty_redemptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `redemption_code` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` VARCHAR(100) NOT NULL,
  `account_id` INT NOT NULL,
  `points_spent` INT NOT NULL,
  `discount_amount` DECIMAL(12, 2) NOT NULL,
  `order_code` VARCHAR(50) NULL,
  `status` ENUM('applied', 'refunded', 'cancelled') NOT NULL DEFAULT 'applied',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_redemptions_user` (`user_id`),
  INDEX `idx_redemptions_order` (`order_code`),
  CONSTRAINT `fk_redemptions_account` FOREIGN KEY (`account_id`) REFERENCES `loyalty_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Tiers: Approved DEC-LOY-003
INSERT INTO `loyalty_tiers` (`tier_code`, `tier_name`, `min_lifetime_points`, `max_lifetime_points`, `earn_multiplier`, `benefits`, `badge_color`, `is_active`)
VALUES
  ('member', 'Lumina Member', 0, 49, 1.00, JSON_ARRAY('Tích lũy 1% chi tiêu hợp lệ (100.000đ = 1 điểm)', 'Voucher sinh nhật 100.000đ', 'Bảo hành chính hãng 12 tháng khung gọng'), '#8E8A82', 1),
  ('silver', 'Lumina Silver Atelier', 50, 199, 1.00, JSON_ARRAY('Tất cả quyền lợi của Member', 'Miễn phí giao hàng tiêu chuẩn toàn quốc', 'Ưu tiên dịch vụ vệ sinh sóng siêu âm & cân chỉnh ve kính', 'Voucher sinh nhật 200.000đ'), '#A0AEC0', 1),
  ('gold', 'Lumina Gold Prestige', 200, 499, 1.00, JSON_ARRAY('Tất cả quyền lợi của Silver', 'Giảm 5% cho toàn bộ phụ kiện và charm trang trí', 'Miễn phí giao hàng hỏa tốc trong 2h tại TP.HCM/Hà Nội', 'Tặng hộp kính da thủ công Atelier cao cấp', 'Voucher sinh nhật 500.000đ'), '#D4AF37', 1),
  ('diamond', 'Lumina Diamond Sovereign', 500, NULL, 1.00, JSON_ARRAY('Tất cả quyền lợi của Gold', 'Đặc quyền chuyên viên Atelier Concierge riêng 1-on-1', 'Ưu đãi 10% cho mọi đơn hàng 3D Bespoke', 'Chế tác quà tặng độc bản thường niên theo yêu cầu', 'Vé mời danh dự tham dự Private Trunk Show ra mắt BST mới'), '#1A202C', 1)
ON DUPLICATE KEY UPDATE
  `tier_name` = VALUES(`tier_name`),
  `min_lifetime_points` = VALUES(`min_lifetime_points`),
  `max_lifetime_points` = VALUES(`max_lifetime_points`),
  `benefits` = VALUES(`benefits`),
  `badge_color` = VALUES(`badge_color`);

-- Seed Rules: Approved DEC-LOY-001 & DEC-LOY-002
INSERT INTO `loyalty_rules` (`rule_code`, `rule_name`, `rule_type`, `config_value`, `status`, `approved_by`)
VALUES
  ('rule_earn_standard', 'Quy tắc tích điểm tiêu chuẩn', 'earn', JSON_OBJECT(
    'earn_rate_percent', 1.0,
    'step_amount_vnd', 100000,
    'points_per_step', 1,
    'eligible_delivery_statuses', JSON_ARRAY('delivered', 'customer_confirmed'),
    'eligible_payment_statuses', JSON_ARRAY('paid'),
    'return_grace_days', 7,
    'cod_requires_cash_collected', true
  ), 'approved', 'Lumina Executive'),
  ('rule_redeem_standard', 'Quy tắc đổi thưởng tiêu chuẩn', 'redeem', JSON_OBJECT(
    'redemption_rate_vnd', 1000,
    'max_redemption_percent', 20.0,
    'min_points_to_redeem', 10
  ), 'approved', 'Lumina Executive')
ON DUPLICATE KEY UPDATE
  `config_value` = VALUES(`config_value`),
  `status` = VALUES(`status`),
  `approved_by` = VALUES(`approved_by`);

