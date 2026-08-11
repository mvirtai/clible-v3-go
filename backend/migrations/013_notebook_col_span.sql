-- Migration 013: Notebook layout state
-- Description: Adds col_span to notebooks for persistent card width in the
--              24-column grid, and custom_height for user-defined card height.
ALTER TABLE notebooks
ADD COLUMN col_span INTEGER NOT NULL DEFAULT 12;
ALTER TABLE notebooks
ADD COLUMN col_height INTEGER;