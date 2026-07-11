-- Notebooks table: stores user study notebooks with optional workspace scope association.
-- Notebooks survive scope deletion to preserve user work (scope_id → NULL on deletion).
-- Deleted users cascade-delete their notebooks via user_id FK.
CREATE TABLE IF NOT EXISTS notebooks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    user_id TEXT NOT NULL,
    scope_id TEXT,
    create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scope_id) REFERENCES scopes(id) ON DELETE SET NULL
);

-- Notebook cells table: structured markdown/code snippets within a notebook.
-- Position ordering is guaranteed by explicit integer position field.
-- Cells cascade-delete when notebook is deleted.
CREATE TABLE IF NOT EXISTS notebook_cells (
    id TEXT PRIMARY KEY,
    notebook_id TEXT NOT NULL,
    content TEXT NOT NULL,
    cell_type TEXT NOT NULL CHECK (cell_type IN ('markdown', 'code')),
    position INTEGER NOT NULL,
    create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE,
    UNIQUE (notebook_id, position)
);

-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_notebooks_user ON notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_scope ON notebooks(scope_id);
CREATE INDEX IF NOT EXISTS idx_notebook_cells_notebook ON notebook_cells(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_cells_position ON notebook_cells(notebook_id, position);
