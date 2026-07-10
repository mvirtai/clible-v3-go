# PR Story: Diagnostic Logging for 500 Database Errors

## Business Context

We are troubleshooting runtime `500 Internal Server Error` responses occurring only for specific database-reliant endpoints (`GET /api/scopes`, `GET /api/scopes/workspace`, and `GET /api/history`) for pre-existing users (e.g., `mvirtai@proton.me`). 

Because database queries and scanning errors were previously returned directly to the client as JSON without being logged to `stderr` or `stdout`, Google Cloud Logging only captures the resulting status code 500. To trace the exact database schema, connection, or decoding mismatch in production, we need explicit diagnostic server-side logging.

This PR adds temporary `slog.Error` logging to these handlers to capture the underlying database error messages.

## Architectural Changes

### API Layer (Go)

* **Scope Handler** ([scope_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/scope_handler.go)):
  * Imported `"log/slog"`.
  * Added `slog.Error` calls inside the error handler blocks for `GetScopes` and `GetScopeWorkspace`.
* **History Handler** ([history_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/history_handler.go)):
  * Imported `"log/slog"`.
  * Added `slog.Error` calls inside the error handler block for `GetRecentHistory`.

## Testing Strategy

### Automated Tests
* None. This is a non-destructive debug logging addition that preserves existing business logic.

### Manual Verification
* Verified that the backend compiles without issue.
* Once merged to `main`, the CD pipeline will deploy the revision to Cloud Run. We will then trigger the failing endpoints and read the exact error output in GCP Google Cloud Logging to identify and fix the root database issue.
