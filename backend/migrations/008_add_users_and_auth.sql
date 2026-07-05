-- backend/migrations/008_add_users_and_auth.sql
-- Migration 008: Add users and authentication support

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add user_id columns to existing tables for user-specific data.
-- SQLite supports ADD COLUMN directly; NULL values are allowed for backward compatibility.
ALTER TABLE scopes ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE search_history ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for optimized lookups
CREATE INDEX IF NOT EXISTS idx_scopes_user ON scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);