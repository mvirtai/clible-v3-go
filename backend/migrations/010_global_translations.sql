-- Migration 010: System-controlled translation distribution
-- All translations are global presets managed by the system.
-- Users can activate/deactivate translations via user_translations.
-- This column makes the intent explicit and supports future admin tooling.

ALTER TABLE translations ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT TRUE;

-- Ensure all existing translations are marked as global
UPDATE translations SET is_global = TRUE;
