# PR Story: Diagnostic Logging and GitHub Actions Node 24 Upgrade

## Business Context

We are addressing two main areas in this PR:
1. **Troubleshooting 500 Database Errors:** Resolving runtime `500 Internal Server Error` responses occurring on specific database-reliant endpoints (`GET /api/scopes`, `GET /api/scopes/workspace`, and `GET /api/history`) for pre-existing users (e.g., `mvirtai@proton.me`). We need temporary server-side logging (`slog.Error`) to capture the underlying SQL scan/execution errors.
2. **GitHub Actions Node 24 Migration:** Upgrading workflow actions to Node 24-compliant versions to resolve GitHub Actions deprecation warnings regarding Node 20.

## Architectural Changes

### API Layer (Go)

* **Scope Handler** ([scope_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/scope_handler.go)):
  * Imported `"log/slog"`.
  * Added `slog.Error` calls inside the error handler blocks for `GetScopes` and `GetScopeWorkspace`.
* **History Handler** ([history_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/history_handler.go)):
  * Imported `"log/slog"`.
  * Added `slog.Error` calls inside the error handler block for `GetRecentHistory`.

### CI/CD Infrastructure (GitHub Actions)

* **Node.js Environment Setup:** Upgraded Node.js setup version from `22` to `24`.
* **GitHub Actions Upgrades:** Upgraded all actions in [.github/workflows/ci.yml](file:///home/vivaldev/code/clible-v3-go/.github/workflows/ci.yml) to newer major versions targeting Node 24:
  * `actions/checkout@v4` -> `@v5`
  * `actions/setup-go@v5` -> `@v6`
  * `docker/setup-buildx-action@v3` -> `@v4`
  * `docker/build-push-action@v5` -> `@v6`
  * `docker/login-action@v3` -> `@v4`
  * `google-github-actions/auth@v2` -> `@v3`
  * `google-github-actions/deploy-cloudrun@v2` -> `@v3`

## Testing Strategy

### Automated Tests
* Standard CI lint and compilation tests will run on GitHub Actions for the new branch.

### Manual Verification
* Verified that the backend compiles without issue.
* Verified that the CI workflow builds successfully with Node 24 runner actions without throwing runtime deprecation warnings.
* Once merged to `main`, the CD pipeline will deploy the revision to Cloud Run. We will then trigger the failing endpoints and read the exact error output in GCP Google Cloud Logging to identify and fix the root database issue.
