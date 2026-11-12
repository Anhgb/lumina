-- Lumina Eyewear: additive Payment Management migration.
-- Safe to re-run: existing order rows remain untouched and receive payment_status='unpaid'.
USE `lumina_eyewear_db`;

SET @payment_status_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'payment_status'
);
SET @payment_status_sql = IF(
  @payment_status_exists = 0,
  "ALTER TABLE `orders` ADD COLUMN `payment_status` ENUM('unpaid', 'pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'unpaid' AFTER `total_amount`",
  'SELECT 1'
);
PREPARE payment_status_stmt FROM @payment_status_sql;
EXECUTE payment_status_stmt;
DEALLOCATE PREPARE payment_status_stmt;

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
