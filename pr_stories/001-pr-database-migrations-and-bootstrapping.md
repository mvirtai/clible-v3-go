# PR: feat: embedded SQL migrations and database bootstrapping

## Summary

This PR establishes the core database layer foundation for `clible-v3-go`. It introduces six numbered SQL migration files (001–006) ported from the original architecture specifications, an automated transaction-safe migration runner leveraging Go's native `//go:embed` capabilities, a robust SQLite connection bootstrapper enforcing referential integrity, and an initial `TranslationRepository` serving as an architectural smoke test.

## Purpose

- Establish a completely offline-first relational database structure matching the project design rules.
- Automate structural database schema rollouts seamlessly inside the compiled binary without requiring external orchestration or migration binaries.
- Enforce foreign key constraint validation (`PRAGMA foreign_keys = ON`), which SQLite silently disables by default.
- Provide a clear, production-grade implementation pattern for isolated data-access components (repositories) utilizing the shared `internal/models` namespace.

## Changes in This PR

### 1. Embedded Migration Architecture (`migrations/`)

- Ported 6 chronological database schema migrations: reference book metadata, installed translations tracking, target verses with FTS5 full-text search indexes and data-sync triggers, workspaces/scopes, saved search entities, and search history accounting.
- Implemented `migrations.go` utilizing `embed.FS` to bundle all raw `.sql` assets into the output binary at compilation runtime.

### 2. Sequential Migration Runner (`internal/db/migrations.go`)

- Developed `RunMigrations` to orchestrate structural state modifications. It automatically sets up an internal `_migrations` tracking table and executes unapplied scripts sequentially.
- Each migration is executed inside an isolated database transaction block (`db.Begin()`) ensuring full ACID compliance—partial rollouts are rejected on failure and rolled back automatically.

### 3. Database Connection Handler (`internal/db/connection.go`)

- Implemented `NewConnection` to bootstrap the data layer lifecycle. It initializes the database connection pool using the pure-Go SQLite driver.
- Explicitly injects and enforces `PRAGMA foreign_keys = ON;` immediately upon every open handle to guarantee cascade deletions function accurately down the dependency tree.

### 4. Translation Repository Smoke Test (`internal/db/translation_repo.go`)

- Created `TranslationRepository` mapping native SQL scans cleanly into decoupled models.
- Implements validation methods (`GetAll`, `Create`, `Exists`) to act as an operational verification test for the newly initialized connection layer while strictly avoiding circular dependency bloat.

## Files added

- `migrations/001_initial_schema.sql` — schema structural root placeholder.
- `migrations/002_seed_architecture.sql` — database structure for books, translations, and verses.
- `migrations/003_add_verse_fts.sql` — FTS5 virtual table and trigger-backed data synchronization boundaries.
- `migrations/004_drop_verses_text_index.sql` — redundant index cleanup to reduce write overhead.
- `migrations/005_scopes_and_saved_results.sql` — user analysis context spaces and saved study markers.
- `migrations/006_search_history.sql` — query logging audit tables and chronological indexing.
- `migrations/migrations.go` — runtime binary asset embedding setup.
- `internal/db/migrations.go` — transaction-aware migration executor logic.
- `internal/db/connection.go` — relational bootstrapper and context engine configuration.
- `internal/db/translation_repo.go` — translation domain specific repository data access object.

## Files modified

- None (Initial infrastructure bootstrapping scope).

## Tests

Manual integration validation checks were executed to confirm transaction guarantees, syntax compatibility across standard indices, and functional trigger automation under the pure Go driver.

```bash
go test -v ./...
```

## Usage

The infrastructure manages its rollout states autonomously. In the main application orchestrator, initializing the data boundary takes a single connection execution:

```go
dbConn, err := db.NewConnection("clible_test.db")
if err != nil {
    log.Fatalf("failed to initialize relational cluster: %v", err)
}
defer dbConn.Close()
```

## Notes

modernc.org/sqlite was deliberately selected as a pure-Go dependency-free driver to enable lightning-fast cross-compilation configurations across targeting platforms without requiring a local system CGO compilation chain.

Cascading deletions on translation removals function out of the box due to strict connection-level pragma injection routines.

## Related documentation

AGENTS.md — Relational boundaries and structural package design constraints.
