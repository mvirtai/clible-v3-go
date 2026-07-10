# PR Story: Scope and Saved Item Management

## Business Context

Users organize their biblical studies into "Study Scopes" (workspaces), where they can save their text searches and AI-driven translation analyses. Previously, users could create and delete entire scopes, but could not:

1. Rename existing study scopes to better organize their work.
2. Delete individual saved searches or analyses from a scope.
3. Rename individual saved searches or analyses.

This PR implements these three management capabilities, providing users with a flexible and robust way to manage their workspaces without losing their entire history.

## Architectural Changes

### Database Layer

- **ScopeRepository** (`scope_repo.go`): Added the `Rename(ctx, id, name, userID)` method, which executes an `UPDATE` query on the `scopes` table, verifying user ownership via `user_id`.
- **SavedRepository** (`saved_repo.go`): Added the following CRUD operations:
  - `DeleteSearch(ctx, id, userID)`: Deletes a saved search if its parent scope belongs to the user.
  - `RenameSearch(ctx, id, name, userID)`: Renames a saved search after verifying ownership.
  - `DeleteAnalysis(ctx, id, userID)`: Deletes a saved analysis if its parent scope belongs to the user.
  - `RenameAnalysis(ctx, id, name, userID)`: Renames a saved analysis after verifying ownership.

### Service Layer

- **ScopeService** (`scope_service.go`): Exposed the corresponding orchestrator methods: `RenameScope`, `DeleteSearch`, `RenameSearch`, `DeleteAnalysis`, and `RenameAnalysis`, adding input validation checks.

### API Layer

- **ScopeHandler** (`scope_handler.go`): Added new handlers:
  - `RenameScope(w, r)`: Handles `PUT /api/scopes` with a JSON payload containing `{ id, name }`.
  - `DeleteSearch(w, r)`: Handles `DELETE /api/scopes/saved-searches?id=...`.
  - `RenameSearch(w, r)`: Handles `PUT /api/scopes/saved-searches` with `{ id, name }`.
  - `DeleteAnalysis(w, r)`: Handles `DELETE /api/scopes/saved-analyses?id=...`.
  - `RenameAnalysis(w, r)`: Handles `PUT /api/scopes/saved-analyses` with `{ id, name }`.
- **Router** (`main.go`): Registered the new `PUT` and `DELETE` routes, wrapping them in `requireAuth` middleware.

### Frontend Layer

- **APIService** (`services/api.ts`): Exposed the new HTTP request helper methods for renaming and deleting scopes, saved searches, and saved analyses.
- **WorkspaceSidebar** (`components/WorkspaceSidebar.tsx`):
  - Added an `Edit2` rename button next to the scope selector.
  - Rendered edit and delete icon buttons on hover over each saved search and analysis item.
  - Handled instant, optimistic state updates in the UI when renaming or deleting items, avoiding redundant network reload delays.
- **VerseReader** (`components/VerseReader.tsx`):
  - Fixed the reference string display bug (`[object Object]`) when saving AI insights by reading `.mainLabel` from the parsed reference model.

## Testing Strategy

### Automated Tests

- Added comprehensive unit tests in `scope_handler_test.go` verifying that all new endpoint handlers reject invalid JSON payloads or missing query parameters with `400 Bad Request`.
- Verified Go testing suite passes using `task backend:test`.

### Manual Verification

- Verified ESLint, TypeScript compiler, and Vitest suite pass cleanly using `task check`.
- Verified optimistic UI updates instantly reflect name changes and removals in the sidebar.
