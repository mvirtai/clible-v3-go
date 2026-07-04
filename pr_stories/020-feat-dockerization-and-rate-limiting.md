# Pull Request: Feature - Dockerization and Rate Limiting for Cloud Readiness

This Pull Request prepares the Clible-v3-go application for stateless serverless cloud deployment (specifically targetting Google Cloud Platform Cloud Run) by implementing containerization, unified static file distribution, and IP-based rate limiting.

---

## Business Context & Goals

As we transition Clible-v3-go from a local development environment into a production-ready cloud application, we must address three key architectural needs:

1. **Cloud Portability:** The application must be packaged into a single, standardized, lightweight container that bundles both the React frontend and Go backend.
2. **Unified Delivery:** To avoid CORS management overhead and eliminate the need for a separate reverse proxy (like Nginx/Caddy) in production, the Go backend should serve the compiled React SPA directly.
3. **API & Cost Protection:** To safeguard backend API resources and prevent cost overruns when calling external LLM APIs (specifically the Gemini API), we must throttle incoming traffic using a server-side rate limiter.

---

## Architectural Changes

### 1. Docker Multi-Stage Packaging

A new `Dockerfile` and a `.dockerignore` file have been introduced at the project root:

- **BuildKit Caching:** Utilizes `# syntax=docker/dockerfile:1` and BuildKit mounts (`--mount=type=cache`) to persist Go modules and the `pnpm` store across builds, drastically reducing build times on subsequent runs.
- **Go SQLite CGO compilation:** Uses `golang:1.25-alpine` as the builder and installs `gcc` and `musl-dev` to compile CGO dependencies needed for SQLite.
- **Binary Size Optimization:** Compiles the Go server using `-ldflags="-s -w"` to strip debug and symbol tables, reducing the binary size by approximately 30-50%.
- **Runtime Security (Non-root user):** Creates a dedicated `clible` system user (UID/GID `10001`) in the final Alpine runtime image. The application drops root privileges immediately on startup, and directory ownership for persistent database files under `/data` is configured accordingly.

### 2. Single-Page Application (SPA) Fallback

The standard library `http.ServeMux` router in `backend/main.go` was updated to serve the frontend:

- **`http.FileServer` integration:** Reads static production assets from the path defined by the `FRONTEND_DIR` environment variable (falling back to `../frontend/dist` in local dev).
- **SPA Fallback Handler:** Catches all routes not prefixing `/api/` and serves the root `index.html` file if a requested file does not exist on disk. This enables client-side routing (React Router) to function properly when users access routes directly (e.g., `/scopes`).

### 3. In-Memory IP Rate Limiter

Introduced a thread-safe, memory-based IP rate limiter in a new middleware package:

- **Token Bucket Algorithm:** Implemented using `golang.org/x/time/rate` with a cleanup goroutine that automatically purges stale IP entries from memory every 10 minutes to prevent memory leaks.
- **Configuration:** Set to allow `2` requests per second per IP with a maximum burst capacity of `10` requests. Applied selectively to the HTTP handler chain.

### 4. Taskfile Automation

Added two new tasks to `Taskfile.yml` to simplify local container workflows:

- `task docker:build` — Builds the unified `clible-v3` Docker image.
- `task docker:run` — Runs the local image exposing port `8080` to test production parity.

### 5. Stability & Compatibility Improvements (Bug Fixes)

- **React Rendering Crash (Black Screen):** Fixed a crash that occurred when installing the very first translation from the hero section:
  - **JSON Array Null-Safety (Backend):** Modified `GetAll()` in [translation_repo.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/translation_repo.go) to initialize the translations slice as an empty slice (`[]models.Translation{}`) instead of a `nil` slice. This ensures that the `/api/translations` endpoint returns a valid empty JSON array (`[]`) instead of `null` when no translations are installed.
  - **Null Safety Checks (Frontend):** Updated [TranslationSelector.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/TranslationSelector.tsx) to fallback to an empty array when processing translations payloads (`data || []`) and added boundary guards to prevent `TypeError: Cannot read properties of null` during initial render states.
  - **Dependency Optimization:** Removed `selectedTranslation` from the `useEffect` dependency array in [TranslationSelector.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/TranslationSelector.tsx) to prevent duplicate API fetches.
  - **Prevention of Render Loop:** Preventing duplicate API calls to `/api/translations` when swapping selections via the dropdown. This resolves the async state race condition and prevents render loop crashes during transition states.
- **OSIS Milestone Tags Parsing (KJV / Biblia):** Fixed an issue where XML files containing milestone-style verse tags (using `sID` and `eID` attributes instead of nested text nodes) yielded empty results when imported:
  - **Milestone Support (Backend):** Refactored `ParseStream` in [xml_parser.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/parsers/xml_parser.go) to correctly identify start/end milestone elements (like `<verse osisID="Luke.3.5" sID="Luke.3.5" />` and `<verse eID="Luke.3.5" />`), preventing premature resetting of parser states and capturing text content accurately.

---

## Verification Plan

### Automated Verification

- Verified code quality and formatting for both frontend and backend using standard gates:

  ```bash
  task check
  ```

- **Unit Tests:** All unit and integration tests passed cleanly. This includes:
  - A new test assertion in [translation_repo_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/translation_repo_test.go) (`TestTranslationRepository_CreateAndGetAll` - Test 0) verifying that `GetAll()` returns a non-nil empty slice (`[]`) when the database contains zero translations.
  - A new test case in [xml_parser_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/parsers/xml_parser_test.go) (`TestXMLVerseParser_StreamingFormats` - `successfully streams valid OSIS milestone-style elements`) confirming that milestone-style OSIS XML tags (such as KJV's `sID` and `eID` markup) parse correctly.
- Go modules were tidied and verified successfully.

### Manual Verification

1. **Container Build:**
   Execute `task docker:build` locally to ensure the multi-stage compilation builds without errors and registers the `clible-v3` image.
2. **Local Run & Production Parity:**
   Launch the container with `task docker:run`. Verify that the unified server starts successfully and is reachable at `http://localhost:8080`.
3. **Router & SPA Verification:**
   Navigate directly to `http://localhost:8080/scopes` in a browser. Ensure the browser displays the scopes view rather than a server-side 404 error (verifying the SPA fallback routing).
4. **Rate Limiting Verification:**
   Trigger consecutive search queries rapidly. Verify that after exceeding the token burst limit, the API returns `Too Many Requests - quota exceeded` with HTTP status `429`.
