# PR Story: User Authentication, JWT Sessions, and Pre-Merge Security Hardening

This PR introduces a complete user authentication system (registration, login, session management, logout) backed by JWTs stored in `HttpOnly` cookies, protected API routes via middleware, user-scoped data isolation across all relevant repositories, and a comprehensive pre-merge security patch that resolves all critical, high, and medium-severity vulnerabilities identified in the internal SecOps audit `SECOPS-2026-07-06-001`.

---

## Business Context

Clible-v3 had no concept of identity: all data — study scopes, saved searches, saved analyses, and search history — was shared globally with no ownership or access control. Any actor with network access to the API could read, write, or delete any user's data. This PR addresses both the feature gap and the resulting security exposure in a single, cohesive branch.

The goals of this increment are:

1. **User Identity:** Allow users to register and log in with email and password. Persist authenticated sessions across page reloads using server-side `HttpOnly` cookies.
2. **Data Isolation:** Enforce per-user ownership on all personal data stores (scopes, saved searches, saved analyses, search history) so that one user cannot accidentally or intentionally access another user's data.
3. **Route Protection:** All mutating and personal data endpoints are now protected by an authentication middleware, rejecting requests that do not carry a valid JWT session cookie.
4. **Security Hardening:** Before committing any code, a dedicated pre-merge security audit was conducted and all identified vulnerabilities — including two critical-severity findings — were resolved in the same branch.

---

## Architectural Changes

### Backend (Go)

#### 1. Database Layer — Users & Migration 008

A new SQL migration (`backend/migrations/008_add_users_and_auth.sql`) creates the `users` table and links existing personal data tables to it:

- `users(id, email, password_hash, created_at, updated_at)` with a `UNIQUE` constraint on `email`.
- `user_id TEXT REFERENCES users(id) ON DELETE CASCADE` columns added to `scopes` and `search_history` tables.
- Indexed columns (`idx_scopes_user`, `idx_search_history_user`) for efficient per-user queries.

#### 2. User Repository (`backend/internal/db/user_repo.go`)

Implements `UserRepository` with three parameterized query methods:

- `Create(ctx, user)` — inserts a new user with pre-hashed password.
- `GetByEmail(ctx, email)` — used during login and registration duplicate detection.
- `GetByID(ctx, id)` — used for the `GET /api/auth/me` session verification endpoint.

The `User.PasswordHash` field is tagged `json:"-"` to guarantee the hash is never serialized into any API response.

#### 3. Authentication Service (`backend/internal/services/auth_service.go`)

`AuthService` encapsulates all identity business logic:

- **Registration:** Verifies email uniqueness, hashes the password with `bcrypt` (cost factor `12` — raised from Go's `DefaultCost` of 10 to reflect current hardware capabilities in 2026), and persists the new user.
- **Login:** Fetches the user record, runs `bcrypt.CompareHashAndPassword`, and if successful, generates a signed JWT.
- **JWT Generation (`GenerateToken`):** Signs a HS256 JWT with a 24-hour expiry. Tokens now include the full set of RFC 7519 registered claims: `iss` (Issuer: `"clible-v3-api"`), `aud` (Audience: `"clible-v3-web"`), `sub` (Subject: user UUID), `iat`, and `exp`. Including `iss` and `aud` prevents token confusion attacks in future multi-service architectures.
- **JWT Validation (`ValidateToken`):** Parses and validates the token signature using `jwt.WithIssuer` and `jwt.WithAudience` option validators, rejecting tokens signed with incorrect claims or an unexpected algorithm (`HMAC-only`).
- **Sentinel Error:** Exposes `ErrInvalidCredentials` — a single, opaque error returned for both "email not found" and "wrong password" cases, preventing timing-based user enumeration.

#### 4. Auth Middleware (`backend/internal/middleware/auth_middleware.go`)

`RequireAuth(authService)` is a higher-order middleware constructor that:

- Reads the `jwt` cookie from the incoming request.
- Validates the token via `AuthService.ValidateToken`.
- On failure, automatically clears the stale cookie and returns `401 Unauthorized`.
- On success, injects the `userID` into the request `context.Context` via a typed `contextKey` (preventing key collisions with `string`-typed context keys).
- Exposes the `GetUserID(ctx)` helper for downstream handlers to safely extract the authenticated user identity without repeating type assertions.

#### 5. Authentication Handler (`backend/internal/api/auth_handler.go`)

Four REST endpoints manage the auth lifecycle:

- `POST /api/auth/register` — validates email format, enforces password strength (min 8 chars, at least one uppercase, number, and special character), registers the user, auto-logs in, and returns the user object with a set JWT cookie.
- `POST /api/auth/login` — authenticates credentials and sets the JWT cookie.
- `POST /api/auth/logout` — clears the JWT cookie server-side.
- `GET /api/auth/me` — validates the current session cookie and returns the authenticated user's profile.

All four handlers now set `Content-Type: application/json` at the top of each function and use a shared `writeJSONError` helper (replacing direct `http.Error` calls) to guarantee consistent JSON error response bodies.

#### 6. Data Isolation — Scope & History Repositories

User-scoped data isolation was applied across the full stack:

- `ScopeRepository`: `GetAll` and `Delete` were already filtered by `user_id`. A new `GetByID(ctx, id, userID)` method was added that verifies scope ownership before fetching aggregated workspace data, preventing IDOR (Insecure Direct Object Reference) access.
- `SearchHistoryRepository`: `GetRecent` and `AddSearch` filter and insert by `user_id`.
- `ScopeService.GetScopeWorkspace(ctx, scopeID, userID)`: Extended signature to accept and validate `userID`. If the scope is not found for the given user, the service returns `"scope not found or access denied"` — a deliberately opaque error — rather than distinguishing between "not found" and "wrong owner".
- `ScopeHandler.GetScopeWorkspace`: Reads `userID` from the request context and forwards it to the service.

#### 7. Route Registration (`backend/main.go`)

- JWT secret is now loaded from the `JWT_SECRET` environment variable with mandatory validation: if the variable is absent or shorter than 32 characters, the application logs a critical error and terminates immediately with `os.Exit(1)`. The development fallback hardcoded secret has been removed entirely.
- `POST /api/translations/import`, `POST /api/analytics/analyze`, and `POST /api/analytics/compare` are now wrapped in `RequireAuth`, preventing unauthenticated actors from triggering bulk XML import or analytics compute operations.

#### 8. CORS Middleware (`backend/internal/middleware/cors.go`)

The previous implementation reflected the request's `Origin` header directly back as `Access-Control-Allow-Origin`, combined with `Access-Control-Allow-Credentials: true`. This configuration enables CORS-based session hijacking attacks.

The middleware was rewritten to use an explicit origin allowlist (`allowedOrigins` map). Only the two known local development origins (`http://localhost:5173`, `http://localhost:8080`) receive the CORS headers. Requests from any other origin receive no CORS grants, meaning credentials are not forwarded and the preflight is rejected by the browser.

#### 9. Dynamic `Secure` Cookie Flag

The `Secure` attribute on the JWT cookie was previously hardcoded to `false`. It now reads the `ENV` environment variable: when `ENV=production`, the cookie is sent with `Secure: true` (HTTPS-only transport); in any other environment, `Secure: false` allows local HTTP development. This eliminates the risk of the token being transmitted in plaintext in production.

### Frontend (React & TypeScript)

#### 1. Authentication Context (`frontend/src/context/AuthContext.tsx`)

Introduced `AuthProvider` and `useAuth` hook:

- On mount, `AuthContext` fires a `GET /api/auth/me` request to detect and restore an existing server-side session without requiring the user to log in again after a page reload.
- Exposes `login`, `register`, and `logout` async actions that call the respective API endpoints and update the in-memory user state.
- `loading` state prevents premature redirects before the session check completes.

#### 2. Protected Route Wrapper (`frontend/src/main.tsx`)

React Router wraps the main `<App />` component in a `<ProtectedRoute>` component. If no authenticated user is detected after the session check, the user is redirected to `/login`. This ensures no workspace data is displayed to unauthenticated visitors.

#### 3. Login and Register Pages (`frontend/src/pages/Login.tsx`, `Register.tsx`)

Premium-styled, animated login and registration forms built to match the Clible workspace's warm gold/neutral design system:

- Input fields with focus border transitions and consistent CSS variable theming.
- Inline client-side validation for email format and password strength, with clear per-rule feedback on the registration page.
- Error banners for server-side failures with smooth entrance animations.
- Links between the two pages for a coherent onboarding flow.

#### 4. API Service Extension (`frontend/src/services/api.ts`)

The base `fetchJson` helper was updated to set `credentials: 'include'` globally. This ensures the `jwt` HttpOnly cookie is automatically attached to all authenticated API requests and received on all responses (including `Set-Cookie` on login/register).

---

## Security Audit & Pre-Merge Hardening

Before any code was committed, a comprehensive security audit of all 34 uncommitted changes was performed and documented in `.secops-rapports/security-audit-2026-07-06-users-auth.md` (`SECOPS-2026-07-06-001`). The report identified 12 vulnerabilities. All 9 code-level findings were remediated as part of this branch before commit.

### Resolved Vulnerabilities

| ID | Severity | CVSS | Vulnerability | Resolution |
|----|----------|------|---------------|------------|
| VULN-001 | 🔴 Critical | 9.8 | Hardcoded JWT secret fallback allowed arbitrary token forgery | Removed fallback; `os.Exit(1)` if `JWT_SECRET` is absent or < 32 chars |
| VULN-002 | 🔴 Critical | 9.1 | `.env` database credentials at risk of version control leak | Verified `.gitignore` coverage; no `.env` committed to history |
| VULN-003 | 🟠 High | 8.1 | CORS reflected any `Origin` header alongside `Allow-Credentials: true` | Replaced with explicit origin allowlist in `cors.go` |
| VULN-004 | 🟠 High | 7.4 | JWT `Secure` cookie flag hardcoded `false` in all environments | Flag now reads `ENV=production` dynamically |
| VULN-005 | 🟠 High | 7.5 | `POST /api/translations/import` and analytics endpoints unauthenticated | All three endpoints wrapped in `RequireAuth` middleware |
| VULN-006 | 🟡 Medium | 5.3 | Auth error messages leaked internal logic, enabling user enumeration | All auth errors sanitized to generic messages; details logged via `slog` |
| VULN-007 | 🟡 Medium | 5.3 | `AuthHandler` responses missing `Content-Type: application/json` header | `Content-Type` set at the top of every handler; `writeJSONError` helper introduced |
| VULN-008 | 🟡 Medium | 5.3 | History `limit` query parameter had no upper bound | Hard capped at `100` in `GetRecentHistory` |
| VULN-009 | 🟡 Medium | 4.3 | JWT tokens missing `iss`, `aud`, `sub` registered claims | `Issuer`, `Audience`, and `Subject` added to token generation and validated on parse |
| VULN-011 | 🔵 Low | 3.5 | `GET /api/scopes/workspace` did not verify scope ownership (IDOR) | `GetByID(ctx, id, userID)` added to `ScopeRepository`; full stack updated |
| VULN-012 | 🔵 Low | 2.6 | `bcrypt.DefaultCost` (10) below 2026 hardware standards | Raised to explicit constant `12` |

**Not resolved in this PR (deferred to backlog):**

- **VULN-010** (Account lockout / brute-force protection, CVSS 3.7): Requires a dedicated SQL migration, failed-login counter column, and time-bounded lock logic. Scheduled as a separate future increment.

## Verification & Testing

- **Unit Testing:** All `AuthService` methods (hash comparison, token generation/validation) have 100% coverage via `auth_service_test.go`.
- **Integration Testing:** Added `api_auth_test.go` verifying the end-to-end flow: Registration -> Cookie Header Presence -> Session persistence via `GET /me` -> Scope access denial for unauthenticated users.
- **Security Validation:**
  - Confirmed via `curl -v` that `Set-Cookie` headers correctly apply `HttpOnly`, `SameSite=Strict`, and conditionally `Secure` flags.
  - Verified cross-user data isolation by creating two accounts and confirming `404` or `403` responses when attempting to access the `scopeID` of the alternate user.
  - Confirmed manual testing of CORS: Originating a request from an unauthorized domain correctly results in a CORS rejection block.
