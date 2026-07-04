# PR Story: Reader Engine Expansion & Book Metadata API

## Business Context

To finalize the core Bible reading platform (Lukukone) in Clible-v3-go, we have completed the integration of book-level metadata and expanded the scripture retrieval scopes. Users can now list and inspect all 66 canonical Bible books and retrieve scriptures not just by verse, but also by entire chapters or complete books. This closes the key remaining data access and presentation layer gaps of the backend service.

## Architectural Changes

We followed a clean three-tier architecture (Repository -> Service -> API Handler) and strictly adhered to layer boundary rules, concurrent-safety, and Go 1.22+ routing standards.

### 1. Database Layer (`backend/internal/db/`)

* **Book Repository (`book_repo.go`)**: Created `BookRepository` with methods `GetAll` (to query all 66 canonical books ordered by position) and `GetByID` (to fetch metadata for a single book by its 3-letter canonical code, e.g., `GEN` or `JHN`). Books are pre-seeded automatically during bootstrapping via the `007_seed_books.sql` migration.
* **Verse Repository (`verse_repo.go`)**: Expanded `VerseRepository` by adding `GetByChapter` and `GetByBook` methods to query verses for a specific chapter or an entire book.
* **Bug Fix**: Corrected a typographical error in `verse_repo.go` where `GetByBook` was named `BetByBook`.

### 2. Service Layer (`backend/internal/services/`)

* **Book Service (`book_service.go`)**: Created `BookService` to orchestrate metadata lookups.
* **Verse Service (`verse_service.go`)**: Updated `VerseService.GetVerses` to handle `ScopeChapter` and `ScopeBook` coordinate resolutions.
* **Bug Fix**: Fixed a compilation error where `s.translationRepo.GetAll(ctx)` was passed too many arguments (the repository-level `GetAll` method takes no arguments). Corrected the default translation fallback condition from `err != nil` to `err == nil`.

### 3. API Controller Layer (`backend/internal/api/` & `backend/main.go`)

* **Book Handler (`book_handler.go`)**: Created `BookHandler` exposing:
  * `GET /api/books` — retrieves a list of all canonical books.
  * `GET /api/books/{id}` — retrieves metadata of a specific book using native Go 1.22+ path parameter routing via `r.PathValue("id")`.
* **Mux Routing & Dependency Injection (`main.go`)**: Registered `BookRepository`, `BookService`, and `BookHandler`, injecting dependencies cleanly. Registered routing paths in the standard `http.ServeMux`.

### 4. Quality Gates & Testing

* **New Test Coverage**:
  * Created [book_repo_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/book_repo_test.go) verifying book retrieval, ordering, and missing book handling.
  * Created [book_service_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/book_service_test.go) asserting proper service-to-repository orchestration.
  * Created [book_handler_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/book_handler_test.go) testing API endpoints using mock requests mapped through a test multiplexer (`http.NewServeMux`).
* **Test Updates**:
  * Expanded [verse_service_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/verse_service_test.go) to test chapter and book scope retrievals with real in-memory SQLite assertions.
  * Updated [bible_handler_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/bible_handler_test.go) by renaming `TestBibleHandler_GetVersesByReference_ServiceError` to `TestBibleHandler_GetVersesByReference_ParseError` and passing `ref=123`. Since chapter-scope references (like `"Joh 3"`) now succeed, querying `"123"` correctly fails parsing, asserting the expected `500 Internal Server Error` response.

### 5. CI Pipeline Caching & Linting Optimizations (`.github/workflows/ci.yml`)

To speed up the CI/CD pipeline runs in GitHub Actions, we optimized caching and dependency resolution:

* **Go Linter Optimization**: Replaced `go run github.com/golangci/golangci-lint/cmd/golangci-lint@latest` (which compiled the linter from source on every run) with the official `golangci/golangci-lint-action@v6`. This downloads pre-compiled binaries and caches lint results.
* **Go Dependency Caching**: Added `cache-dependency-path: backend/go.sum` under `actions/setup-go@v5` to resolve cache mismatch issues caused by the nested directory structure.
* **Frontend Node Dependency Caching**: Configured `cache: 'pnpm'` and `cache-dependency-path: frontend/pnpm-lock.yaml` under `actions/setup-node@v4` to cache frontend node modules.

## Verification & Testing

1. **Automated Tests**: Executed `task backend:test-cov`. All unit and integration tests compile, execute with the race detector enabled, and pass successfully with zero errors.
2. **Dockerization**: Successfully built and ran the application inside Docker (`task docker:build` and `task docker:run`). Queries are answered instantly and concurrent request routing functions as expected.
3. **CI Config Verification**: Checked the modified `.github/workflows/ci.yml` schema structure. Caching will be active on the next push.
