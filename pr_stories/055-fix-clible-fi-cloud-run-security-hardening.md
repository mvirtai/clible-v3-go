# PR Story: Cloud Run Security Hardening & HTTP Security Headers (`clible.fi`)

## Business Context

As part of the domain migration and production launch for `clible.fi` on Google Cloud Run, a comprehensive security audit (`SECOPS-2026-08-06-001`) was conducted to evaluate API security, CORS policies, rate limiting under GCP load balancers, and AI payload controls.

This PR implements the security remediations identified during the audit, ensuring that the REST API runs securely in production behind Cloud Run reverse proxies while safeguarding AI token budgets and enforcing strong client-side HTTP security headers.

---

## Architectural & Security Changes

### 1. Production CORS Domain Alignment (`backend/internal/middleware/cors.go`)

* Added `https://clible.fi` and `https://www.clible.fi` to the `allowedOrigins` whitelist map.
* Ensures cross-origin requests from the React frontend running on `clible.fi` are permitted while preventing unauthorized third-party cross-origin origin access.

### 2. Reverse-Proxy-Aware IP Rate Limiting (`backend/internal/middleware/ratelimit.go`)

* Updated `getClientIP` in `RateLimitMiddleware` to inspect the `X-Forwarded-For` header (extracting the leading IP address in comma-separated chains).
* Prevents the global rate limiter from treating Google Cloud Load Balancer / Cloud Run proxy IPs as a single client, avoiding global quota lockouts across all active users.

### 3. AI Endpoint Payload & Input Length Hardening (`backend/internal/api/ai_handler.go`)

* Wrapped HTTP request bodies across all Gemini AI handlers (`/insight`, `/tone`, `/deep-dive`, `/original-study`, `/search`, `/compare`) with `http.MaxBytesReader(w, r.Body, 100*1024)` to bound maximum incoming payload sizes to 100 KB.
* Enforced input string validation (`len <= 15000` characters) to prevent memory exhaustion and excessive token usage spikes.

### 4. HTTP Security Headers Middleware (`backend/internal/middleware/security_headers.go` & `backend/main.go`)

* Created `SecurityHeaders` middleware and registered it in `main.go` to inject modern browser defense headers into every HTTP response:
  * `X-Content-Type-Options: nosniff`
  * `X-Frame-Options: DENY`
  * `X-XSS-Protection: 1; mode=block`
  * `Referrer-Policy: strict-origin-when-cross-origin`
  * `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)

---

## Testing Strategy & Verification

* **Unit Testing**:
  * Added `TestSecurityHeaders` in `backend/internal/middleware/middleware_test.go` to verify header injection across HTTP request lifecycles.
* **Local Verification**:
  * Executed full quality check suite (`task check`), confirming all backend unit tests pass, linter checks pass, and code coverage remains high.
  * Verified Go binary compilation (`task backend:build`).
