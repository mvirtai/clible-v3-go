# PR Story: Workspace Management, Search Scopes & Cached Results

This PR implements the comprehensive user-facing workspace management (Path C) for the Clible workspace, introduces highly requested query scoping options to the text search engine (scoping by Old Testament, New Testament, or individual books), and deploys a robust performance caching layer by serializing computed results directly into the database.

---

## Business Context

As users perform deep scripture analysis (linguistic token frequencies, cross-translation comparisons, and complex regex queries), they need a way to group their research activities into logical project scopes (e.g., "Sermon on the Mount Study" or "Verbs of Grace in Romans").

Previously, the backend had APIs for creating and retrieving scopes, but the React frontend lacked any user interface to interact with these endpoints. Furthermore, running translation comparisons (LCS alignments) and token frequencies are CPU-intensive operations. Re-calculating them every time a user opens a saved result is highly inefficient.

### Solutions Deployed

1. **Workspace Sidebar UI**: Added a fully featured sidebar that allows users to create, select, and delete study projects (scopes). It dynamically loads saved searches and analyses linked to the selected scope.
2. **Result Cache Serialization (`result_json`)**: Introduced a database migration adding `result_json` to both `saved_searches` and `saved_analyses`. When a search or analysis is saved to a scope, its current results are snapshotted as JSON. Reloading a saved item from the sidebar now renders it instantly without hitting downstream databases or performing expensive LCS calculations again.
3. **Bible Search Scoping**: Extended the text search engine to support domain filters: searching the entire Bible, restricting queries to the Old Testament, the New Testament, or choosing a single target book.

---

## Architectural Changes

### Database — Migration 011

**New file:** `backend/migrations/011_add_result_json_to_saved.sql`

Adds `result_json TEXT` to both `saved_searches` and `saved_analyses` to cache computed UI datasets.

```sql
ALTER TABLE saved_searches ADD COLUMN result_json TEXT;
ALTER TABLE saved_analyses ADD COLUMN result_json TEXT;
```

---

### Backend (Go)

#### Models (`backend/internal/models/types.go`)

- Added `ResultJSON string` to both `SavedSearch` and `SavedAnalysis` models.

#### Repositories

- **`saved_repo.go`**: Updated `SaveSearch`, `GetSearchesByScope`, `SaveAnalysis`, and `GetAnalysesByScope` to write and read the `result_json` column.
- **`verse_repo.go`**: Expanded `SearchParams` to include `SearchScope` and `ScopeValue`. Updated `Search()` database queries to append the corresponding `WHERE` filters dynamically based on testament ("OT"/"NT") or specific book ("book_id"). Added `"strings"` package import.

#### Service Layer (`verse_service.go`)

- Updated `SearchVerses` signature and logic to accept `searchScope` and `scopeValue` parameters and propagate them to the repository parameters.

#### API Handlers (`bible_handler.go` & `scope_handler.go`)

- **`bible_handler.go`**: Updated `SearchVerses` query parser to read `scope` and `scopeValue` HTTP query parameters and pass them to the service.
- **`scope_handler.go`**: Expanded handler request models to map incoming `resultJson` payloads from the client and save them to the database.

---

### Frontend (React & TypeScript)

#### Types (`frontend/src/types/workspace.ts`)

- Created a new schema file outlining strict TypeScript interfaces for `Scope`, `SavedSearch`, `SavedAnalysis`, and `ScopeWorkspace` containing the new `resultJson` fields.

#### API Layer (`frontend/src/services/api.ts`)

- Added `getScopes`, `createScope`, `deleteScope`, `getScopeWorkspace`, `saveSearch`, and `saveAnalysis` client wrappers.
- Updated `search` signature to pass optional `scope` and `scopeValue` parameters.

#### Components

- **`WorkspaceSidebar.tsx`**: Renders the active workspace drop-down selector, project creation forms, and groups nested saved items (searches and analyses) underneath. Clicking a saved item triggers a fast-load callback utilizing the cached JSON dataset.
- **`VerseSearch.tsx`**: Added search filter selector (All, OT, NT, Book) and book drop-down selection powered by `/api/books`. Added a tactile "Tallenna haku" panel to serialize results to the selected workspace.
- **`AnalyticsView.tsx` & `CompareView.tsx`**: Added "Tallenna analyysi" panels to cache linguistic density statistics and similarity scores. Integrated cached state triggers to skip new API fetches when loading saved records.
- **`App.tsx`**: Wired state variables (`activeScopeId`, `workspaceTrigger`, and `loadedSavedResults` states) and mounted `WorkspaceSidebar` inside the right sidebar column above the search history widget.

---

## Testing

### Automated Tests

- **Repository Tests (`saved_repo_test.go`)**: Added new integration tests validating that `SaveSearch` and `SaveAnalysis` correctly write to the database and read back the cached JSON datasets.
- **Service Tests (`scope_service_test.go`)**: Deployed target tests for workspace-wide functions, ensuring auto-UUID generation, and correct building of the nested `ScopeWorkspace` dataset.
- **Search Scoping (`verse_repo_test.go`)**: Added new SQLite integration tests testing that FTS search filters work properly when restricted by testament scopes ("ot", "nt") or specific book scopes ("book").
- **Verse Service Legacy (`verse_service_test.go`)**: Updated method signatures to support the new `SearchVerses` parameters, verifying everything compiles cleanly. All test suites pass 100%.

### Manual Verification Checklist

- [ ] Active scope drop-down loads existing scopes on startup.
- [ ] Creating a new scope adds it to the list and changes the selection.
- [ ] Performing a text search with "OT" filter only returns Old Testament verses.
- [ ] Clicking "Save search" serializes the exact results to the database.
- [ ] Selecting a saved analysis from the sidebar instantly populates the graphs and stats without invoking new calculations.
- [ ] Deleting a scope cleans up all saved searches and analyses (cascading foreign keys).
