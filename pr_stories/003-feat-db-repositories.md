
# PR: feat: implement VerseRepository with FTS5 search and regex filtering

## Summary

This PR completes the foundational data-access layer for `clible-v3-go` by implementing the `VerseRepository`. It delivers high-throughput transaction-wrapped bulk insertion capabilities optimized for pure-Go SQLite constraints and introduces an advanced text search engine combining SQLite FTS5 index lookups with standard Go library regular expression post-filtering.

## Purpose

- Enable high-performance seeding of the entire Bible corpus (31,000+ records) without triggering row-by-row disk I/O bottlenecks.
- Navigate SQLite's FTS5 internal design constraints where virtual tables track internal integer `rowid` values rather than the application's global structural `TEXT` keys (`id`).
- Replicate legacy business logic queries by coupling sub-millisecond FTS5 token lookups with strict regular expression pattern filters.

## Changes in This PR

### 1. High-Throughput Statement Pipeline (`internal/db/verse_repo.go`)

- Implemented `BulkInsert` leveraging context-aware prepared statements (`PrepareContext`) executed within a single explicit ACID transaction block.
- Enforced reliable resource management using cascading deferred cleanups (`tx.Rollback()` and `stmt.Close()`) to guarantee state isolation.

### 2. Dual-Engine Text Search Framework

- Developed `Search` executing localized relational joins directly via SQLite's internal physical `v.rowid = verses_fts.rowid` pointers, avoiding text-to-integer key mismatches.
- Embedded runtime regex compilation validations (`regexp.Compile`) evaluating matches dynamically during row iteration scans before constructing return payloads.

### 3. Integrated Test Verification Suite (`internal/db/verse_repo_test.go`)

- Authored automated integration tests initializing decoupled, in-memory instances via the project's central `NewConnection` bootstrapper.
- Validated real-world relational behavior against the actual 6 embedded SQL migration assets, guaranteeing foreign key cascading integrity across simulated parent datasets (`translations` and `books`).

## Files added

- `internal/db/verse_repo.go` — Verse domain specific repository data access object.
- `internal/db/verse_repo_test.go` — Transaction and full-text search integration test suite.

## Files modified

- None (Independent repository encapsulation boundary).

## Tests

Executed local test validations across all active data layout boundaries:

```bash
go test -v ./...
```

## Output highlights

```plaintext
=== RUN   TestVerseRepository_BulkInsertAndSearch
--- PASS: TestVerseRepository_BulkInsertAndSearch (0.01s)
PASS
ok      [github.com/mvirtai/clible-v3-go/internal/db](https://github.com/mvirtai/clible-v3-go/internal/db)     0.015s
```

## Usage

```go
repo := db.NewVerseRepository(dbConn)

// Execute bulk load safely
err := repo.BulkInsert(ctx, bibleVerses)

// Query via combined engines
results, err := repo.Search(ctx, db.SearchParams{
    FTSQuery:     "Jumala",
    RegexPattern: `valkeus`,
})
```
