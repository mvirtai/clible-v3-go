-- Migration 018: Add AI response language preference
-- Description: Adds ai_language column to users to decouple AI output language from UI language.

ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_language VARCHAR(16) NOT NULL DEFAULT 'fi';
