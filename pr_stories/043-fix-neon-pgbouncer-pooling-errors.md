# PR Story: Fix Neon/PgBouncer Connection Pooling Prepared Statement Errors

## Business Context

When running in production on Neon PostgreSQL, endpoints reliant on parameterized database queries (`GET /api/scopes`, `GET /api/scopes/workspace`, and `GET /api/history`) randomly threw `500 Internal Server Error` with the following underlying messages:
1. `pq: unnamed prepared statement does not exist`
2. `pq: bind message supplies 2 parameters, but prepared statement "" requires 1`

These errors are a classic symptom of using prepared statements with a connection pooler (PgBouncer/Neon pooler) configured in **transaction pooling mode**. In this mode, physical connections are shared across different queries and transactions, which breaks the session-scoped prepared statement cache in the Go standard library SQL driver (`lib/pq`).

This PR appends `binary_parameters=yes` to all PostgreSQL connection strings to disable the separate statement preparation phase and execute parameterized queries in a single round-trip, resolving prepared statement mismatches.

## Architectural Changes

### Database Layer (Go)

* **Database Connection Utility** ([connection.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/connection.go)):
  * Automatically appends `binary_parameters=yes` to any `postgres://` or `postgresql://` connection strings during `InitializeDB` if it is not already present.
  * Preserves existing parameters while safely appending the new parameter.

## Testing Strategy

### Automated Tests
* Standard backend unit tests run natively on GitHub Actions and pass successfully.

### Manual Verification
* Verified backend build compiles without issues.
* Verified locally that appending parameters works seamlessly.
* Once deployed, queries on `/api/scopes`, `/api/scopes/workspace`, and `/api/history` will execute successfully without raising database driver prepared statement errors.
