# 016 — feat: notebooks foundation (backend CRUD + frontend cell editor)

## Summary

Introduces the Clible Notebooks feature: a cell-based note-taking system integrated
into the application. Users can create notebooks, add Markdown and CLI command cells,
and reference Bible verses with `[[Book Ch:V]]` syntax that links directly to the
VerseReader.

This PR covers the full backend foundation (database, repository, service, API
handlers) and the complete frontend cell editor UI. CLI command execution is
intentionally deferred to a subsequent PR.

---

## Business Context

Notebooks allow users to combine free-form theological notes with direct verse
references in a single document. Unlike the existing saved searches and scopes, a
notebook is a persistent, editable document — closer to a study journal than a search
result. The feature has been deliberately scoped to a solid foundation: create, read,
update, delete notebooks and their cells. No speculative features were added.

---

## Architectural Changes

### Backend

#### Migration — `migrations/012_notebooks.sql`

Two new tables:

- `notebooks` — title, user_id, optional scope_id, timestamps
- `notebook_cells` — content, cell_type (`markdown` | `code`), result_json, position

Notable constraints:
- `UNIQUE (notebook_id, position)` prevents duplicate cell order
- `ON DELETE CASCADE` from notebooks → cells keeps data consistent
- Four indexes covering user lookups, scope lookups, and cell ordering

#### Model — `internal/models/notebook.go`

- `Notebook` struct with `Cells []Cell` (loaded on demand)
- `Cell` struct with `ResultJSON json.RawMessage` (reserved for CLI execution results
  in Phase 3)
- `CellType` typed as a string constant (`markdown`, `code`)

#### Repository — `internal/db/notebook_repo.go`

All methods use `context.Context` for cancellation propagation. Key design decisions:

- `SaveCells` uses a transaction: deletes all existing cells for the notebook, then
  re-inserts the full ordered list. This avoids complex diff logic and is safe given
  the debounce pattern on the frontend.
- `GetCells` returns cells ordered by `position ASC`
- `GetByID` returns `nil, nil` on not-found (caller checks for nil)

#### Service — `internal/services/notebook_service.go`

Ownership validation is enforced at the service layer on every mutating operation.
Scope validation (when a scopeId is provided) checks that the scope belongs to the
requesting user before associating it with a notebook.

#### API Handler — `internal/api/notebook_handler.go`

Registered routes (all protected by `requireAuth` middleware):

```
GET    /api/notebooks
GET    /api/notebooks/{id}
POST   /api/notebooks
PUT    /api/notebooks/{id}
DELETE /api/notebooks/{id}
PUT    /api/notebooks/{id}/cells
```

Error responses follow a consistent `{"error": "..."}` JSON envelope. The handler
does not return HTTP 500 for business logic errors — only for genuine internal
failures.

### Frontend

#### `components/notebook/types.ts`

TypeScript types mirroring the backend JSON payloads (`Notebook`, `Cell`,
`CellType`, `CellResult`). The `description` field was intentionally omitted — it
has no database backing at this stage.

#### `components/notebook/NotebookEditor.tsx`

Main orchestrator component. Responsibilities:

- Fetches notebook and cells on mount
- Auto-saves on cell changes with a 1500 ms debounce (no Save button needed)
- Handles cell insertion at any position, deletion, and reordering (move up/down)
- Passes `onSelectVerse` callback through to MarkdownCell so verse link clicks open
  the VerseReader in the parent

The `PUT /api/notebooks/{id}/cells` endpoint receives the full ordered cell list on
each save — position is derived from array index, not stored state.

#### `components/notebook/MarkdownCell.tsx`

Displays markdown content rendered via `react-markdown`. Double-click toggles an
editing textarea. `[[Book Ch:V]]` syntax is preprocessed into a markdown link
(`#bible-link/...`) which `markdownComponents.a` intercepts and renders as a plain
clickable anchor that calls `onSelectVerse`. No hover prefetch, no tooltip — that
complexity was explicitly rejected in the roadmap.

#### `components/notebook/CodeCell.tsx`

Renders a CLI-style input row (`$ clible ...`). The `Run` button calls
`POST /api/notebooks/{id}/cells/{cell_id}/execute`, which does not yet exist on the
backend. The button will return an error gracefully. The `ResultRenderer` sub-component
handles `verse_list` and `error` result types — ready for Phase 3.

#### `components/notebook/CellWrapper.tsx`

A hover-activated toolbar that floats above each cell. Provides: cell type toggle
(Markdown ↔ CLI Command), move up, move down, delete.

#### `App.tsx`

Added a `notebooks` view mode. The notebooks panel shows a list of notebooks for the
authenticated user, a create button, and opens the `NotebookEditor` on selection.

---

## Known Limitations (Deferred to Phase 3)

- `POST /api/notebooks/{id}/cells/{cell_id}/execute` is not implemented. The `Run`
  button in CodeCell is wired up and ready; it will surface a fetch error until the
  backend endpoint is added.
- No autocomplete for CLI commands — a plain text input suffices for now.

---

## Testing

### Backend

- `internal/db/notebook_repo_test.go` — repository CRUD round-trips with SQLite
  in-memory
- `internal/services/notebook_service_test.go` — service-level tests including
  ownership enforcement and scope validation
- `internal/api/notebook_handler_test.go` — HTTP handler tests covering all six
  endpoints, authorization, and error paths

### Frontend

- `task frontend:check` passes (lint + vitest)
- No notebook-specific unit tests added in this PR — the component relies on the
  backend API and is best validated via integration or E2E testing

---

## Files Changed

### New

- `backend/migrations/012_notebooks.sql`
- `backend/internal/models/notebook.go`
- `backend/internal/db/notebook_repo.go`
- `backend/internal/db/notebook_repo_test.go`
- `backend/internal/services/notebook_service.go`
- `backend/internal/services/notebook_service_test.go`
- `backend/internal/api/notebook_handler.go`
- `backend/internal/api/notebook_handler_test.go`
- `frontend/src/components/notebook/types.ts`
- `frontend/src/components/notebook/NotebookEditor.tsx`
- `frontend/src/components/notebook/MarkdownCell.tsx`
- `frontend/src/components/notebook/CodeCell.tsx`
- `frontend/src/components/notebook/CellWrapper.tsx`

### Modified

- `backend/main.go` — notebook routes and dependency wiring
- `frontend/src/App.tsx` — notebooks view mode integration
