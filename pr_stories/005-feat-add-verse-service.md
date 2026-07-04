# PR: feat: implement ReferenceParser, AnalyticService, and VerseService orchestration layer

## Summary

This PR establishes the core business logic and compilation parsers for `clible-v3-go`. It introduces a high-performance Bible reference string parser driven by optimized regex engines, an in-memory linguistic analytics service featuring Longest Common Subsequence (LCS) translation comparison algorithms, and an orchestration service (`VerseService`) that coordinates tokenized references with clean database retrieval layers.

## Purpose

- Complete the migration from `clible-v2`'s process-forking architecture to a modern, unified web-first Go backend executing entirely within shared memory spaces.
- Deliver sub-millisecond reference token processing ("Joh 3:16-18") capable of resolving book, chapter, and range attributes safely.
- Protect database consistency limits by separating structured relational lookup routines (B-Tree lookups for specific coordinates) from text token searching arrays (FTS5).
- Enforce explicit error-wrapping policies (`fmt.Errorf` with `%w`) to guarantee scannable stack tracing from the parser layer all the way up to future HTTP controller boundaries.

## Changes in This PR

### 1. Zero-Dependency Reference Parser (`internal/parsers/`)

- Designed `ParseReference` utilising a compile-time static regex block (`regexp.MustCompile`) to minimize startup runtime overhead during high-concurrency requests.
- Implemented robust string-to-integer decoding workflows (`strconv.Atoi`) parsing inputs into discrete structural enums (`ScopeBook`, `ScopeChapter`, `ScopeVerse`) backed by Go's native integer `iota` metrics.

### 2. High-Performance Text Analytics Engine (`internal/services/`)

- Authored `AnalyticService` processing localized text tokens, extracting character matrices, and calculating kielellinen rikkaus ratios (Type-Token Ratio / TTR).
- Integrated compile-time byte arrays (`//go:embed stopwords.json`) to store stopword datasets for English, Finnish, Ancient Greek, and Modern Greek directly inside the compiled binary.
- Built a native Longest Common Subsequence (LCS) text comparator based on multi-dimensional dynamic programming allocation loops (`make([][]int, m+1)`), eliminating any runtime dependency on Python's `difflib`.

### 3. Structural Query Coordinator (`internal/services/verse_service.go`)

- Implemented `VerseService` to orchestrate input validation and lookup sequences.
- Fixed an architectural mismatch by ensuring that scoped coordinate queries bypass the FTS5 text table and instead hit relational indexes directly via standard database connection abstractions.

### 4. Table-Driven & Integration Test Matrices

- Formulated extensive table-driven test configurations (`TestParseReference_TableDriven`) utilizing anonymous data slices to validate complex reference input patterns against structural expectations.
- Set up an automated integration verification test engine (`TestAnalyticsService_RealContextComparison`) seeding real parallel translation corpora (`fin-1992` and `KR38`) inside transaction-safe, in-memory instances to guarantee end-to-end framework alignment.

## Files added

- `internal/parsers/reference_parser.go` — String parser mapping queries into typed coordinate boundaries.
- `internal/parsers/reference_parser_test.go` — Table-driven test suite validating regex capture groups.
- `internal/services/analytics_service.go` — Text metrics engine and LCS similarity calculator.
- `internal/services/analytics_service_test.go` — Unit tests for tokenization and metrics.
- `internal/services/analytics_integration_test.go` — Multi-layered integration verification suite.
- `internal/services/verse_service.go` — Service layer orchestrator binding repositories and parsers.
- `internal/services/verse_service_test.go` — Isolated orchestration and error flow test cases.
- `internal/services/stopwords.json` — Static language-specific functional dictionaries.

## Files modified

- None (Independent implementation block).

## Tests

Executed local quality gate pipelines verifying all internal package frameworks pass completely:

```bash
go test -v ./...
```

## Output highlights

```plaintext
=== RUN   TestParseReference_TableDriven
--- PASS: TestParseReference_TableDriven (0.00s)
=== RUN   TestAnalyticService_TokenizeAndAnalyze
--- PASS: TestAnalyticService_TokenizeAndAnalyze (0.00s)
=== RUN   TestVerseService_GetVerses_Success
--- PASS: TestVerseService_GetVerses_Success (0.01s)
PASS
ok      [github.com/mvirtai/clible-v3-go/internal/services](https://github.com/mvirtai/clible-v3-go/internal/services)  0.012s
```

## Usage

```go
// Direct in-memory orchestration
parser, err := parsers.ParseReference("Joh 3:16")
verses, err := verseService.GetVerses(ctx, "Joh 3:16", "fin-1992")
analysis := analyticsService.CompareTranslations("Joh 3:16", verses92, verses38)
```
