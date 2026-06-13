-- Migration 005: Scopes and Saved Results
-- Adds support for grouping saved work into contexts (scopes)
CREATE TABLE IF NOT EXISTS scopes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY,
    scope_id TEXT NOT NULL,
    name TEXT NOT NULL,
    query_text TEXT NOT NULL,
    search_scope TEXT NOT NULL,
    scope_value TEXT,
    translation_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scope_id) REFERENCES scopes(id) ON DELETE CASCADE,
    FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE
    SET NULL
);
CREATE TABLE IF NOT EXISTS saved_analyses (
    id TEXT PRIMARY KEY,
    scope_id TEXT NOT NULL,
    name TEXT NOT NULL,
    reference TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    translation_id TEXT,
    params_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scope_id) REFERENCES scopes(id) ON DELETE CASCADE,
    FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE
    SET NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_scope ON saved_searches(scope_id);
CREATE INDEX IF NOT EXISTS idx_saved_analyses_scope ON saved_analyses(scope_id);