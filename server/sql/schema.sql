-- =============================================================================
-- LUMINA EYEWEAR — DATABASE SCHEMA (PRD v5.1 Section 3 & Prompt 7)
-- Target: MySQL / MariaDB (XAMPP Environment)
-- Database: lumina_eyewear_db
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `lumina_eyewear_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `lumina_eyewear_db`;

-- -----------------------------------------------------------------------------
-- 1. Table: products (Authoritative Catalog Inventory & Pricing)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` ENUM('cateye', 'aviator', 'round', 'square') NOT NULL,
  `category_label` VARCHAR(100) NULL,
  `price` DECIMAL(12, 2) NOT NULL,
  `original_price` DECIMAL(12, 2) NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `dimensions` VARCHAR(100) NULL,
  `frame_material` VARCHAR(255) NULL,
  `image_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_products_category` (`category`),
  INDEX `idx_products_stock` (`stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: orders (Official Order Transaction Records)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `order_code` VARCHAR(50) NOT NULL,
  `user_id` VARCHAR(100) NOT NULL,
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_email` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `shipping_address` VARCHAR(500) NOT NULL,
  `shipping_city` VARCHAR(100) NOT NULL,
  `order_notes` TEXT NULL,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cod',
  `subtotal_amount` DECIMAL(12, 2) NOT NULL,
  `shipping_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `voucher_code` VARCHAR(50) NULL,
  `total_amount` DECIMAL(12, 2) NOT NULL,
  `payment_status` ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid',
  `status` ENUM('pending', 'confirmed', 'processing', 'completed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  `ip_address` VARCHAR(50) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_code` (`order_code`),
  INDEX `idx_orders_user` (`user_id`),
  INDEX `idx_orders_status` (`status`),
  INDEX `idx_orders_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2b. Table: payments (Payment attempts and reconciliation history)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_code` VARCHAR(64) NOT NULL,
  `order_id` INT NOT NULL,
  `provider` VARCHAR(40) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'VND',
  `status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `provider_transaction_id` VARCHAR(128) NULL,
  `idempotency_key` VARCHAR(128) NOT NULL,
  `reconciliation_reference` VARCHAR(128) NULL,
  `verification_note` VARCHAR(500) NULL,
  `verified_by` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_code` (`payment_code`),
  UNIQUE KEY `uk_payments_idempotency` (`idempotency_key`),
  UNIQUE KEY `uk_payments_provider_transaction` (`provider_transaction_id`),
  INDEX `idx_payments_order_created` (`order_id`, `created_at`),
  INDEX `idx_payments_status` (`status`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: order_items (Items within Orders)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `order_id` INT NOT NULL,
  `product_id` VARCHAR(100) NOT NULL,
  `product_type` ENUM('catalog', 'custom') NOT NULL DEFAULT 'catalog',
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  `subtotal` DECIMAL(12, 2) NOT NULL,
  `prescription_data` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  INDEX `idx_order_items_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: custom_specs (3D Bespoke Eyewear Specifications)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `custom_specs` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `order_item_id` INT NOT NULL,
  `base_model` ENUM('aviator', 'cateye', 'round', 'square', 'modern-pilot', 'sculpted-cateye', 'oversized-square', 'slim-oval', 'geometric-hexagon', 'bug-eye') NOT NULL,
  `frame_type` VARCHAR(50) DEFAULT 'acetate',
  `frame_color` VARCHAR(50) NOT NULL,
  `metalness` DECIMAL(3, 2) NOT NULL DEFAULT 0.90,
  `roughness` DECIMAL(3, 2) NOT NULL DEFAULT 0.20,
  `lens_color` VARCHAR(50) NOT NULL,
  `lens_opacity` DECIMAL(3, 2) NOT NULL DEFAULT 0.45,
  `has_rhinestones` TINYINT(1) NOT NULL DEFAULT 0,
  `charms` JSON NULL,
  `engraving_text` VARCHAR(50) NULL,
  `snapshot_path` VARCHAR(500) NULL,
  `temple_style` VARCHAR(50) NOT NULL DEFAULT 'classic-acetate',
  `engraving_placement` ENUM('outer_temple', 'inner_temple', 'two_temples') NULL DEFAULT 'outer_temple',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: chat_sessions (Lumina AI Assistant Sessions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chat_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_code` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(100) NULL,
  `guest_session_id` VARCHAR(100) NULL,
  `title` VARCHAR(255) NULL DEFAULT 'Cuộc trò chuyện mới',
  `status` ENUM('active', 'archived', 'deleted') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_chat_sessions_code` (`session_code`),
  INDEX `idx_chat_sessions_user` (`user_id`),
  INDEX `idx_chat_sessions_guest` (`guest_session_id`),
  INDEX `idx_chat_sessions_status` (`status`),
  INDEX `idx_chat_sessions_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: chat_messages (Message History)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `role` ENUM('user', 'assistant', 'system') NOT NULL,
  `content` TEXT NOT NULL,
  `message_type` VARCHAR(50) NOT NULL DEFAULT 'text',
  `metadata` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_chat_messages_session_created` (`session_id`, `created_at`),
  CONSTRAINT `fk_chat_messages_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: chat_feedbacks (AI Response Ratings)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `chat_feedbacks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `message_id` BIGINT UNSIGNED NULL,
  `user_id` VARCHAR(100) NULL,
  `guest_session_id` VARCHAR(100) NULL,
  `rating` ENUM('liked', 'disliked') NOT NULL,
  `comment` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_chat_feedbacks_session` (`session_id`),
  INDEX `idx_chat_feedbacks_rating` (`rating`),
  CONSTRAINT `fk_chat_feedbacks_session` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chat_feedbacks_message` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
