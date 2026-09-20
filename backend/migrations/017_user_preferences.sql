-- Migration 017: Add user profile preferences and display name
-- Description: Adds user display name, preferred UI language, theme, and default Bible Translation

ALTER TABLE users ADD COLUMN display_name VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN preferred_lang VARCHAR(8) NOT NULL DEFAULT 'en';
ALTER TABLE users ADD COLUMN theme_preference VARCHAR(16) NOT NULL DEFAULT 'system';
ALTER TABLE users ADD COLUMN default_translation_id VARCHAR(64) NOT NULL DEFAULT 'web';

CREATE INDEX IF NOT EXISTS idx_users_default_translation ON users(default_translation_id);