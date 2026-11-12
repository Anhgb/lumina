-- Migration 006: Lumina Product Reviews & Referral Program
-- Conforms to Prompt 05 — No fake reviews, no star-based bonuses, anti-fraud referral
-- Date: 2026-11-12

-- ===================================================================
-- A. PRODUCT REVIEWS
-- ===================================================================

-- 1. Table: product_reviews
CREATE TABLE IF NOT EXISTS `product_reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `review_code` VARCHAR(64) NOT NULL UNIQUE,
  `product_id` INT NOT NULL,
  `user_id` VARCHAR(100) NOT NULL,
  `order_id` INT NOT NULL,
  `order_item_id` INT NULL,
  `rating` TINYINT NOT NULL,
  `title` VARCHAR(200) NULL,
  `content` TEXT NOT NULL,
  `is_verified_purchase` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('pending','approved','hidden','deleted') NOT NULL DEFAULT 'pending',
  `moderation_reason` VARCHAR(500) NULL,
  `helpful_votes` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_rating_range` CHECK (`rating` BETWEEN 1 AND 5),
  UNIQUE KEY `uq_user_product_order` (`user_id`, `product_id`, `order_id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  INDEX `idx_reviews_product` (`product_id`, `status`),
  INDEX `idx_reviews_user` (`user_id`),
  INDEX `idx_reviews_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: review_moderation_events (audit log)
CREATE TABLE IF NOT EXISTS `review_moderation_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `review_id` INT NOT NULL,
  `action` ENUM('approve','hide','delete','restore') NOT NULL,
  `admin_id` VARCHAR(100) NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`review_id`) REFERENCES `product_reviews`(`id`) ON DELETE CASCADE,
  INDEX `idx_rme_review` (`review_id`),
  INDEX `idx_rme_admin` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- B. REFERRAL PROGRAM
-- ===================================================================

-- 3. Table: referral_codes (one per member)
CREATE TABLE IF NOT EXISTS `referral_codes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `referrer_user_id` VARCHAR(100) NOT NULL UNIQUE,
  `referral_code` VARCHAR(20) NOT NULL UNIQUE,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `total_referrals` INT NOT NULL DEFAULT 0,
  `successful_referrals` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_rc_code` (`referral_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: referral_attributions (each referred user, once)
CREATE TABLE IF NOT EXISTS `referral_attributions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `referral_code_id` INT NOT NULL,
  `referrer_user_id` VARCHAR(100) NOT NULL,
  `referred_user_id` VARCHAR(100) NOT NULL,
  `referred_order_id` INT NULL,
  `status` ENUM('pending','qualified','rewarded','rejected','review') NOT NULL DEFAULT 'pending',
  `idempotency_key` VARCHAR(100) NOT NULL UNIQUE,
  `rejection_reason` VARCHAR(500) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `qualified_at` DATETIME NULL,
  `rewarded_at` DATETIME NULL,
  UNIQUE KEY `uq_referred_user` (`referred_user_id`),
  FOREIGN KEY (`referral_code_id`) REFERENCES `referral_codes`(`id`),
  INDEX `idx_ra_referrer` (`referrer_user_id`),
  INDEX `idx_ra_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: referral_rewards (reward issuance log)
CREATE TABLE IF NOT EXISTS `referral_rewards` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `attribution_id` INT NOT NULL,
  `recipient_user_id` VARCHAR(100) NOT NULL,
  `reward_type` ENUM('referrer','referee') NOT NULL,
  `reward_value_type` ENUM('loyalty_points','voucher') NOT NULL DEFAULT 'loyalty_points',
  `reward_value` INT NOT NULL,
  `status` ENUM('pending','issued','cancelled') NOT NULL DEFAULT 'pending',
  `issued_at` DATETIME NULL,
  FOREIGN KEY (`attribution_id`) REFERENCES `referral_attributions`(`id`),
  INDEX `idx_rr_recipient` (`recipient_user_id`),
  INDEX `idx_rr_attribution` (`attribution_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- C. SEED: Referral reward rule (DRAFT — not yet approved/active)
-- Admin must approve before rewards are issued.
-- ===================================================================
INSERT INTO `loyalty_rules` (`rule_code`, `rule_name`, `rule_type`, `config_value`, `status`, `approved_by`)
VALUES (
  'rule_referral_reward',
  'Thưởng Giới Thiệu Bạn Bè',
  'earn',
  JSON_OBJECT(
    'referrer_points', 50,
    'referee_points', 20,
    'qualifying_min_order_vnd', 500000,
    'requires_order_delivered', true,
    'requires_order_paid', true,
    'return_grace_days', 7,
    'self_referral_blocked', true
  ),
  'draft',
  NULL
)
ON DUPLICATE KEY UPDATE
  `config_value` = VALUES(`config_value`),
  `status` = VALUES(`status`);
