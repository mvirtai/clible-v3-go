# PR Review: Integration with Scope/Workspace Model

## Summary

This PR implements a robust notebook backend that integrates well with the existing architecture. ✅ All core security checks pass and authorization is sound. However, there are **5 data consistency gaps** between the Notebooks model and the existing Scope/Workspace pattern that should be addressed before or immediately after merge.

---

## 🟢 What's Working Well

- ✅ **Security**: No SQL injection risks; all queries parameterized
- ✅ **Authorization**: Direct user ownership checks prevent IDOR on notebook CRUD
- ✅ **Transactions**: Cell saves use `BeginTx` for atomic position ordering
- ✅ **CI/CD**: All checks passing (lint, tests, Docker, deployment)
- ✅ **Cascade delete**: Notebooks orphan (SET NULL) rather than delete when scope is removed—intentional data preservation

---

## 🔴 Critical Issues (Must Fix Before Merge)

### 1. Missing Scope Ownership Validation on Notebook Creation

**Problem:**
A user can create a notebook with an arbitrary `scopeId` belonging to another user:

```bash
POST /api/notebooks
{
  "title": "My Notebook",
  "scopeId": "<other_user's_scope_id>"
}
```

The handler doesn't validate that the provided `scopeId` belongs to the requesting user.

**Impact:** 🔴 **HIGH** — IDOR-like vulnerability; cross-user workspace pollution

**Location:** `backend/internal/services/notebook_service.go` → `CreateNotebook`

**Fix:**

```go
// Inject ScopeRepository into NotebookService
type NotebookService struct {
    repo      *db.NotebookRepository
    scopeRepo *db.ScopeRepository  // ADD THIS
}

func NewNotebookService(nb_repo *db.NotebookRepository, scope_repo *db.ScopeRepository) *NotebookService {
    return &NotebookService{repo: nb_repo, scopeRepo: scope_repo}
}

// Validate scope ownership in CreateNotebook
func (s *NotebookService) CreateNotebook(ctx context.Context, title string, userID string, scopeID string) (*models.Notebook, error) {
    if userID == "" {
        return nil, errors.New("userID is required")
    }
    if title == "" {
        title = "Nimetön muistikirja"
    }

    // NEW: Validate scope ownership if scopeID provided
    if scopeID != "" {
        scope, err := s.scopeRepo.GetByID(ctx, scopeID, userID)
        if err != nil {
            return nil, fmt.Errorf("invalid scope: %w", err)
        }
        if scope == nil {
            return nil, errors.New("scope not found or access denied")
        }
    }

    nb := &models.Notebook{
        ID:        uuid.New().String(),
        Title:     title,
        UserID:    userID,
        ScopeID:   scopeID,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
        Cells:     []models.Cell{},
    }

    if err := s.repo.Create(ctx, nb); err != nil {
        return nil, err
    }

    return nb, nil
}
```

Also update `main.go` to inject the scope repo:

```go
notebookService := services.NewNotebookService(notebookRepo, scopeRepo)  // Add scopeRepo
```

**Test Case:**

```go
t.Run("rejects creating notebook with unauthorized scope", func(t *testing.T) {
    // Create notebook with user1, attempt to link to user2's scope
    // Should return "scope not found or access denied"
})
```

---

### 2. Authorization Model Misalignment with SavedSearch/SavedAnalysis

**Problem:**
The notebook authorization model differs from the existing SavedSearch/SavedAnalysis pattern:

| Model | Validation Strategy | On Scope Delete |
|-------|-------------------|------------------|
| **SavedSearch/SavedAnalysis** | Check `scope_id IN (SELECT id FROM scopes WHERE user_id = ?)` | CASCADE DELETE |
| **Notebooks (PR)** | Check `user_id` directly | SET NULL (orphan) |

**Impact:** 🟡 **MEDIUM** — If scope-sharing is added in future phases, notebooks won't move with their scope; scopes could be owned by teams/groups while notebooks are stuck with individual users.

**Why this matters:**
- Future roadmap (phase 3/4) may add collaborative workspaces
- Notebooks won't participate in scope-sharing or scope transfers
- Creates two authorization patterns in the same codebase

**Recommendation for Phase 1:**

Document this as **intentional** in the PR:

```markdown
## Design Note: Notebook Ownership Model

Notebooks use **direct user ownership** (`notebook.user_id`) rather than 
scope-chain ownership (`scope.user_id`). This allows:

1. Notebooks to survive scope deletion (data preservation)
2. Notebooks to exist without a scope (individual study notes)

**Future Consideration:** If collaborative workspaces (phase 3+) are added,
this model should be revisited to align with SavedSearch/SavedAnalysis
authorization via scope ownership chain.
```

Alternatively, if scope-sharing is planned soon, consider using the SavedSearch pattern now.

---

## 🟡 High-Priority Issues (Merge with Open PRs)

### 3. Notebooks Missing from ScopeWorkspace Aggregation

**Problem:**
When a user loads a workspace via `GET /api/scopes/workspace?id=<scopeId>`, the response includes searches and analyses but **not notebooks**:

```go
type ScopeWorkspace struct {
    Scope    Scope           `json:"scope"`
    Searches []SavedSearch   `json:"searches"`
    Analyses []SavedAnalysis `json:"analyses"`
    // MISSING: Notebooks  []Notebook `json:"notebooks"`
}
```

**Impact:** 🟡 **MEDIUM** — UX inconsistency; frontend must make separate API call to fetch notebooks scoped to a workspace, breaking the single-endpoint aggregation pattern.

**Locations:**
- `backend/internal/models/workspace.go` (model)
- `backend/internal/services/scope_service.go` (GetScopeWorkspace)
- `backend/internal/db/notebook_repo.go` (missing GetByScopeID)

**Fix:**

```go
// models/workspace.go
type ScopeWorkspace struct {
    Scope      Scope               `json:"scope"`
    Searches   []SavedSearch       `json:"searches"`
    Analyses   []SavedAnalysis     `json:"analyses"`
    Notebooks  []Notebook          `json:"notebooks"`   // ADD THIS
}

// db/notebook_repo.go - Add new method
func (r *NotebookRepository) GetByScopeID(ctx context.Context, scopeID string) ([]models.Notebook, error) {
    if scopeID == "" {
        return []models.Notebook{}, nil
    }
    query := `
        SELECT id, title, user_id, COALESCE(scope_id, ''), create_at, update_at
        FROM notebooks
        WHERE scope_id = $1
        ORDER BY create_at DESC
    `
    rows, err := r.db.QueryContext(ctx, query, scopeID)
    if err != nil {
        return nil, fmt.Errorf("failed to query notebooks by scope: %w", err)
    }
    defer func() { _ = rows.Close() }()

    var notebooks []models.Notebook
    for rows.Next() {
        var nb models.Notebook
        err := rows.Scan(&nb.ID, &nb.Title, &nb.UserID, &nb.ScopeID, &nb.CreatedAt, &nb.UpdatedAt)
        if err != nil {
            return nil, fmt.Errorf("failed to scan notebook: %w", err)
        }
        notebooks = append(notebooks, nb)
    }
    if err = rows.Err(); err != nil {
        return nil, fmt.Errorf("error in notebook rows: %w", err)
    }
    return notebooks, nil
}

// services/scope_service.go - Inject NotebookRepository
type ScopeService struct {
    scopeRepo    *db.ScopeRepository
    savedRepo    *db.SavedRepository
    notebookRepo *db.NotebookRepository  // ADD THIS
}

func NewScopeService(
    scopeRepo *db.ScopeRepository,
    savedRepo *db.SavedRepository,
    notebookRepo *db.NotebookRepository,  // ADD THIS
) *ScopeService {
    return &ScopeService{
        scopeRepo:    scopeRepo,
        savedRepo:    savedRepo,
        notebookRepo: notebookRepo,
    }
}

// Update GetScopeWorkspace
func (s *ScopeService) GetScopeWorkspace(ctx context.Context, scopeID string, userID string) (*models.ScopeWorkspace, error) {
    if scopeID == "" {
        return nil, fmt.Errorf("target workspace scope id cannot be blank")
    }

    scope, err := s.scopeRepo.GetByID(ctx, scopeID, userID)
    if err != nil {
        return nil, fmt.Errorf("failed to get scope: %w", err)
    }
    if scope == nil {
        return nil, fmt.Errorf("scope not found or access denied")
    }

    searches, err := s.savedRepo.GetSearchesByScope(ctx, scopeID)
    if err != nil {
        return nil, fmt.Errorf("failed to gather workspace searches: %w", err)
    }

    analyses, err := s.savedRepo.GetAnalysesByScope(ctx, scopeID)
    if err != nil {
        return nil, fmt.Errorf("failed to gather workspace analyses: %w", err)
    }

    // NEW: Fetch notebooks scoped to this workspace
    notebooks, err := s.notebookRepo.GetByScopeID(ctx, scopeID)
    if err != nil {
        return nil, fmt.Errorf("failed to gather workspace notebooks: %w", err)
    }

    return &models.ScopeWorkspace{
        Scope:      *scope,
        Searches:   searches,
        Analyses:   analyses,
        Notebooks:  notebooks,
    }, nil
}
```

Update `main.go`:

```go
scopeService := services.NewScopeService(scopeRepo, savedRepo, notebookRepo)  // Add notebookRepo
```

**Timeline:** Should be completed in Phase 1+2 before notebooks reach production.

---

### 4. Cascade Delete Behavior Lacks Documentation

**Current Behavior:**
```sql
CREATE TABLE notebooks (
    ...
    scope_id TEXT REFERENCES scopes(id) ON DELETE SET NULL
);
```

When a scope is deleted, notebooks are **orphaned** (scope_id becomes NULL), not deleted.

**Impact:** 🟡 **MEDIUM** — Intentional for data preservation, but not documented; users see "detached" notebooks with no clear explanation.

**What to do:**

1. Add a schema comment:
   ```sql
   -- Notebooks survive scope deletion to preserve user work.
   -- Deleted scopes leave notebooks orphaned (scope_id = NULL).
   ```

2. Document this in the PR:
   ```markdown
   ### Notebook Lifecycle
   
   - **On scope deletion**: Notebooks orphan (scope_id → NULL). Data is preserved.
   - **On user deletion**: Notebooks cascade-delete via user_id FK.
   - **On notebook deletion**: Cells cascade-delete via notebook_id FK.
   ```

3. Consider labeling orphaned notebooks in the UI (future phase):
   ```
   "Unscoped Notebook" or "Archived Study Notes"
   ```

---

## ℹ️ Minor Notes & Observations

### Parameterized Queries ✅
All database operations use proper parameterization ($1, $2, etc.). No injection risk.

### Transaction Handling ✅
`SaveCells` correctly uses `BeginTx` with proper rollback on error.

### Error Wrapping ✅
Errors use `%w` formatting for proper stack traces; good error propagation throughout the stack.

### JSON Serialization ✅
Clean camelCase mapping in struct tags (e.g., `json:"userId"`, `json:"scopeId"`); matches frontend expectations.

### Timezone Handling ✅
Uses `time.Now()` (system timezone) consistently. For the current scope (local testing), this is fine; document if future internationalization is planned.

---

## Checklist for Merge

- [ ] **CRITICAL**: Add scope ownership validation to `CreateNotebook` + inject ScopeRepository
- [ ] **CRITICAL**: Add test case rejecting unauthorized scope IDs
- [ ] **HIGH**: Add Notebooks to `ScopeWorkspace` model and `GetScopeWorkspace` service
- [ ] **HIGH**: Add `GetByScopeID` method to NotebookRepository
- [ ] **MEDIUM**: Document cascade/orphan behavior in migration and PR
- [ ] **MEDIUM**: Add design note about notebook ownership model vs SavedSearch pattern

---

## Recommendation

**Status:** 🟡 **Conditional Merge**

- ✅ **Can merge after fixing Critical issue #1** (scope ownership validation)
- 🟡 **Should complete High-priority issues #3 in Phase 1+2** (ScopeWorkspace integration)
- 🟡 **Document Medium-priority issues** (cascade behavior, ownership model)

The foundation is solid; the critical fix is small and well-scoped. The data consistency gaps are manageable and won't break the system, but they'll cause friction if not addressed early.
