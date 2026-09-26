-- Migration 019: Add church year liturgical default view mode preference
-- Description: Adds liturgical_view_mode column to users ('drawers' or 'tabs').

ALTER TABLE users ADD COLUMN IF NOT EXISTS liturgical_view_mode VARCHAR(16) NOT NULL DEFAULT 'drawers';
