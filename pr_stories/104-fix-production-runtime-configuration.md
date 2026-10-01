# PR Story: Harden Production Runtime Configuration

## Context

Cloud Run's Terraform configuration did not declare the production environment, public application URL, or transactional email provider. The service could consequently use non-secure authentication cookies, generate localhost verification links, and silently fall back to a mock mailer that logs verification codes instead of delivering email.

The deployment now describes these production requirements explicitly. A production startup guard prevents the service from starting if email delivery or the public verification URL is not configured. Terraform provisions the Resend secret and grants Cloud Run access to it. The verified sender address is also managed by Terraform so later applies preserve the working email configuration instead of removing it as unmanaged drift.

## Implementation

- Set Cloud Run `ENV=production`, `APP_BASE_URL`, and `SMTP_FROM`.
- Store `RESEND_API_KEY` in Secret Manager and expose it to Cloud Run through a secret reference with service-account access.
- Fail startup in production when the Resend key is missing or `APP_BASE_URL` is the localhost fallback; development and test behavior remains unchanged.
- Add tests for production rejection and non-production acceptance.
- Document production Terraform inputs in `terraform.tfvars.example`. The example contains placeholders only for secret values.

## Files Changed

| File | Change |
|------|--------|
| `backend/internal/config/config.go` | Added production configuration validation and centralized the localhost URL default. |
| `backend/internal/config/config_test.go` | Covered invalid and valid production settings and non-production compatibility. |
| `backend/main.go` | Reject invalid production configuration before database/service initialization. |
| `terraform/main.tf` | Configure production environment, public URL, sender address, and Secret Manager-backed Resend access. |
| `terraform/variables.tf` | Added app URL, sender address, and sensitive Resend key inputs. |
| `terraform/terraform.tfvars.example` | Documented the canonical URL, verified sender address, and secret placeholder. |
| `pr_stories/104-fix-production-runtime-configuration.md` | Recorded the production risks, implementation, and verification. |

## Verification

- `cd backend && go test ./...` — passed.
- `task backend:check` — passed (module tidy, lint, and backend coverage tests).
- `terraform -chdir=terraform validate` — passed.
- Production email delivery and the verification link were manually verified at `https://clible.fi`.
- Cloud Run configuration was manually checked for `ENV=production`, `APP_BASE_URL=https://clible.fi`, `SMTP_FROM`, and the Secret Manager reference for `RESEND_API_KEY`.
- Chrome DevTools showed the `jwt` cookie with `Secure` and `HttpOnly` enabled.

## Deployment Notes

Set `app_base_url` to the canonical public HTTPS URL and provide a valid `resend_api_key` through a protected Terraform input mechanism. Terraform state contains the initialized secret value and must be protected accordingly. The sender address must belong to a domain verified with Resend. Do not deploy with the example secret placeholders.
