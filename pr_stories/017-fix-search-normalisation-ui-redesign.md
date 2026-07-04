# Feature: Bug Fixes, UI Redesign, and Test Coverage Improvements

## Business Context

This pull request delivers three critical fixes and improvements that were identified during the
initial frontend integration testing phase:

1. **Read by Reference normalisation** — The verse reader previously accepted only the exact
   canonical format (`JHN 3:16`). It now recognises any commonly written form: `joh.`, `john`,
   `Johannes`, `1 Moos`, `1Moos`, etc., by mapping all inputs through the `book_names.json`
   alias index before the API call.

2. **Text Search regex bug** — Plain-text (non-regex) searches returned zero results because the
   URL query parameter `regex=false` was forwarded as a string to the backend, which treated it as
   a valid FTS5 MATCH pattern. The fix parses the parameter as a proper boolean and routes FTS5 or
   Go regexp lookups to separate, dedicated branches.

3. **UI Redesign to Clible-v2 standard** — The frontend previously used a purple-accent colour
   scheme that was inconsistent with the established Clible-v2 design language. All components and
   the global CSS have been rewritten to match the warm neutral palette (golden accent, serif verse
   typography, dark/light token system).

Additionally, the Taskfile and Vitest configuration were extended to support parallel quality
checks and structured coverage reporting.

---

## Commits

This PR consists of the following structured commits:

- **`fix(search): convert regex query param from string to bool`**
  - Parses the `regex` URL parameter as a proper boolean in the backend handler.
  - Updates service signatures and splits the database search repository into distinct SQLite FTS5 and Go regexp lookup paths.
  - Adds full HTTP handler integration tests (100% coverage).
- **`feat(reader): normalise book names before API lookup`**
  - Builds an internal alias index from `book_names.json` in the frontend.
  - Normalises book reference names (stripping dots and spaces) before hitting the API.
  - Adds a comprehensive test suite for reference normalization with 14 target cases.
- **`style(ui): adopt Clible-v2 design system and colour palette`**
  - Implements the warm neutral palette (gold/serif typography, light/dark custom properties).
  - Redesigns search interface, sidebar layout, and search history card badges.
  - Refactors translation manager UI for drag-and-drop XML import and preset cards.
- **`chore(ci): parallel quality gates and structured coverage reporting`**
  - Optimizes `Taskfile.yml` to run backend and frontend checks concurrently.
  - Configures Vitest HTML/JSON coverage reporting using v8 provider.
  - Unifies coverage report locations under `.cov/`.

---

## Architectural Changes

### Backend — `backend/internal/`

#### `api/bible_handler.go` [MODIFY]

- `SearchVerses`: parse `regex` URL param with `r.URL.Query().Get("regex") == "true"` instead of
  passing the raw string forward. This eliminates the silent FTS5 misrouting bug.

#### `services/verse_service.go` [MODIFY]

- `SearchVerses` signature changed from `regexPattern string` to `useRegex bool`.
- Internally branches into `params.RegexPattern` or `params.FTSQuery` before delegating to the
  repository, keeping the service free of SQL concerns.

#### `db/verse_repo.go` [MODIFY]

- `Search` method split into two fully independent execution branches:
  - **FTS5 branch**: `verses_fts MATCH ?` for fast full-text search.
  - **Regexp branch**: full table scan + Go `regexp.Compile` for pattern matching.
- Each branch owns its own `defer rows.Close()` to avoid double-close issues.

#### `api/bible_handler_test.go` [MODIFY]

- Added three new integration tests for the `SearchVerses` HTTP handler:
  - `TestBibleHandler_SearchVerses_Success`: covers both FTS mode and regex mode end-to-end.
  - `TestBibleHandler_SearchVerses_MissingQuery`: expects `400 Bad Request` when `q` is absent.
  - `TestBibleHandler_SearchVerses_InvalidRegexError`: expects `500 Internal Server Error` when
    an invalid regexp is supplied.
- `SearchVerses` handler coverage improved from **0.0 %** to **100 %**.

#### `services/verse_service_test.go` [MODIFY]

- Updated all `SearchVerses` call sites to new `(ctx, query, useRegex bool, translationID)`
  signature.

---

### Frontend — `frontend/src/`

#### `utils/bookNames.ts` [MODIFY]

- Added `buildAliasIndex()`: builds a `Map<string, string>` at module load time, normalising every
  entry in `book_names.json` (canonical ID, English name, Finnish name, `abbr_fi`, and all
  `aliases_fi`) by stripping dots and whitespace.
- Added `resolveBookId(raw: string): string | null`: normalises the caller's input with the same
  rules and performs a single Map lookup.
- **Normalisation rule**: all whitespace is removed (not just collapsed), so `"1 Moos"`,
  `"1. Moos"`, and `"1Moos"` all hash to `"1moos"` and match the stored alias.

#### `components/VerseReader.tsx` [MODIFY]

- Before the API call, the user-typed reference string is run through a regex that extracts the
  book-name prefix and passes it to `resolveBookId()`. If a canonical ID is found, it replaces the
  raw prefix; otherwise the original string is forwarded unchanged.

#### `utils/bookNames.test.ts` [MODIFY]

- Added `resolveBookId` test suite with 14 assertions covering: exact IDs, English names,
  Finnish names, abbreviations with/without dots, no-space variants, multi-word Finnish names,
  and unknown inputs.

#### `index.css` [MODIFY — full rewrite]

- New design token system with CSS custom properties for both light and dark modes:
  - Light: `--bg: #fdfcfb`, `--accent: #d4a373`, warm neutral surfaces.
  - Dark: `--bg: #0f1113`, `--accent: #e0b47f`, deep neutral surfaces.
- Serif font stack (`Georgia`) for verse bodies; system sans-serif for UI chrome.
- Thin scrollbar utility class (`.scrollbar-thin`).

#### `App.tsx` [MODIFY]

- Sticky glass header with `backdrop-filter: blur`.
- Translation Manager shown/hidden via toggle button.
- Responsive 3-column grid (reader + search in left 2/3; history sidebar in right 1/3).
- Empty-state prompt with direct "Install a Translation" CTA.

#### `components/VerseSearch.tsx` [MODIFY]

- Rounded pill input and search button with golden accent.
- Checkbox for toggling regex mode with adaptive placeholder text.

#### `components/SearchHistory.tsx` [REWRITE — file was overwritten with wrong content]

- Restored correct `SearchHistory` component that accepts `triggerRefresh: boolean` prop.
- Sidebar card listing recent searches with query text, translation, mode, and a result-count
  badge.

#### `components/TranslationSelector.tsx` [MODIFY]

- Compact pill selector in the sticky header.
- `useEffect` loading pattern fixed: `setLoading(true)` moved to a `Promise.resolve().then()`
  microtask to satisfy the `react-hooks/set-state-in-effect` ESLint rule.
- Added `active` cleanup flag to prevent state updates on unmounted components.

#### `components/TranslationManager.tsx` [MODIFY — full rewrite after corruption]

- Preset download cards (Biblia 1776, WEB, KJV) with GitHub streaming install.
- Drag-drop XML upload with auto-populated ID/name/lang fields.
- Error catch blocks changed from `err: any` to `err: unknown` with `instanceof Error` guard to
  satisfy `@typescript-eslint/no-explicit-any` rule.

---

### Tooling — Project root

#### `Taskfile.yml` [MODIFY]

- `check` task refactored to run `backend:check` and `frontend:check` **concurrently** via the
  `deps:` key (was serial).
- New `backend:check` task: runs `tidy`, `lint`, `test-cov`.
- New `frontend:check` task: runs `lint`, `test-cov`.
- Coverage output paths moved to a shared `.cov/backend/` directory at the workspace root.
- `go test` commands now include `-race` flag for data-race detection.
- New `frontend:test-cov` task for HTML/JSON coverage reports.

#### `frontend/vite.config.ts` [MODIFY]

- Added `coverage` block in `test` config: provider `v8`, reporters `text/html/json`,
  output to `../.cov/frontend`.

---

## Testing Strategy

### Automated Verification

```bash
# Full quality gate (runs backend and frontend in parallel)
task check
```

Expected outcome: all checks pass, 0 lint issues, all tests green.

### Manual Acceptance Tests

| Input | Expected Result |
|---|---|
| `joh. 3:16` in Read by Reference | Verse returned |
| `john 3:16` in Read by Reference | Verse returned |
| `Johannes 3:16` in Read by Reference | Verse returned |
| `1 Moos 1:1` in Read by Reference | Verse returned |
| Text Search: `light` (regex OFF) | Results returned via FTS5 |
| Text Search: `^For God` (regex ON) | Results via Go regexp |
| UI in light mode | Warm neutral background, golden accent |
| UI in dark mode | Deep black background, warm golden accent |

### Coverage Summary (before → after)

| Package | Before | After |
|---|---|---|
| `internal/api` | 50.0 % | ~68 % |
| `internal/services` | 69.9 % | 69.9 % |
| `internal/db` | 50.7 % | 50.7 % |
| Frontend `bookNames.ts` | partial | +14 `resolveBookId` assertions |
