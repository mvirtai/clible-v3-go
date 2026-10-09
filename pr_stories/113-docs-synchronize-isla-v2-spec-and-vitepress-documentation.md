# Pull Request Story: 113 – Synchronize ISLA v2 Specification, Web API Reference, and VitePress Documentation

## Overview & Business Context

As Clible v3 evolved through rapid iterations—introducing cross-cell variable resolution (`#name`), inline output directives (`=> #name`), multi-book spans (`(MAT .. JOH)`), the Liturgical Calendar API (`/api/liturgical/today`), and smart editor typing gestures—the public VitePress documentation and architectural specifications lagged behind the production implementation.

This Pull Request brings 100% synchronization across the official ISLA v2 specification, formal EBNF grammar, Web API Reference, VitePress guides, and backend DSL integration tests.

---

## Architectural & System Changes

### 1. ISLA v2 Grammar & Specification Sync (`docs/architecture/isla-specification.md`)

- Updated formal EBNF grammar to define `VariableRef` (`#` Ident), inline output variables (`=> [CellName]`), and multi-book span range expressions (`(MAT .. JOH)` / `@(GEN .. DEU)`).
- Extended AST Object Types table with `VariableNode` (`ObjectVariable`).
- Added `#var` column to the `Method Validation Matrix` documenting valid analytical methods on variable nodes (`.use()`, `.vs()`, `.refs()`, `.count()`, `.top()`, `.ngrams()`, `.stats()`, `.themes()`, `.suggest()`).

### 2. VitePress Documentation Upgrades (`docs/guide/`)

- **`isla-guide.md`**: Upgraded Section 3 to *The Five Source Objects*, expanded Section 8 to *ISLAEditor & Language Intelligence* documenting the overlay architecture, autocompletion triggers, and all 6 smart typing gestures, and updated the Syntax Cheat Sheet with variable pipelines.
- **`notebooks.md`**: Documented production ISLAEditor gestures and syntax overlay mechanics.
- **`reader.md`**: Added Church Year liturgical banners, daily psalms, lectionary cycles, and mobile-first gestures.
- **`overview.md`**: Synchronized ISLA request sequence diagram to `POST /api/dsl/eval`.

### 3. API Reference & Backend Test Suite (`docs/api/reference.md`, `backend/internal/api/dsl_handler_test.go`)

- Documented `POST /api/dsl/eval` (with `variables` payload mapping and `10MB` limit), `POST /api/notebooks/{id}/cells/{cell_id}/execute`, and `GET /api/liturgical/*` public endpoints.
- Added comprehensive end-to-end integration test verifying variable assignment, metadata output, and downstream cross-cell execution in `dsl_handler_test.go`.

---

## Files Changed

| File | Change Summary |
|---|---|
| [`backend/internal/api/dsl_handler_test.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/dsl_handler_test.go) | Added integration test for variable assignment, output metadata, and cross-cell resolution |
| [`docs/api/reference.md`](file:///home/vivaldev/code/clible-v3-go/docs/api/reference.md) | Added DSL evaluation, cell execution, and liturgical calendar API documentation |
| [`docs/architecture/isla-specification.md`](file:///home/vivaldev/code/clible-v3-go/docs/architecture/isla-specification.md) | Synchronized EBNF, AST Object Types, and Method Validation Matrix |
| [`docs/architecture/overview.md`](file:///home/vivaldev/code/clible-v3-go/docs/architecture/overview.md) | Updated ISLA query sequence diagram to `POST /api/dsl/eval` |
| [`docs/guide/isla-guide.md`](file:///home/vivaldev/code/clible-v3-go/docs/guide/isla-guide.md) | Updated source objects, ISLAEditor gestures, and variable cheat sheet |
| [`docs/guide/liturgical-calendar.md`](file:///home/vivaldev/code/clible-v3-go/docs/guide/liturgical-calendar.md) | Updated liturgical endpoints, query fallbacks, and Liturgical Calendar view navigation |
| [`docs/guide/notebooks.md`](file:///home/vivaldev/code/clible-v3-go/docs/guide/notebooks.md) | Updated ISLAEditor section with overlay pattern and autocompletion |
| [`docs/guide/reader.md`](file:///home/vivaldev/code/clible-v3-go/docs/guide/reader.md) | Documented navigation, cross-view jumps, and mobile workspace drawer FAB |

---

## Testing Strategy & Metrics

### Automated Backend Tests

```bash
task backend:check
```

- 100% unit and integration tests passed cleanly.
- Dual PostgreSQL and SQLite test coverage: 77.4% statement coverage across services and API handlers.

### Automated Frontend Tests & Documentation Build

```bash
pnpm --dir docs run docs:build
task frontend:check
```

- VitePress documentation built with 0 errors in 5.14s.
- Vitest: 52/52 test files, 400/400 tests passing.
- Global quality check `task check` passed flawlessly.
