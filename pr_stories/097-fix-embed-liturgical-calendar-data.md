# Pull Request Story: 097 – Statically Embed Liturgical Calendar Data in Binary

## Overview & Business Context

In the production deployment (`clible.fi`), visiting the church year tab (`/?view=liturgical`) triggered a `404 Not Found` error when requesting `/api/liturgical/day?date=2026-09-28` ("Tälle päivälle ei löytynyt kirkkovuositietoja").

Investigation revealed that while `backend/internal/parsers/data/kirkkovuosi_2026.json` existed in the repository, it was not statically embedded into the compiled Go binary. In the multi-stage Docker build, Stage 3 (the Alpine runtime container) copied only the compiled binary and the frontend `dist` directory, omitting the raw JSON files from the runtime container filesystem. At startup, `os.Stat` failed to locate the file, causing `LiturgicalService` to evaluate to `nil` and the liturgical HTTP endpoints (`/api/liturgical/today`, `/api/liturgical/day`, `/api/liturgical/month`) to remain unregistered on the HTTP router.

This pull request resolves the issue by statically embedding `kirkkovuosi_2026.json` directly into the Go binary via Go's native `//go:embed` directive in `internal/parsers`. This makes the binary 100% self-contained across all deployment targets (Docker, Cloud Run, CI, and local development) without any working directory or filesystem path dependencies.

---

## Architectural & System Changes

### 1. Static Embedding via `//go:embed` (`backend/internal/parsers/liturgical_data.go`)

- Declared `Kirkkovuosi2026JSON []byte` using `//go:embed data/kirkkovuosi_2026.json`.
- Placed right alongside existing embedded resources such as `data/book_names.json`.
- Completely decouples the liturgical calendar service from runtime working directories.

### 2. Default Service Constructor & Configuration Fallback (`backend/internal/services/liturgical_service.go`)

- Added `NewDefaultLiturgicalService() (*LiturgicalService, error)` which loads `parsers.Kirkkovuosi2026JSON` directly in-memory.
- Updated `NewLiturgicalService(dataPath string)` to fall back to `NewDefaultLiturgicalService()` when `dataPath` is empty.

### 3. Server Startup Resiliency (`backend/main.go`)

- Updated server initialization to use `services.NewDefaultLiturgicalService()` by default.
- Added optional override support via `LITURGICAL_DATA_PATH` environment variable with graceful fallback to embedded data on read failure.
- Ensures `liturgicalHandler` is never `nil` and routes are always registered.

### 4. Dockerfile Redundancy (`Dockerfile`)

- Added `COPY --from=backend-builder --chown=${APP_USER}:${APP_USER} /app/backend/internal/parsers/data /app/internal/parsers/data` to ensure the raw data directory is also present in the runtime image as an auxiliary fallback.

---

## Testing Strategy & Metrics

### Automated Backend Tests

- Executed `task backend:check` (including Go module tidy, `golangci-lint`, and unit test suite with `-race` and coverage reporting).
- Added `TestLiturgicalService_DefaultEmbedded` in `backend/internal/services/liturgical_service_test.go`, verifying:
  - Default embedded dataset loads 365 liturgical days without requiring any disk paths.
  - The production date (`2026-09-28`) resolves correctly to `Maanantai 28.9.2026` ("18. sunnuntai helluntaista").
  - Dual lookup formats (ISO `2026-09-28` and Finnish `28.9.2026`) resolve properly.

```text
task: [backend:lint] golangci-lint run ./...
task: [backend:lint] mkdir -p ../.cov/backend && touch ../.cov/backend/.lint_ok
=== RUN   TestLiturgicalService_DefaultEmbedded
--- PASS: TestLiturgicalService_DefaultEmbedded (0.05s)
PASS
coverage: 76.6% of statements
ok  	github.com/mvirtai/clible-v3-go/internal/services	1.482s
```

### Files Changed

| File | Changes |
| :--- | :--- |
| `backend/internal/parsers/liturgical_data.go` | Embedded `kirkkovuosi_2026.json` into Go binary via `//go:embed` |
| `backend/internal/services/liturgical_service.go` | Added `NewDefaultLiturgicalService` constructor |
| `backend/internal/services/liturgical_service_test.go` | Added `TestLiturgicalService_DefaultEmbedded` unit test |
| `backend/main.go` | Initialized liturgical service from embedded dataset with env override |
| `Dockerfile` | Added data directory copy to runtime container stage |
| `VERSION` | Bumped version to 3.9.3 |
| `backend/internal/version/version.go` | Updated backend version constant to 3.9.3 |
| `frontend/package.json` | Updated frontend package version to 3.9.3 |
| `frontend/src/utils/version.ts` | Updated frontend version constant to 3.9.3 |
| `kanban/todos.md` | Updated task status and tracked bugfix steps |
| `pr_stories/097-fix-embed-liturgical-calendar-data.md` | Documented PR story and verification metrics |

