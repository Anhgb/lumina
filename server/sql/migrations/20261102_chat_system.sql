-- =============================================================================
-- LUMINA EYEWEAR — CHAT ASSISTANT DATABASE MIGRATION
-- Migration: 20261102_chat_system.sql
-- Target: MySQL / MariaDB (XAMPP Environment)
-- =============================================================================

USE `lumina_eyewear_db`;

-- -----------------------------------------------------------------------------
-- 1. Table: chat_sessions (Conversation Sessions for Customer & Guest)
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
-- 2. Table: chat_messages (Message History)
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
-- 3. Table: chat_feedbacks (AI Response Ratings)
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
