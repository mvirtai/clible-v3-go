-- Migration 017: Add user profile preferences, subscriptions, and display name
-- Description: Adds user display name, preferred UI language, theme, and default Bible Translation.
-- Also ensures subscription tracking columns exist.

ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(32) NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_lang VARCHAR(8) NOT NULL DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(16) NOT NULL DEFAULT 'system';
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_translation_id VARCHAR(64) NOT NULL DEFAULT 'web';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id VARCHAR(32) NOT NULL DEFAULT 'initials';

CREATE INDEX IF NOT EXISTS idx_users_default_translation ON users(default_translation_id);