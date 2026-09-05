# Pull Request Story: 077 – Fix Sitemap and SEO Canonical Domain (`clible.fi`)

## Overview & Business Context

During an SEO audit and Google Search Console indexing review for `clible.fi`, a domain mismatch was discovered across frontend SEO artifacts and crawl directives. The static `sitemap.xml`, `robots.txt`, and `index.html` canonical/Open Graph tags were referencing the internal Google Cloud Run default hostname (`https://clible-v3-421720438581.europe-north1.run.app/`) instead of the official production domain (`https://clible.fi/`).

Furthermore, the guest mode URL was using the Finnish path `/vierailija-yleinen`, whereas all other application routes (`/login`, `/register`, `/verify-email`) adhere to English URL naming conventions.

This pull request aligns all SEO metadata and routing with the production domain `https://clible.fi/` and migrates the guest mode entrypoint to `/guest` while preserving complete backward compatibility for legacy links.

---

## Architectural & System Changes

### 1. SEO & Crawl Directive Alignment (`clible.fi`)

- **[sitemap.xml](file:///home/vivaldev/code/clible-v3-go/frontend/public/sitemap.xml):** Replaced Cloud Run host URLs with `https://clible.fi/` for all indexed endpoints and updated `lastmod` timestamps to `2026-09-05`.
- **[robots.txt](file:///home/vivaldev/code/clible-v3-go/frontend/public/robots.txt):** Updated `Sitemap:` directive to `https://clible.fi/sitemap.xml` and added `Allow: /guest`.
- **[index.html](file:///home/vivaldev/code/clible-v3-go/frontend/index.html):** Aligned `<link rel="canonical">`, `og:url`, `og:image`, `twitter:image`, and Schema.org JSON-LD `url` to `https://clible.fi/`. Enhanced `title`, `meta description`, Open Graph tags, Schema.org JSON-LD, and `<noscript>` sections with bilingual (FI + EN) copy and accessibility attributes (`lang="fi"`, `lang="en"`).

### 2. URL Internationalization (`/guest`) & Backward Compatibility

- **[main.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/main.tsx):** Added `/guest` route rendering the main workspace and wired a client-side redirect `<Navigate to="/guest" replace />` for the legacy `/vierailija-yleinen` path.
- **[Login.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/pages/Login.tsx) & [Register.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/pages/Register.tsx):** Updated guest navigation links to point to `/guest`.
- **[index.html](file:///home/vivaldev/code/clible-v3-go/frontend/index.html):** Updated `<noscript>` fallback navigation anchor to point to `/guest` across both language sections.

---

## Files Changed

| File | Change Summary |
|------|----------------|
| `frontend/public/sitemap.xml` | Updated domain to `https://clible.fi/`, updated guest route to `/guest`, updated `lastmod` |
| `frontend/public/robots.txt` | Updated Sitemap URL to `https://clible.fi/sitemap.xml`, added `Allow: /guest` |
| `frontend/index.html` | Updated canonical URL, Open Graph, Twitter, Schema.org, and bilingual noscript section |
| `frontend/src/main.tsx` | Added `/guest` route and backward-compatible redirect `/vierailija-yleinen` -> `/guest` |
| `frontend/src/pages/Login.tsx` | Updated guest link destination to `/guest` |
| `frontend/src/pages/Register.tsx` | Updated guest link destination to `/guest` |
| `pr_stories/077-fix-sitemap-and-seo-canonical-domain.md` | PR story documentation |

---

## Testing Strategy & Metrics

### Automated Backend Tests

Backend tests and statement coverage were verified via `task backend:test-cov`:

```text
github.com/mvirtai/clible-v3-go/internal/services/ai_service.go:287:		GetInsight			87.5%
github.com/mvirtai/clible-v3-go/internal/services/ai_service.go:324:		GetTone				87.5%
github.com/mvirtai/clible-v3-go/internal/services/ai_service.go:361:		DeepDive			81.8%
github.com/mvirtai/clible-v3-go/internal/services/ai_service.go:407:		OriginalStudy			92.3%
github.com/mvirtai/clible-v3-go/internal/services/ai_service.go:524:		AISearch			83.6%
github.com/mvirtai/clible-v3-go/internal/services/ai_service.go:669:		GetComparison			81.8%
github.com/mvirtai/clible-v3-go/internal/services/auth_service.go:34:		NewAuthService			100.0%
github.com/mvirtai/clible-v3-go/internal/services/verse_service.go:50:		GetVerses			71.0%
github.com/mvirtai/clible-v3-go/internal/services/verse_service.go:115:		SearchVerses			60.0%
total:										(statements)			78.0%
```

### Automated Frontend Tests

Frontend production build and Vitest suite executed cleanly:

```text
 ✓ built in 1.54s
dist/index.html                     5.00 kB │ gzip:   1.95 kB
dist/assets/index-DzRO_sV7.css     70.16 kB │ gzip:  12.47 kB
dist/assets/index-BnOt94Yd.js   1,090.71 kB │ gzip: 318.80 kB

 Test Files  28 passed (28)
      Tests  173 passed (173)
   Duration  9.36s
```
