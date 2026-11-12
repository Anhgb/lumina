-- Migration 003: Add temple_style and engraving_placement to custom_specs
-- Safe to run multiple times (uses IF NOT EXISTS / ALTER IGNORE logic)
-- Date: 2026-11-10

-- Add temple_style column if not exists
ALTER TABLE `custom_specs` 
  ADD COLUMN IF NOT EXISTS `temple_style` VARCHAR(50) NOT NULL DEFAULT 'classic-acetate' AFTER `engraving_text`;

-- Add engraving_placement column if not exists  
ALTER TABLE `custom_specs`
  ADD COLUMN IF NOT EXISTS `engraving_placement` ENUM('outer_temple', 'inner_temple', 'two_temples') NULL DEFAULT 'outer_temple' AFTER `temple_style`;

-- Backfill: set default values for existing rows
UPDATE `custom_specs` 
  SET `temple_style` = 'classic-acetate' 
  WHERE `temple_style` IS NULL OR `temple_style` = '';

UPDATE `custom_specs`
  SET `engraving_placement` = 'outer_temple'
  WHERE `engraving_placement` IS NULL;
