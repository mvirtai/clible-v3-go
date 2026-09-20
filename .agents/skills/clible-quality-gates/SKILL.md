---
name: clible-quality-gates
description: Guides execution and interpretation of Clible Taskfile automation, test suites (backend Go & frontend Vitest), linter, coverage reports, and semantic version bumps.
---

# Clible Quality Gates & Taskfile Automation

This skill governs the automated verification, testing, and release hygiene processes across Clible.

---

## 1. Quality Gate Commands

All quality gates are orchestrated through `Taskfile.yml`. Always execute verification via `task`:

| Command | Layer / Scope | What It Runs | When to Run |
| :--- | :--- | :--- | :--- |
| `task check` | **Full Project** | Runs backend checks, linters, frontend tests, and typecheck | **Mandatory** before commits, PR stories, or finishing tasks |
| `task backend:check` | **Backend (Go)** | `go mod tidy`, `golangci-lint run`, `go test -v -coverprofile=...`, coverage calculation | After modifying any Go code under `backend/` |
| `task frontend:check` | **Frontend (React)** | TypeScript typecheck (`tsc -b`), ESLint, and Vitest suite | After modifying any TSX/TS/CSS code under `frontend/` |
| `task version` | **Version Check** | Prints current project version from `VERSION` | Quick inspection |
| `task version:bump PART=patch` | **SemVer Bump** | Increments patch version across `VERSION`, `package.json`, `version.ts`, `version.go` | Bugfixes, hotfixes, isolated tweaks |
| `task version:bump PART=minor` | **SemVer Bump** | Increments minor version | New features, components, endpoints, schema migrations |

---

## 2. Developer WIP Isolation & Scoped Quality Gates

* When running `task check`, failures may stem from ongoing concurrent edits by the developer in other parts of the codebase (e.g. unfinished components, in-progress syntax, missing imports).
* In such situations:
  * **Never touch or erase the developer's work-in-progress files.**
  * Focus strictly on validating your own assigned modifications via scoped checks (e.g. `task backend:check` for Go changes, or targeted Vitest/ESLint commands for modified frontend files).
  * Report clearly in the briefing that global `task check` caught developer WIP in external files, while the agent's changes passed scoped verification.

---

## 3. Test Coverage & Reporting

* Backend coverage profile is generated at:
  `.cov/backend/coverage.txt`
* When auditing or updating PR stories (`pr_stories/`), always source the exact coverage numbers directly from this file or runner output.
* Zero tolerance for regressions in unit tests.

---

## 4. Go Backend Quality Standards

* **Layer Isolation**:
  * API layer (`backend/internal/api/`): Only calls services; never touches repositories or SQL.
  * Service layer (`backend/internal/services/`): Business logic, buffered batching (500 records).
  * Repository layer (`backend/internal/db/`): Strictly parameterized queries (`$1, $2`), context propagation (`QueryContext`, `ExecContext`).
* **Explicit Error Handling**:
  * Zero silent suppression (`_ = file.Close()`, `_, _ = fmt.Sscanf(...)`).
* **Database Dual-Compatibility**:
  * Production: Neon PostgreSQL (`backend/migrations/`).
  * In-memory tests: SQLite fallback (`:memory:`).

---

## 5. Semantic Versioning Protocol

* **Patch (`task version:bump PART=patch`)**:
  * Bugfixes, styling adjustments, refactoring without new user-facing functionality.
* **Minor (`task version:bump PART=minor`)**:
  * New features, new UI components, new API endpoints, database schema additions.
* **Major (`task version:bump PART=major`)**:
  * Breaking public API changes, major architectural redesigns.

---

## 6. External Tools & Vulnerability Scanners (`govulncheck`)

* **No Automatic Scans**: Running `govulncheck ./...` or full dependency security scanners can dump massive AST/symbol traces into the terminal context, wasting tokens and flooding the session.
* **Installation vs. Execution Boundary**:
  * When asked to install, update, or check a toolchain or tool (e.g. `govulncheck`):
    * The agent may install or update the tool and verify its version (`tool --version`).
    * The agent **MUST NOT** execute full scanning passes automatically.
    * The agent reports: *Tool is installed and version is verified; execution is left to the developer.*
* **Ask Permission**: Always obtain the developer's explicit confirmation before running any full-repository scanning or analysis tools.
