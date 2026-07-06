-- Migration 009: User translations mapping table
CREATE TABLE IF NOT EXISTS user_translations (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    translation_id TEXT NOT NULL REFERENCES translations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, translation_id)
);

CREATE INDEX IF NOT EXISTS idx_user_translations_user ON user_translations(user_id);
