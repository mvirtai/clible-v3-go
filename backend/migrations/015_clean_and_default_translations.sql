-- Migration 015: Clean up Hebrew translations and set default user translations

-- 1. If heb-leningradu exists and heb-leningrad exists with no verses, clean out empty heb-leningrad
DELETE FROM translations 
WHERE id = 'heb-leningrad' 
  AND EXISTS (SELECT 1 FROM translations WHERE id = 'heb-leningradu')
  AND NOT EXISTS (SELECT 1 FROM verses WHERE translation_id = 'heb-leningrad');

-- 2. If heb-leningradu exists, create heb-leningrad copying metadata
INSERT INTO translations (id, name, language, format, source_url, is_global)
SELECT 'heb-leningrad', 'Heprea (Leningrad Codex)', 'he', format, COALESCE(source_url, ''), TRUE
FROM translations
WHERE id = 'heb-leningradu'
ON CONFLICT (id) DO UPDATE SET
    name = 'Heprea (Leningrad Codex)',
    language = 'he',
    is_global = TRUE;

-- 3. If heb-leningrad exists directly, ensure its name and language are set
UPDATE translations
SET name = 'Heprea (Leningrad Codex)',
    language = 'he'
WHERE id = 'heb-leningrad';

-- 4. Migrate all verses from heb-leningradu to heb-leningrad
UPDATE verses
SET translation_id = 'heb-leningrad',
    id = REPLACE(id, 'heb-leningradu:', 'heb-leningrad:')
WHERE translation_id = 'heb-leningradu';

-- 5. Delete obsolete heb-leningradu placeholder
DELETE FROM translations WHERE id = 'heb-leningradu';

-- 6. Rename Greek translation to clear human-readable name
UPDATE translations
SET name = 'Kreikka (SBLGNT)'
WHERE id = 'sblgnt';

-- 7. Link default translations for all existing users
INSERT INTO user_translations (user_id, translation_id)
SELECT u.id, t.id
FROM users u
CROSS JOIN translations t
WHERE t.id IN ('web', 'kjv', 'fin-1992', 'fin-biblia-33-38', 'fin-1776', 'sblgnt', 'heb-leningrad')
ON CONFLICT (user_id, translation_id) DO NOTHING;
