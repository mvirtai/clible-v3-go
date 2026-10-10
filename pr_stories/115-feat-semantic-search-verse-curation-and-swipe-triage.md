# PR Story: Semantic Search Verse Curation, Commit Triage, and Workspace Update

## Business Context

When executing broad semantic queries in Clible (e.g. *"God's covenants with humanity throughout scripture"*), the AI semantic search returns a substantial hit set. Previously, users could not curate, triage, or discard secondary matches before persisting results to their workspace. Furthermore, repeatedly refining a saved search in the workspace caused duplicate saved-search records to be created instead of updating the existing study asset.

This PR introduces an end-to-end curation, commit triage, and workspace update pipeline:
1. **Interactive Curation & Gestures:** Users can accept, reject, or restore verses. Mobile users can swipe right to accept and swipe left to reject. Desktop users have dedicated buttons.
2. **Commit Triage & Unreviewed Guard (`CurationUnreviewedBanner`):** When applying selections, users can permanently discard rejected verses while retaining accepted ones. If unclassified verses remain, an inline triage banner offers batch actions (*"Accept all remaining"* or *"Reject all remaining"*) with keyboard hints (`(A)`, `(R)`).
3. **Workspace Upsert (`ON CONFLICT`):** When returning to an existing saved search from a workspace, curation modifications update the existing database record in place instead of creating duplicates.
4. **Taskfile Automation Hygiene:** Upgrades `task plans:link` with automatic directory synchronization and introduces `task plans:push` and `task plans:status`.

Version is bumped from `3.14.0` to `3.15.0`.

---

## Architectural & Process Flows

### 1. Curation, Commit Guard & Workspace Update Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Card as CuratedVerseCard
    participant Header as VerseCurationHeader
    participant Modal as CurationUnreviewedBanner
    participant Search as AiSemanticSearch
    participant API as apiService (Go Backend)
    participant DB as SQLite / Neon PostgreSQL

    User->>Card: "Swipe right / Accept button"
    Card->>Search: "onAccept(verseId)"
    User->>Header: "Click 'Apply selection' / 'Toteuta valinnat'"
    Header->>Search: "onCommitSelection()"
    alt Has unclassified verses
        Search->>Modal: "Display unreviewed triage banner"
        User->>Modal: "Click 'Accept all remaining' or 'Reject all remaining'"
        Modal->>Search: "Force commit remaining"
    end
    Search->>Search: "Keep accepted verses, permanently drop rejected"
    User->>Search: "Submit 'Update saved search'"
    Search->>API: "POST /api/scopes/saved-searches (with existing ID)"
    API->>DB: "INSERT INTO saved_searches ... ON CONFLICT (id) DO UPDATE"
    DB-->>API: "Updated row"
    API-->>Search: "HTTP 201 Created (Updated item)"
```

### 2. Swipe Gesture State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Swiping: "touchstart (one finger)"
    Swiping --> Swiping: "touchmove (delta clamped to -140..140 px)"
    Swiping --> Accepted: "touchend, delta > 75 px"
    Swiping --> Rejected: "touchend, delta < -75 px"
    Swiping --> Idle: "touchend, abs(delta) <= 75 px"
    Swiping --> Idle: "touchcancel"
    Accepted --> Idle: "reset swipe offset"
    Rejected --> Idle: "reset swipe offset"
```

---

## Architectural & UX Changes

### 1. `CuratedVerseCard` (Mobile Swipe & Desktop Triage)
- **Zero External Dependencies:** Touch events are handled through native JSX handlers (`onTouchStart`, `onTouchMove`, `onTouchEnd`, `onTouchCancel`). No `useEffect`, no global listeners, no heavy external animation libraries.
- **Physical Spring Feedback:** Offsets are clamped to ±140 px with spring-back physics when released under threshold (`SWIPE_THRESHOLD_PX = 75`).
- **Accessible Selection:** Clean button semantics with `stopPropagation` to avoid triggering reader navigation.

### 2. `VerseCurationHeader` & `CurationPromptModal` (Commit Guard)
- **Triage Tabs & Counters:** All, Accepted, and Rejected filters with real-time badges derived during render.
- **Unreviewed Triage Guard:** If the user attempts to finalize selections while unreviewed verses exist, `CurationUnreviewedBanner` prompts whether to accept or reject all remaining verses in batch.
- **Permanent Curation Commit:** Committing selection sets `committedVerses`, filtering rejected items out of memory and DOM.

### 3. Workspace Search Update (Backend & Frontend)
- **Backend API & Repo:**
  - `backend/internal/api/scope_handler.go`: Added optional `ID` field to `SaveSearchRequest`.
  - `backend/internal/db/saved_repo.go`: Updated `SaveSearch` to use SQL `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, query = EXCLUDED.query, result_json = EXCLUDED.result_json`. Compatible with both Neon PostgreSQL and in-memory SQLite `:memory:` test harnesses.
- **Frontend App & SearchHub:**
  - `frontend/src/App.tsx`: Passes `savedSearchId` and `savedName` through `SemanticSearchSnapshot` when restoring a workspace search.
  - `frontend/src/components/search/AiSemanticSearch.tsx`: Detects existing `savedSearchId`, renders dynamic "Update saved search" form title and prefilled name, and sends the ID on submit.
  - `frontend/src/components/search/SearchHub.tsx`: Key-bound tab rendering ensures clean component mounting and state resets.

### 4. Taskfile Automation Hygiene
- `task plans:link`: Detects if `.plans` is a local directory; automatically synchronizes with `$HOME/code/clible-plans` via `rsync` before linking, preventing collisions and script failures.
- `task plans:status`: Checks symlink and git status of the canonical plans repository.
- `task plans:push`: Automates staging, committing, and pushing in `~/code/clible-plans`.

---

## Improvement Metrics & Key Figures

- **Backend Test Coverage:** 77.5 % statement coverage (`.cov/backend/coverage.txt`), 0 data races (`-race`).
- **Frontend Test Suite:** 54 test files, 419 passing tests (`task frontend:check`).
- **Search Component Test Suite:** 5 test files, 29/29 passing tests in 3.06s:
  - `CuratedVerseCard.test.tsx` (10 tests)
  - `VerseCurationHeader.test.tsx` (7 tests)
  - `CurationPromptModal.test.tsx` (2 tests)
  - `AiSemanticSearch.test.tsx` (8 tests)
  - `SearchHub.test.tsx` (2 tests)
- **State Complexity:** Zero `useEffect` state sync loops; all counts and filtered views are purely derived render states.

---

## Security & Compliance

- **SQL Injection Prevention:** Updated `SaveSearch` query in `backend/internal/db/saved_repo.go` uses strict `$1..$9` parameterization.
- **Access Control:** All workspace search endpoints require authentication via `middleware.RequireAuth` and validate ownership by user ID.
- **Input Sanitization:** JSON decode payloads are length-bounded and schema-checked.
- **Zero Leaks:** No private plans or tokens are tracked in git; `.plans` symlink is explicitly ignored in `.gitignore`.

---

## Files Changed

| File | Change Summary |
|------|----------------|
| `backend/internal/api/scope_handler.go` | Added optional `ID` field to `SaveSearchRequest` and forwarded to model |
| `backend/internal/api/scope_handler_test.go` | Added integration tests for creating and updating saved searches via HTTP |
| `backend/internal/db/saved_repo.go` | Implemented `ON CONFLICT (id) DO UPDATE` upsert for `SaveSearch` |
| `backend/internal/db/saved_repo_test.go` | Added unit test verifying upsert prevents duplicate search records |
| `backend/internal/version/version.go` | Bumped version to `3.15.0` |
| `frontend/src/App.tsx` | Propagates `savedSearchId` and `savedName` on saved search restoration |
| `frontend/src/components/search/AiSemanticSearch.tsx` | Integrated curation, commit triage guard, and workspace search update |
| `frontend/src/components/search/AiSemanticSearch.test.tsx` | Added tests for unreviewed guard, accept/reject remaining, and update flow |
| `frontend/src/components/search/CuratedVerseCard.tsx` | Verse card with swipe gestures, desktop triage buttons, and restore |
| `frontend/src/components/search/CuratedVerseCard.test.tsx` | Gesture and action tests for curated verse card |
| `frontend/src/components/search/CurationPromptModal.tsx` | New unreviewed triage guard banner component |
| `frontend/src/components/search/CurationPromptModal.test.tsx` | Unit tests for unreviewed triage banner |
| `frontend/src/components/search/SearchHub.tsx` | Key-bound rendering for reliable mount state |
| `frontend/src/components/search/VerseCurationHeader.tsx` | Added commit selection action, counters, and triage filter tabs |
| `frontend/src/components/search/VerseCurationHeader.test.tsx` | Tests for curation header actions and counts |
| `frontend/src/services/api.ts` | Updated `saveSearch` parameter signature to accept optional `id` |
| `frontend/src/types/aiSearch.ts` | Extracted `AiVerseMatch` and added `savedSearchId`/`savedName` to snapshot |
| `frontend/src/utils/i18n.ts` | Added localized strings for curation, commit triage guard, and search update |
| `frontend/src/utils/version.ts` | Bumped version to `3.15.0` |
| `frontend/package.json` | Bumped version to `3.15.0` |
| `VERSION` | Bumped version to `3.15.0` |
| `.gitignore` | Explicitly ignored `.plans` symlink |
| `Taskfile.yml` | Upgraded `plans:link` with auto-sync and added `plans:push` and `plans:status` |
| `kanban/todos.md` | Marked curation task as done and added AI refinement to in-progress |

---

## Testing Strategy

### Automated Verification
- Full project verification:
  ```bash
  task check
  ```
- Backend Go tests & race detector:
  ```bash
  task backend:check
  ```
- Frontend typecheck, linter, and Vitest suite:
  ```bash
  task frontend:check
  ```

### Manual Verification Checklist
- [x] Search query yields verses with curation action buttons.
- [x] Swiping right marks verse as accepted (green badge, border).
- [x] Swiping left marks verse as rejected (rose badge, border).
- [x] Clicking "Apply selection" with unreviewed verses displays `CurationUnreviewedBanner`.
- [x] Batch selecting remaining verses permanently commits the curated set.
- [x] Restoring a saved search and saving changes updates the existing record without duplicating.
