# Pull Request Story: 060 – Implement Semantic Versioning and Release Workflow

## Overview & Business Context

Prior to this update, Clible-v3-go lacked a standardized, traceable release and versioning mechanism. The project repository had no Git tags, the frontend `package.json` was defaulted to `0.0.0`, and the backend had no centralized endpoint to inspect running build metadata.

With upcoming major architectural developments (such as the Unified Hybrid Cell & Clible Magic DSL engine), introducing a robust **Semantic Versioning 2.0.0 (SemVer)** standard and automated release workflows is essential for reliable deployment tracking, cross-environment audits, and user visibility.

---

## Architectural & System Changes

### 1. Root Source of Truth (`VERSION`)

- Introduced a single source-of-truth file `VERSION` at the workspace root initialized to `3.0.0`.
- Synchronized frontend `package.json` version metadata with the root version.

### 2. Standardized Changelog (`CHANGELOG.md`)

- Created a formal `CHANGELOG.md` document structured according to the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) standard.
- Documented baseline capabilities in `[3.0.0]` and initialized `[Unreleased]` for upcoming features.

### 3. Backend Version Package & REST Endpoints

- Implemented `backend/internal/version/version.go` providing build and runtime metadata:
  - `Version`: Current SemVer version string.
  - `GitCommit`: Injected via ldflags or default `dev`.
  - `BuildDate`: Timestamp of binary creation.
  - `GoVersion`: Go compiler runtime version.
- Created `backend/internal/api/version_handler.go` with HTTP endpoint `GET /api/version` (and aliased `GET /api/health` for uptime/version checks).

### 4. Frontend UI Version Badge

- Added `frontend/src/utils/version.ts` exposing `APP_VERSION` and a fetch helper for backend metadata.
- Integrated a subtle, responsive version pill badge (`v3.0.0`) in the application footer.

### 5. Taskfile Automation (`Taskfile.yml`)

- Added `task version` to display the current application version.
- Added `task version:bump PART=patch|minor|major` to automate version incrementation across `VERSION`, `package.json`, and `version.go`.
- Added `task git:tag` to create annotated Git release tags matching `v<VERSION>`.

---

## Testing Strategy & Metrics

### Automated Backend Tests

- Unit tests for `internal/version` achieving 100% statement coverage.
- Unit tests for `internal/api/version_handler_test.go` validating `GET /api/version` response payload and HTTP headers.

```text
=== RUN   TestGetInfo
--- PASS: TestGetInfo (0.00s)
PASS
coverage: 100.0% of statements
ok  	github.com/mvirtai/clible-v3-go/internal/version	1.032s	coverage: 100.0% of statements

=== RUN   TestVersionHandler_GetVersion
--- PASS: TestVersionHandler_GetVersion (0.00s)
PASS
ok  	github.com/mvirtai/clible-v3-go/internal/api	0.555s
```

### Automated Frontend Tests

- Executed all 64 Vitest unit and component tests verifying zero regressions across components and helpers.

```text
 Test Files  13 passed (13)
      Tests  64 passed (64)
   Duration  3.36s
```
