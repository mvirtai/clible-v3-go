-- Migration 013: Notebook layout state & fix column names typo
-- Description: Renames create_at/update_at typos to created_at/updated_at,
--              and adds col_span/col_height for 24-column resizable grid.

ALTER TABLE notebooks RENAME COLUMN create_at TO created_at;
ALTER TABLE notebooks RENAME COLUMN update_at TO updated_at;
ALTER TABLE notebook_cells RENAME COLUMN create_at TO created_at;
ALTER TABLE notebook_cells RENAME COLUMN update_at TO updated_at;

ALTER TABLE notebooks ADD COLUMN col_span INTEGER NOT NULL DEFAULT 12;
ALTER TABLE notebooks ADD COLUMN col_height INTEGER;