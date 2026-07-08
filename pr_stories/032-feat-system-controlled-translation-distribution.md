# PR Story: System-Controlled Translation Distribution

This PR replaces the ad-hoc, user-driven XML upload model for Bible translations with a fully system-controlled, shared-catalog architecture. It fixes two critical multi-tenant security flaws identified during an architectural review — translation collision and unbounded data redundancy — by removing the public import endpoint entirely and replacing it with lightweight activate/deactivate operations.

---

## Business Context

The previous translation model contained two fundamental defects that would have become critical production liabilities at any meaningful user scale:

### 1. Translation Collision (Data Corruption Risk)

The `POST /api/translations/import` endpoint accepted a user-supplied `translationId` string and, if that ID already existed in the database, **deleted the existing translation record and all of its verses** before re-inserting the new content. Because translation IDs were a flat, shared namespace with no ownership concept, any authenticated user could:

- Silently overwrite another user's privately imported translation by guessing or knowing its ID.
- Destroy a global system preset (e.g., `web`, `fin-1992`, `kjv`) by sending an import request with a matching ID.

This was a data integrity and privacy violation by design.

### 2. Data Redundancy (O(N·V) Storage Growth)

Preset translations (e.g., Kirkkoraamattu 1992 ≈ 31,000 verses) were distributed by having each user's browser download the full XML file from GitHub and re-upload it to the backend, which inserted a completely new copy of all verses per user. With 100 users activating the same preset, this produced 3,100,000 identical, redundant rows in the `verses` table — growing both Neon PostgreSQL storage costs and write I/O linearly with user count.

### Decision

Rather than patching the flawed import model with ownership guards, the architectural decision was made to **take full control of translation distribution**: all Bible translations are system-managed global presets, seeded into the database by administrators. Users interact with translations exclusively through activate/deactivate operations that create or remove a single row in the `user_translations` junction table. Custom XML uploads are no longer a user-facing feature.

---

## Architectural Changes

### Database — Migration 010

**New file:** `backend/migrations/010_global_translations.sql`

Adds an `is_global BOOLEAN NOT NULL DEFAULT TRUE` column to the `translations` table. All existing and future translation records default to `TRUE`. This column makes the system-controlled nature of translations explicit and provides a foundation for future admin tooling.

```sql
ALTER TABLE translations ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT TRUE;
UPDATE translations SET is_global = TRUE;
```

---

### Backend — Repository (`translation_repo.go`)

The repository interface was redesigned to serve the new architecture cleanly:

| Method | Description |
|---|---|
| `GetAllWithInstalled(ctx, userID)` | **New.** Returns all global translations with a per-user `installed` boolean computed via a correlated subquery against `user_translations`. Primary catalog endpoint. |
| `GetByUser(ctx, userID)` | **Simplified.** Returns only `is_global = TRUE` translations that the user has explicitly linked. Used for verse-level permission checks. |
| `IsAccessible(ctx, userID, translationID)` | **Hardened.** Uses a `JOIN` on `user_translations` instead of the previous `OR id = 'web'` hardcode. |
| `LinkUser(ctx, userID, translationID)` | **Enhanced validation.** Verifies `is_global = TRUE` before inserting the `user_translations` row. |
| `UnlinkUser(ctx, userID, translationID)` | **New.** Removes a single `user_translations` row. O(1) cost, no verse data is touched. |

---

### Backend — API Handler (`translation_handler.go`)

The handler was fully rewritten. `SeedService` dependency removed.

| Endpoint | Before | After |
|---|---|---|
| `GET /api/translations` | `GetByUser` — user-linked translations only | `GetAllWithInstalled` — full global catalog with `installed` flag |
| `POST /api/translations/import` | Multipart XML upload (13–30 seconds) | **Removed** |
| `POST /api/translations/link` | Did not exist | **New.** Activates a global preset for the user. O(1). |
| `DELETE /api/translations/link` | Did not exist | **New.** Deactivates a translation. Returns `204 No Content`. |

---

### Backend — `main.go`

```diff
-mux.Handle("POST /api/translations/import", requireAuth(...ImportTranslation))
+mux.Handle("POST /api/translations/link",   requireAuth(...LinkTranslation))
+mux.Handle("DELETE /api/translations/link", requireAuth(...UnlinkTranslation))
```

The `parsers` import and `SeedService` wiring were removed from the translation handler construction path.

---

### Backend — Models (`models/types.go`)

```go
type Translation struct {
    // ... existing fields unchanged ...
    IsGlobal  bool `json:"isGlobal" db:"is_global"`
    Installed bool `json:"installed" db:"-"` // View field: computed per user, not stored in DB
}
```

`Installed` uses `db:"-"` to signal it is not a database column; it is populated by `GetAllWithInstalled` via a correlated subquery and serialized to JSON for the frontend.

---

### Frontend — Type System (`types/bible.ts`)

`InstalledTranslation` updated to match the new backend payload. `AvailableTranslation` removed — the concept is now unified: the backend always returns the full catalog with per-user `installed` flags, eliminating the need for a separate type.

---

### Frontend — API Service (`services/api.ts`)

`importTranslation` (multipart FormData, 13–30 second operation) replaced with:

```typescript
// POST /api/translations/link  — activates a global preset for the current user (O(1))
linkTranslation(translationId: string): Promise<void>

// DELETE /api/translations/link — deactivates a translation for the current user (O(1))
unlinkTranslation(translationId: string): Promise<void>
```

---

### Frontend — `TranslationManager.tsx`

Fully rewritten:

- **Removed:** Custom XML upload form, GitHub preset download flow, `PRESET_TRANSLATIONS` constant, multipart logic, 13-second loading UX.
- **Added:** Props-driven rendering (`translations: InstalledTranslation[]` from parent `App.tsx`, no internal fetching).
- **Added:** Two UI sections — **Active Translations** (Remove button triggering `unlinkTranslation`) and **Available Translations** (Install button triggering `linkTranslation`).
- **Changed:** All operations complete in < 1 second (vs. 13–30 seconds previously).

---

### Frontend — `TranslationSelector.tsx`

Added `.filter(t => t.installed)` on the `getTranslations()` response to ensure the verse-reading dropdown only shows translations the user has explicitly activated.

---

### Frontend — `App.tsx`

- `installedTranslations` state now holds the full global catalog (all presets with `installed` flags), sourced from `GET /api/translations`.
- New `activatedTranslations` derived constant (`installedTranslations.filter(t => t.installed)`) passed to `CompareView` and `AnalyticsView`, which require only user-accessible translations.
- `TranslationManager` receives `translations={installedTranslations}` and `onTranslationChanged={handleTranslationChanged}` props.

---

## Testing

### Automated Tests

```bash
# Backend — all packages
cd backend && go test ./...

# Frontend — vitest
cd frontend && npm test
```

New test coverage added:

- **`translation_repo_test.go`** — `GetAllWithInstalled` (catalog with installed flags), `LinkUser` (idempotency; non-existent translation returns error), `UnlinkUser` (revokes access, idempotent), `IsAccessible` (no hardcoded `web` bypass), `GetByUser`.
- **`translation_handler_test.go`** — `GET /api/translations` response shape with `installed` field; `POST /api/translations/link` happy path and error cases (empty ID, non-existent translation returns 400); `DELETE /api/translations/link` returns `204 No Content`.
- **`TranslationManager.test.tsx`** — Active/Available sections render correctly from mock props; `linkTranslation` is called with correct ID when Install is clicked.
- **`api.test.ts`** — `linkTranslation` POST and `unlinkTranslation` DELETE: correct endpoint, HTTP method, and JSON request body.

### Manual Verification Checklist

- [ ] `task check` passes with zero errors.
- [ ] `GET /api/translations` returns the full catalog with `installed: false` for a fresh user.
- [ ] Clicking "Install" on a preset in the Translation Management panel completes instantly (< 1 second).
- [ ] The installed translation appears in the verse reader dropdown immediately after refresh.
- [ ] Clicking "Remove" deactivates the translation and it disappears from the dropdown.
- [ ] Neon console confirms `is_global = TRUE` on all rows in the `translations` table after migration 010 runs.
