# PR Story: Implement Notebooks Database Schema and Backend API

## Business Context

As part of the Clible-v3-go roadmap to support interactive study paths, this PR implements the backend and database foundation for the Notebooks feature (Phase 1, Part 1). 

This PR establishes the database schemas, Go models, repository layer, service business logic, and authenticated REST API endpoints. This foundation enables the upcoming Phase 1 Part 2 PR to implement the React-based Jupyter-like cell editor, allowing users to create notebooks, manage them inside specific workspaces (scopes), and write rich content using individual markdown and code cells.

## Architectural Changes

### Database Layer

* **Migration Script** ([012_notebooks.sql](file:///home/vivaldev/code/clible-v3-go/backend/migrations/012_notebooks.sql)):
  * Establishes the `notebooks` table, mapping to individual users and optional workspaces (`scopes`).
  * Establishes the `notebook_cells` table representing structured markdown or code snippets, with explicit position indices.
  * Added indexes (`idx_notebooks_user`, `idx_notebook_cells_notebook`, `idx_notebook_cells_position`) to optimize database query performance.
  * *SQLite Compatibility*: Fixed the initial `timestamp with time zone` type definition, standardizing with the rest of the project tables to use `TIMESTAMP` so that standard SQL drivers can successfully scan values into Go `time.Time` structs during local in-memory tests.

### Models Layer

* **Notebook & Cell Structs** ([notebook.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/models/notebook.go)):
  * Defines the core entities `Notebook` and `Cell` along with `CellType` (`markdown` or `code`).
  * Maps fields directly to camelCase JSON payloads for strict frontend-backend alignment.

### Repository Layer

* **Notebook Repository** ([notebook_repo.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/notebook_repo.go)):
  * Integrates database queries with `context.Context` to propagate cancellations downstream.
  * Implements `SaveCells` inside a transaction (`BeginTx`) which drops previous cells for the notebook and sequentially inserts the new set, guaranteeing robust order state preservation.

### Service Layer

* **Notebook Service** ([notebook_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/notebook_service.go)):
  * Implements the core business logic.
  * Enforces logical user isolation: verifies ownership (`userID` matches the notebook record) prior to any updates, retrieval, deletions, or cell modifications.

### API Layer

* **Notebook Handler** ([notebook_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/notebook_handler.go)):
  * Enforces stateless, RESTful route structures using standard Go `http.ServeMux` (Go 1.22+ routing features).
  * Exposes:
    * `GET /api/notebooks` — list notebooks of the logged-in user
    * `GET /api/notebooks/{id}` — retrieve notebook by ID with its cells
    * `POST /api/notebooks` — create new notebook
    * `PUT /api/notebooks/{id}` — update title/scope of a notebook
    * `DELETE /api/notebooks/{id}` — delete notebook
    * `PUT /api/notebooks/{id}/cells` — batch-save cells for a notebook
  * Uses the `requireAuth` middleware to ensure all endpoints require authenticated users.

## Security & Audits

* **Access Control**: Mitigates IDOR (Insecure Direct Object Reference) vulnerabilities. Every query to get, update, delete, or modify a notebook's cells validates that the calling client's user ID matches the notebook's owner.
* **Pre-Merge Security Review**: Completed the pre-merge audit report ([security-audit-2026-07-11-notebooks.md](file:///home/vivaldev/code/clible-v3-go/.security_audits/security-audit-2026-07-11-notebooks.md)), certifying that the API satisfies authorization best practices.

## Testing Strategy

### Automated Tests

* Standard in-memory SQLite unit tests covering `NotebookRepository` ([notebook_repo_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/notebook_repo_test.go)) execute successfully.
* Complete linter (`golangci-lint` & `eslint`), code tidying, and backend/frontend unit tests pass flawlessly.

```bash
task check
# Output: All local quality checks passed flawlessly!
```

### Manual Verification

* Verified backend build compiles without issues.
* Verified that HTTP handlers properly reject unauthenticated requests with a `401 Unauthorized` status.
