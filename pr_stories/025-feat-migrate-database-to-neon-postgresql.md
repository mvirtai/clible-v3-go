# PR Story: Migrate Database to Neon PostgreSQL

This PR migrates the database backend from SQLite (accessed via GCS FUSE) to a fully managed Neon PostgreSQL instance, solving production write performance issues, avoiding GCS FUSE concurrency conflicts, and allowing the Cloud Run instance count to scale horizontally.

---

## Business Context

In the previous configuration, the SQLite database was stored on a GCS FUSE volume mount. Google Cloud Storage is an object storage service and does not support random writes or POSIX file locking, causing `BufferedWriteHandler.OutOfOrderError` failures when importing translations or logging search history. To resolve these performance and concurrency bottlenecks, the entire database backend is migrated to Neon PostgreSQL.

---

## Architectural Changes

### Backend (Go)

1. **Dual Driver Connectivity**
   * Imported `github.com/lib/pq` as the PostgreSQL driver.
   * Retained `modernc.org/sqlite` for local in-memory testing.
   * Updated `InitializeDB` to dynamically detect and open a PostgreSQL connection if the database URL starts with `postgres://` or `postgresql://`. Otherwise, it falls back to SQLite (enforcing SQLite foreign key pragmas).

2. **Configuration & Safe Parsing**
   * Renamed `DBPath` to `DatabaseURL` in the `Config` structure and loaded it from the `DATABASE_URL` environment variable.
   * Implemented a `cleanEnv` helper inside `config.go` to sanitize environment variables by automatically stripping quotes (both `"` and `'`) which are imported literally when using `docker run --env-file`.

3. **ANSI SQL Parametrized Placeholder Alignment**
   * Updated all repositories (`BookRepository`, `SavedRepository`, `ScopeRepository`, `SearchHistoryRepository`, `TranslationRepository`, `VerseRepository`) to use `$1, $2, $3...` parameter placeholders instead of SQLite's anonymous `?` placeholders. Because SQLite natively supports named and dollar-sign placeholders, this enables both PostgreSQL (in production) and SQLite (in unit tests) to share the exact same repository queries.

4. **Dynamic Full-Text Search Dialect Translation**
   * Added an `isPostgres` detection flag inside `VerseRepository` resolved at initialization via a query probe (`SELECT version()`).
   * Dynamic search queries: For PostgreSQL, the `Search` method uses Postgres-native full-text search (`to_tsvector('simple', text) @@ to_tsquery('simple', $1)`), while falling back to SQLite FTS5 (`MATCH $1`) for local unit tests.

5. **Migration Adapter**
   * Refactored `migrations.go` to intercept SQLite-specific FTS5 virtual tables and triggers. If the connection is PostgreSQL, it replaces the FTS5 setup with a PostgreSQL GIN index (`CREATE INDEX ... USING GIN(to_tsvector('simple', text))`).
   * Modified `007_seed_books.sql` to replace SQLite-specific `INSERT OR IGNORE` with Postgres-compatible `INSERT INTO ... ON CONFLICT (id) DO NOTHING`.

6. **Performance & Seeding Optimizations**
   * **Bulk Insert Batching**: Re-engineered the `BulkInsert` method in `VerseRepository` to insert verses in batches of 500. This reduces network roundtrips over the internet from 31,000 sequential execution requests to just 62, speeding up local-to-cloud imports from 15 minutes to under 18 seconds.
   * **Write Timeout Extension**: Increased the HTTP server `WriteTimeout` in `main.go` from 10 seconds to 60 seconds. This ensures that heavy operations, such as importing an entire translation, have ample time to finalize and respond without triggering abrupt connection cuts (`ERR_EMPTY_RESPONSE`).

### Infrastructure (Terraform)

1. **GCS Volume Mount Removal**
   * Deleted GCS bucket `clible_data` and all related IAM service account bindings since local file storage is no longer required.
   * Removed FUSE volume mounts and volumes from the Cloud Run service definition.

2. **Managed Secrets & Scaling**
   * Provisioned a new Secret Manager resource for the `DATABASE_URL` parameter.
   * Injected `DATABASE_URL` as an environment variable in Cloud Run, sourced securely from Secret Manager.
   * Raised `max_instance_count` from `1` to `10` since the stateless container can now scale horizontally.

---

## Verification & Testing

* **Unit and Integration Tests**: Validated that all test suites continue to execute and pass locally on an in-memory SQLite database, verifying repository query compatibility.
* **Dialect Verification**: Verified that schema migrations compile and successfully create all tables, indexes, and constraints on PostgreSQL.
* **Manual Verification**: Ran the unified application inside a local Docker container connected to Neon PostgreSQL. Confirmed that translation imports and full-text comparative search operations compile and respond cleanly.
