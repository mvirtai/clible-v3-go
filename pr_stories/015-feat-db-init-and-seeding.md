# Feature: Database Initialization, XML Translation Ingestion, and Ingestion Optimization

## Business Context

This pull request completes a foundational milestone for `clible-v3-go`. It addresses three logically grouped backend objectives to establish our initial baseline capabilities:

1. **Initial Book Seeding**: Establishing foundational metadata for 66 canonical Bible books in the database via migrations.
2. **Translation Ingestion and Robust Parsing**: Enhancing our `XMLVerseParser` and SQLite schema integration by fully importing the English WEB translation via the `/api/translations/import` streaming endpoint.
3. **Robust Overwrites and Non-Canonical Filtering**: Resolving unique constraint errors and foreign key constraint failures during XML import by supporting translation overwrites and dynamically skipping non-canonical books (like Apocrypha).

## Architectural Changes

- **Database Migrations (`migrations/007_seed_books.sql`)**:
  - Inserted records for the 66 canonical books with proper mapping IDs and names into the `books` table.
- **XML Streaming Parser (`internal/parsers/xml_parser.go`)**:
  - Refactored `ParseStream` to support both container tags (`<v>Text</v>`) and self-closing tags (`<v/>Text<ve/>`) used in USFX.
  - Added footnote (`f`) and cross-reference (`x`) text stripping using a stack-based `skipDepth` approach to prevent metadata leaking into verse text.
- **Dynamic Book Validation (`internal/services/seed_service.go`)**:
  - Dynamically queries the `books` table at the beginning of imports to retrieve canonical book IDs.
  - Maps alternative book abbreviations (like `OBA` to `OBD`) to their canonical forms.
  - Automatically skips verses belonging to non-canonical books (e.g. Apocrypha) to comply with database foreign key constraints.
- **Translation Overwrite Support (`internal/db/translation_repo.go` & `internal/api/translation_handler.go`)**:
  - Exposed a `Delete` method on the translation repository that triggers cascade deletes on associated verses.
  - Integrated checking and removal of pre-existing translation records during import to facilitate safe re-imports.

## Testing Strategy

- **XML Streaming Integrity & Footnote Skipping**: Added a unit test validating self-closing tags and nested footnote tag stripping.
- **Import Verification**: Successfully streamed `eng-web.usfx.xml` from `seven1m/open-bibles` via `POST /api/translations/import` pipeline, persisting exactly `31,102` verses.
- **Automated Validation**: Verified that all local quality checks (`task check`) pass cleanly.

---

## 2. Architectural Changes & File Transformations

### A. Book Metadata Seeding

- **`backend/migrations/007_seed_books.sql` [NEW]**: A SQL migration script inserting the 66 Bible books with their canonical three-letter IDs, names, testaments (`OT` / `NT`), positions (1 to 66), and chapter counts. This script is loaded automatically by Go's embedded filesystem (`//go:embed`) during database boot.

### B. Ingestion Overwrite & Filtering logic

- **`backend/internal/db/translation_repo.go` [MODIFY]**: Added `Delete(id string) error` to cleanly drop a translation record and cascade delete its associated verses.

- **`backend/internal/api/translation_handler.go` [MODIFY]**: Updated `ImportTranslation` to check for and remove pre-existing translations prior to running the importer.
- **`backend/internal/services/seed_service.go` [MODIFY]**: Implemented dynamic canonical book ID filtering and mapping (e.g. `OBA` -> `OBD`) during the stream callbacks to prevent foreign key errors.

### C. Streaming USFX Tag Support

- **`backend/internal/parsers/xml_parser.go` [MODIFY]**: Enhanced parser to handle self-closing tags and strip footnotes/cross-references.

- **`backend/internal/parsers/xml_parser_test.go` [MODIFY]**: Added a test verifying self-closing USFX XML parsing with nested footnote content.

### D. Migration Test Decoupling

- **`backend/internal/db/connection_test.go` [MODIFY]**: Refactored `TestNewConnection_InMemory` to dynamically scan the migrations directory and count `.sql` files at test execution time instead of asserting against a hardcoded value of `6`.

---

## 3. Testing Strategy & Verification

### Automated Verification

- Run Go test suites and linters to verify everything is functioning correctly:

  ```bash
  task check
  ```

  **Status**: PASS (All tests passed cleanly, 100% linter compliance).

### Manual Database Verification

- Verified that the 66 book records are successfully persisted in the SQLite instance:

  ```bash
  sqlite3 backend/clible.db "SELECT count(*) FROM books;"
  ```

  **Output**: `66` (All books seeded).

- Verified that the English WEB translation is fully imported (exactly `31,102` verses):

  ```bash
  sqlite3 backend/clible.db "SELECT count(*) FROM verses;"
  ```

  **Output**: `31102` (All canonical WEB verses imported).
