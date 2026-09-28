# Pull Request Story: 101 – Optimize Notebooks API Latency and Eliminate N+1 Queries

## Overview & Business Context

In real-world usage and performance diagnostics of Clible, `GET /api/notebooks` exhibited an exceptionally high server latency (TTFB ~3.7 seconds), despite fast local and network data transfer.

Profiling identified two root causes:
1. **N+1 Database Query Cascade**: `NotebookRepository.GetByUserID` previously issued an initial query for user notebooks, followed by a sequential iteration executing `r.GetCells(ctx, nb.ID)` for each notebook over Neon PostgreSQL. For $N$ notebooks, latency accumulated to $N$ roundtrips.
2. **Data Over-fetching**: The 2D matrix overview (`NotebookCanvasView` and `SortableNotebookCard`) requires metadata and counts (`CellCounts`: Markdown & Code count, computed via single-pass SQL `COUNT()`), not full cell markdown texts or heavy ISLA execution results (`ResultJSON`).

This optimization completely eliminates the $N+1$ query loop by returning a lightweight slice (`nb.Cells = []models.Cell{}`) during list queries. Full cell contents and execution results continue to be loaded strictly on-demand when opening an individual notebook in `NotebookEditor` via `GET /api/notebooks/:id`.

---

## Architectural & System Changes

### 1. Database & Repository Layer (`backend/internal/db/notebook_repo.go`)

- Removed sequential `r.GetCells(ctx, nb.ID)` calls inside the `GetByUserID` row scan loop.
- Initialized `nb.Cells = []models.Cell{}` in list responses, preserving O(1) single-query efficiency while maintaining JSON contract compatibility.
- Updated `backend/internal/db/notebook_repo_test.go` to assert that `GetByUserID` produces a lightweight summary with `len(Cells) == 0` and accurate `CellCounts`.

### 2. Frontend & API Verification

- Verified that `NotebookEditor` independently fetches full cells via `GET /api/notebooks/:id`.
- Confirmed `SortableNotebookCard` and `NotebookContentBadges` gracefully handle both full cell arrays and `fallbackCellCounts`.
- Bumped semantic patch version: 3.11.0 → 3.11.1 (`task version:bump PART=patch`).

---

## Testing Strategy & Metrics

### Automated Backend Tests

Statement coverage remains high across `internal/db` and `internal/services`:

```text
=== RUN   TestNotebookRepository
--- PASS: TestNotebookRepository (0.16s)
ok  	github.com/mvirtai/clible-v3-go/internal/db	1.283s
ok  	github.com/mvirtai/clible-v3-go/internal/services	2.400s
ok  	github.com/mvirtai/clible-v3-go/internal/api	2.557s
total: (statements) 76.9%
```

### Automated Frontend Tests

Vitest suite passed with 372 tests in 48 test files:

```text
 Test Files  48 passed (48)
      Tests  372 passed (372)
   Start at  19:31:55
   Duration  18.57s
```

All local quality checks passed flawlessly (`task check`).
