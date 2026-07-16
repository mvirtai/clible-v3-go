# PR Story: Fix Notebook CLI Parsing and Command Execution Bugs

## Business Context

This PR resolves a series of backend test failures related to the Notebook CLI slash command parser and cell execution mechanisms. It ensures that command lines with quoted strings are parsed correctly, database migrations are applied cleanly, and cell execution contexts are fully populated.

## Architectural Changes

No major architectural changes were introduced. However, the CLI slash command parser was enhanced with a quote-aware state machine, and the Notebook Service's cell execution engine was corrected to load dependent cell collections properly.

## Bug Fixes

### CLI Command Parser

* **Enhanced `ParseCLICommand`** ([cli_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/cli_service.go)):
  * Swapped the naive `strings.Fields` parser with a robust, quote-aware state machine.
  * Quotes (both `'` and `"`) are now parsed correctly, stripping outer quotes and grouping the content as a single argument.
* **Updated Tests** ([cli_service_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/cli_service_test.go)):
  * Adjusted expected test outcomes in `TestParseCLICommand` to match the enhanced parser behavior (verifying that quotes are stripped and arguments aren't split by spaces inside quotes).

### Database Seeding & Integration Tests

* **Removed Raw SQL Seed Queries** ([cli_service_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/cli_service_test.go)):
  * Replaced custom in-line SQL insertions with `notebookRepo.SaveCells`. This resolves database driver discrepancies (such as SQLite column validation errors) and enforces structural reuse.
* **Corrected Cross-Reference Seed Data**:
  * Updated the seeded *Romans 5:8* verse text to contain the word *"world"*, enabling FTS keywords to match properly with *John 3:16* for cross-references tests.

### Notebook Cell Execution

* **Loaded Cell Context in `ExecuteCellCommand`** ([notebook_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/notebook_service.go)):
  * Added a database call (`s.repo.GetCells`) to load all cells of a notebook before looking up the target execution cell. This resolves the `"cell not found in this notebook"` error.
* **Passed Selected Translation ID** ([NotebookEditor.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/NotebookEditor.tsx)):
  * Appended the active translation to the `/execute` URL query parameters (`?translation=${translation}`) to ensure the cell runs with the user's active translation.
* **Removed Hardcoded 'KJV' Fallback** ([notebook_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/notebook_handler.go)):
  * Removed the uppercase `"KJV"` fallback. The backend now passes an empty string if the query parameter is missing, allowing the service layer to resolve the user's default active/installed translation correctly. This solves the `500 (Internal Server Error)` that was caused by checking accessibility of the case-sensitive non-existent or inactive `"KJV"` translation.

## Testing Strategy

### Automated Tests

* Executed the entire validation suite to confirm all tests pass successfully:

  ```bash
  task check
  ```
