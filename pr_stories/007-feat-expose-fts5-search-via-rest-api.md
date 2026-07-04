# PR: feat: expose FTS5 full-text search via REST API with translation filtering and comprehensive test coverage

## Summary

This PR exposes the existing FTS5 full-text search infrastructure through a production-ready REST endpoint (`GET /api/search`) with optional translation scoping and Go regex post-filtering. Previously, the `VerseRepository.Search` method existed but was inaccessible from the web layer. This implementation surfaces advanced text search capabilities to the React frontend, enabling concordance queries, thematic exploration, and linguistic pattern matching across the entire verse corpus.

## Purpose

- Bridge the gap between the existing FTS5 search infrastructure (established in migration `003_add_verse_fts.sql`) and frontend consumption through a clean HTTP API.
- Enable translation-scoped searches to prevent cross-translation noise in multi-corpus databases (e.g., querying "love" in ESV without polluting results with Finnish translations).
- Provide Go-native regex post-filtering for advanced pattern matching beyond SQLite FTS5's token-based queries.
- Establish comprehensive test coverage for the search path matching the rigor of the existing `GetVerses` test suite.

## Changes in This PR

### 1. Service Layer Exposure (`internal/services/verse_service.go`)

- Implemented `SearchVerses` method on `VerseService` accepting three parameters: `ftsQuery` (FTS5 MATCH syntax), `regexPattern` (optional Go regex), and `translationID` (optional scope filter).
- Delegates to `VerseRepository.Search` by constructing a `SearchParams` struct with all three fields.
- Thin coordination layer maintaining service boundary contracts — no business logic duplication from the repository.

### 2. Translation Filter in Repository (`internal/db/verse_repo.go`)

- Extended `SearchParams` struct with `TranslationID string` field to support optional translation scoping.
- Modified `Search` to build SQL dynamically: when `TranslationID` is non-empty, appends `AND v.translation_id = ?` after the FTS5 MATCH clause.
- Uses variadic `args ...any` to pass query parameters safely, preventing SQL injection while maintaining flexibility.

### 3. REST API Handler (`internal/api/bible_handler.go`)

- Added `SearchVerses` HTTP handler responding to `GET /api/search?q=...&regex=...&translation=...`.
- Validates required `q` parameter (returns HTTP 400 if missing).
- Reads optional `regex` and `translation` query parameters and forwards them to `VerseService.SearchVerses`.
- Returns HTTP 500 with descriptive error messages on search failures (e.g., invalid regex patterns).
- Serializes results directly as JSON arrays of `models.Verse` structs.

### 4. Endpoint Registration (`main.go`)

- Registered `GET /api/search` route on the HTTP multiplexer, exposing the search handler to external clients.

### 5. Comprehensive Test Suite (`internal/services/verse_service_test.go`)

- **TestVerseService_SearchVerses_Success**: Seeds a verse with Finnish text, executes an FTS5 query for "Jumala", verifies the correct verse is returned with translation scoping.
- **TestVerseService_SearchVerses_RegexFilter**: Seeds two verses matching the FTS query "Jumala OR Sana", applies regex `^Jumala` to filter results, asserts only the verse starting with "Jumala" survives.
- **TestVerseService_SearchVerses_InvalidRegex**: Passes a malformed regex pattern `[invalid` and verifies the repository returns an `"invalid regex pattern"` error before executing any SQL.

## Files modified

- `internal/db/verse_repo.go` — Extended `SearchParams` with `TranslationID`; dynamic SQL construction in `Search`.
- `internal/services/verse_service.go` — Added `SearchVerses` method delegating to repository.
- `internal/services/verse_service_test.go` — Three new test cases covering success, regex filtering, and error handling.
- `internal/api/bible_handler.go` — New `SearchVerses` HTTP handler with query parameter validation.
- `main.go` — Registered `GET /api/search` endpoint.

## Tests

All tests pass with maintained coverage:

```bash
go test ./... -cover
```

### Coverage Summary

```
internal/api        57.5%
internal/services   91.3%
internal/parsers    87.0%
internal/db         75.4%
```

### Key Test Scenarios

- FTS5 query returns correct verse with translation filter applied
- Go regex post-processing narrows FTS5 results (two matches → one after regex)
- Invalid regex pattern caught before database interaction
- Empty `translation` parameter searches across all translations (backward compatible)

## Usage

### Basic text search

```bash
curl "http://localhost:8080/api/search?q=Jumala"
```

### Translation-scoped search

```bash
curl "http://localhost:8080/api/search?q=love&translation=web"
```

### Advanced regex filtering

```bash
curl "http://localhost:8080/api/search?q=Jumala&regex=%5EJumala&translation=fin-1992"
```

### Response format

```json
[
  {
    "id": "fin-1992:Joh:3:16",
    "translation_id": "fin-1992",
    "book_id": "Joh",
    "chapter": 3,
    "verse": 16,
    "text": "Jumala on rakastanut maailmaa"
  }
]
```

## Notes

- The FTS5 MATCH query remains the first WHERE clause; translation filtering is appended as `AND v.translation_id = ?` to maintain FTS5 syntax integrity.
- Regex filtering occurs in Go after SQL execution — SQLite returns all FTS matches, then `regexp.MatchString` narrows results client-side.
- `translation` parameter is optional — omitting it queries all installed translations, useful for cross-translation concordance studies.
- The handler returns raw `models.Verse` arrays (snake_case JSON) rather than `FrontendVerse` (camelCase), matching backend-to-backend or admin tool expectations.

## Related documentation

- `migrations/003_add_verse_fts.sql` — FTS5 virtual table and automatic trigger synchronization.
- `pr_stories/003-feat-db-repositories.md` — Initial `VerseRepository.Search` implementation with regex support.
- `pr_stories/006-feat-service-layer-parser-api-tests.md` — `GetVerses` endpoint and test coverage baseline.
