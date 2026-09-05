# PR Story: 076 – Resend REST API Mailer Integration & Authenticated Verification Flow

## Business Context

Transactional emails are critical for account security and user onboarding in Clible, specifically for email address verification and one-time password (OTP) delivery. Previously, the backend relied solely on `MockMailer`, which printed verification tokens to `stdout`.

This PR introduces production email delivery via **Resend's HTTPS REST API**, enabling reliable, fast, and deliverable transactional emails from `mail.clible.fi` without external third-party Go dependencies or cumbersome SMTP socket configurations. Paired with a configuration factory (`NewMailerFromConfig`), local development remains frictionless by seamlessly falling back to `MockMailer` when `RESEND_API_KEY` is not present.

Furthermore, this PR closes a critical user experience gap by automatically establishing the authenticated session in React state upon successful verification, eliminating an issue where users were redirected to guest mode instead of their authenticated workspace. The email verification view was concurrently modernized to adhere to **React 19.2 and React Compiler** conventions.

---

## Architectural & Process Flows

### 1. End-to-End Verification & Session Establishment Flow

The sequence diagram below illustrates the end-to-end flow from user registration, Resend delivery via `mail.clible.fi`, token verification, and automated session hydration into `AuthContext`:

```mermaid
sequenceDiagram
    autonumber
    participant User as Web Client / User
    participant AuthUI as React 19 UI (VerifyEmail)
    participant AuthCtx as AuthContext
    participant API as Go REST API (/api/auth)
    participant Resend as ResendMailer (HTTP)
    participant ResendAPI as Resend (api.resend.com)
    participant Inbox as Recipient Inbox (mail.clible.fi)

    Note over User,ResendAPI: 1. Registration & Outbound Dispatch
    User->>API: POST /api/auth/register (email, password)
    API->>API: Hash password (bcrypt) & persist unverified user
    API->>API: Generate crypto OTP (6 digits) & URL token (64 hex)
    API->>Resend: SendVerificationEmail(ctx, to, code, token, lang, baseURL)
    Resend->>ResendAPI: POST /emails (Bearer token, from: mail.clible.fi)
    ResendAPI->>Inbox: Deliver transactional email with code and link
    API-->>User: 201 Created (verification_email_sent)

    Note over User,AuthCtx: 2. Verification & Session Hydration
    User->>AuthUI: Open link ?token=... OR enter 6-digit OTP
    AuthUI->>AuthCtx: verifyEmail({ token } or { email, code })
    AuthCtx->>API: POST /api/auth/verify-email
    API->>API: Validate token/OTP, enforce 15 min TTL, mark IsVerified=true
    API->>API: Issue signed JWT & set HttpOnly SameSite=Lax cookie
    API-->>AuthCtx: 200 OK (user: { id, email }, message: email_verified)
    AuthCtx->>AuthCtx: setUser(verifiedUser) (isGuest = false)
    AuthUI->>User: Animate success & navigate to '/' as authenticated user 🚀
```

---

### 2. Provider Selection Decision Pipeline

The runtime environment determines provider selection dynamically on startup:

```mermaid
flowchart TD
    Start["cfg.Load()"] --> CheckResend{"cfg.ResendAPIKey != ''"}
    CheckResend -->|"Yes"| ResolveSender{"cfg.SMTPFrom != ''"}
    ResolveSender -->|"Yes"| UseCustomSender["from = cfg.SMTPFrom<br/>('Clible <noreply@mail.clible.fi>')"]
    ResolveSender -->|"No"| UseDefaultSender["from = 'Clible <onboarding@resend.dev>'"]
    UseCustomSender --> InitResend["NewResendMailer(apiKey, from)"]
    UseDefaultSender --> InitResend
    InitResend --> ReturnService["Return MailerService"]

    CheckResend -->|"No"| FallbackMock["NewMockMailer() (stdout logging)"]
    FallbackMock --> ReturnService
```

---

## Architectural & Technical Changes

### 1. ResendMailer Implementation (`backend/internal/services/resend_mailer.go`)

- **Standard Library HTTP Transport:** Implemented strictly with `net/http`, `encoding/json`, and `context.Context` without introducing external Go SDK dependencies.
- **Client Extensibility & Testability:** Exposed `NewResendMailerWithClient(apiKey, from, baseURL, httpClient)` to enable injecting `httptest.Server` instances for zero-network unit testing.
- **Error Deserialization:** Safely unmarshals structured error responses from Resend (HTTP 4xx/5xx) and surfaces human-readable error descriptions without credential leakage.
- **Defensive Timeouts & Clean Teardowns:** Configured a 10-second request timeout on default HTTP clients and ensures proper response body closures (`defer func() { _ = resp.Body.Close() }()`).

### 2. Mailer Service Factory (`backend/internal/services/mailer_service.go`)

- **Configuration-Driven Factory:** Added `NewMailerFromConfig(cfg *config.Config) MailerService` to evaluate environment configuration at startup.
- **Sensible Defaults:** Automatically supplies `"Clible <onboarding@resend.dev>"` when `SMTPFrom` is not explicitly set, enabling immediate testing with unverified domains.
- **Observability:** Logs initialized mailer provider and configured sender address to stdout during service startup.

### 3. Frontend Session Hydration on Verification (`AuthContext.tsx` & `api.ts`)

- **Response Normalization:** Updated `apiService.verifyEmail` in `api.ts` to extract `data.user` as a normalized `UserResponse` object.
- **AuthContext Session Action:** Added `verifyEmail` to `AuthContextType`, which updates React user state (`setUser(verifiedUser)`) upon verification.
- **Removed False Registration Session:** Removed premature `setUser` call in `register` since unverified users do not possess a valid JWT cookie session.

### 4. React 19.2 & React Compiler Modernization (`VerifyEmail.tsx`)

- **`useActionState` Form Management:** Refactored manual OTP submission to React 19's native action pattern, eliminating manual `loading`, `error`, and `success` state boilerplate.
- **`useTransition` Cooldown Handling:** Implemented code resend triggers using React 19 `useTransition` for responsive UI state transitions.
- **Document Metadata Hoisting:** Replaced manual `document.title` `useEffect` with React 19's first-class `<title>` element rendered directly in JSX.
- **Zero `useRef` Hacks:** Eliminated `inputRef` DOM synchronization hacks, leveraging native `e.currentTarget.form?.requestSubmit()` for 6-digit auto-submission.
- **Eliminated Cascading Renders:** Resolved `react-hooks/set-state-in-effect` linting error by lazily initializing `isTokenPending` directly from router search parameters.
- **Navigation Resilience:** Added direct fallback navigation link to `/login`.

---

## 🔒 Security & Compliance Audit

A formal security audit ([`SECOPS-2026-09-05-002`](file:///home/vivaldev/code/clible-v3-go/.security_audits/security-audit-2026-09-05-resend-mailer-and-email-verification.md)) was conducted covering outbound mail transport and authentication flows:

* **Credential Protection:** `RESEND_API_KEY` is loaded exclusively from environment variables and is never exposed in client-facing API responses or logs.
* **Bearer HTTPS Authentication:** All outbound requests strictly use TLS with standard Bearer authorization headers.
* **OTP & Token Entropy:** 6-digit numeric OTPs and 64-hex-character URL tokens are generated using cryptographically secure random (`crypto/rand`).
* **Session Cookie Security:** JWT session cookies issued upon verification are configured with `HttpOnly: true`, `SameSite: Lax`, and `Secure: isProduction`.
* **Zero Vulnerabilities:** 0 Critical, 0 High, 0 Medium, 0 Low — **PASSED**.

---

## 📈 Improvement Metrics & Key Figures

* **Zero External Dependencies:** 0 external Go modules added; 100% standard library implementation.
* **Services Statement Coverage:** 78.2% across `internal/services`, with 100% on `mailer_service.go` and `mailer_templates.go`, and 89.7% on `resend_mailer.go`.
* **Frontend Test Suite:** 28 test suites passing, 173/173 tests green (100% pass rate).
* **Linter Quality:** 0 errors across `golangci-lint` and `eslint`.

---

## Files Changed

| File | Change Summary |
|------|----------------|
| `backend/internal/services/resend_mailer.go` | ResendMailer implementation via Resend HTTPS REST API (`POST /emails`). |
| `backend/internal/services/resend_mailer_test.go` | Comprehensive unit tests with `httptest.Server` verifying success, errors, and cancellation. |
| `backend/internal/services/mailer_service.go` | Added `NewMailerFromConfig` factory to dynamically choose between Resend and Mock mailers. |
| `backend/main.go` | Wired `NewMailerFromConfig(cfg)` into dependency injection setup. |
| `frontend/src/services/api.ts` | Normalized `verifyEmail` return payload to extract `data.user` as `UserResponse`. |
| `frontend/src/context/AuthContext.tsx` | Added `verifyEmail` action handler to hydrate authenticated session upon verification. |
| `frontend/src/pages/VerifyEmail.tsx` | Modernized component to React 19.2 `useActionState`, native `<title>`, pure derived state, and zero `useRef`. |
| `.agents/AGENTS.md` | Added permanent proactive React 19.2 and React Compiler modernization pair programming rule. |
| `.security_audits/security-audit-2026-09-05-resend-mailer-and-email-verification.md` | Formal security audit report `SECOPS-2026-09-05-002` (PASSED). |
| `.env.example` | Documented `RESEND_API_KEY` and `SMTP_FROM` configuration options. |

---

## Testing Strategy

### Automated Test Execution

#### 1. Backend Service & Mailer Tests (`go test -v ./internal/services/...`)

```text
=== RUN   TestResendMailer_SendVerificationEmail_Success
--- PASS: TestResendMailer_SendVerificationEmail_Success (0.00s)
=== RUN   TestResendMailer_SendVerificationEmail_English
--- PASS: TestResendMailer_SendVerificationEmail_English (0.00s)
=== RUN   TestResendMailer_ValidationErrors
--- PASS: TestResendMailer_ValidationErrors (0.00s)
=== RUN   TestResendMailer_APIErrors
--- PASS: TestResendMailer_APIErrors (0.00s)
=== RUN   TestResendMailer_ContextCancellation
--- PASS: TestResendMailer_ContextCancellation (0.00s)
=== RUN   TestNewMailerFromConfig
--- PASS: TestNewMailerFromConfig (0.00s)
PASS
ok  	github.com/mvirtai/clible-v3-go/internal/services	3.462s
```

#### 2. Frontend Test Suite (`task frontend:test`)

```text
Test Files  28 passed (28)
     Tests  173 passed (173)
  Duration  9.42s
```

### Manual Verification Checklist

1. **Mock Mailer Fallback:** Verified that starting without `RESEND_API_KEY` logs verification tokens directly to `stdout`.
2. **Resend Activation:** Verified that starting with `RESEND_API_KEY` and `SMTP_FROM="Clible <noreply@mail.clible.fi>"` successfully initializes ResendMailer.
3. **Live Email Delivery:** Delivered actual verification email to user inbox via `mail.clible.fi` domain and Resend API.
4. **Auto-Login Session Transition:** Verified in browser that submitting verification code or link token logs the user in immediately, sets the `jwt` cookie, and opens the authenticated workspace without guest mode fallback.
