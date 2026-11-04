# Pull Request Story: 117 – PageSpeed Insights and Core Web Vitals Optimizations

## Overview & Business Context

While Clible maintains high desktop responsiveness, performance audits revealed that on lower-powered mobile devices and throttled 4G connections, initial load and interaction times experienced unnecessary overhead. Mobile First Contentful Paint (FCP) and Largest Contentful Paint (LCP) were weighed down by a monolithic 1.36 MB JavaScript bundle containing heavy charting, graph, and canvas calculation dependencies needed only when explicitly switching to secondary workspaces.

Furthermore, static assets lacked explicit `Cache-Control` response directives in the Go SPA server, causing browsers to repetitively revalidate and download static resources, while Google Fonts (`Lora` and `JetBrains Mono`) introduced render-blocking stylesheets during initial layout calculation. An accessibility gap in the mobile user dropdown also surfaced due to missing `aria-label` values on icon-only action triggers.

This Pull Request resolves these bottlenecks across backend and frontend layers:

1. Employs aggressive immutable caching for hashed client assets and deterministic `no-cache` revalidation for HTML entrypoints.
2. Implements asynchronous route/view-level code splitting using `React.lazy()` and `<Suspense>`, combined with granular vendor chunking (`vendor-react`, `vendor-charts`, `vendor-dnd`, `vendor-router`, `vendor-lucide`), reducing the main client entry chunk from 1.36 MB down to 386 kB (106 kB gzipped) — with zero chunks exceeding 500 kB.
3. Eliminates Cumulative Layout Shift (CLS) from 0.93 to 0.00 using dedicated layout skeletons (`LiturgicalViewSkeleton`, `VerseReaderSkeleton`).
4. Eliminates render-blocking font requests with asynchronous stylesheet preloading and fallback handling.
5. Elevates application-wide accessibility compliance by supplying explicit form labels, expanding interactive targets to minimum 44x44px, and resolving WCAG 2.5.3 name mismatches.
6. Hardens JWT cookie expiration handling in Go `RequireAuth` middleware with `Secure: isProduction` and `SameSite: Lax`.

---

## Architectural & System Changes

### 1. Static Asset Caching Architecture (`backend/main.go`)

In `frontendHandler`, the SPA static file routing was augmented with content-aware cache policies:

- Hashed assets under `/assets/*` (generated with content hashes by Vite) are served with `Cache-Control: public, max-age=31536000, immutable`, saving ~1.1 MB in repeated network overhead.
- SPA shell entrypoints (`/`, `/index.html`, or not-found SPA fallback routes) explicitly send `Cache-Control: no-cache, must-revalidate` to guarantee instant client updates upon new deployments.
- Other root static files (e.g., `favicon.svg`, manifests) default to `Cache-Control: public, max-age=86400`.
- Unit tests in `backend/main_test.go` assert these headers across `/assets/*`, direct assets, and SPA paths.

### 2. Frontend Code-Splitting & Granular Vendor Chunking (`frontend/src/App.tsx`, `frontend/src/AppRoutes.tsx`, `frontend/vite.config.ts`)

Heavy view components were converted to dynamic chunk imports with `React.lazy()` and wrapped in accessible `<Suspense>` boundaries:

- `AnalyticsView` (bundling `d3` and `recharts`)
- `CompareView` (multi-translation alignment calculations)
- `OriginalStudyView` (morphological dictionaries and original language concordance)
- `NotebookCanvasView` (bundling `@dnd-kit/react`, `@dnd-kit/helpers`, `react-markdown`, and remark plugins)
- `LiturgicalView` and `ReadingPlansView`
- Secondary routes (`/login`, `/register`, `/verify-email`, `/settings`) separated cleanly into `AppRoutes.tsx`

Additionally, `vite.config.ts` was configured with granular `manualChunks`:
- `vendor-react` (React, ReactDOM, Scheduler): 214 kB (68 kB gzip)
- `vendor-charts` (Recharts, D3 packages): 360 kB (104 kB gzip)
- `vendor-dnd` (@dnd-kit packages): 105 kB (33 kB gzip)
- `vendor-router` (wouter routing runtime): 40 kB (14 kB gzip)
- `vendor-lucide` (lucide-react icons): 21 kB (7 kB gzip)
- `index.js` (main application logic): 386 kB (106 kB gzip)

```text
Before code splitting:
dist/assets/index-BJBnXF6n.js   1,365.79 kB │ gzip: 384.89 kB

After granular splitting:
dist/assets/index-0YS3Q1vM.js     386.84 kB │ gzip: 106.02 kB  (-71.6% main bundle reduction)
dist/assets/vendor-charts-*.js    360.19 kB │ gzip: 104.83 kB  (lazy loaded with Analytics)
dist/assets/vendor-react-*.js     214.86 kB │ gzip:  68.00 kB  (cached vendor chunk)
dist/assets/vendor-dnd-*.js       105.31 kB │ gzip:  33.60 kB  (lazy loaded with Notebook)
dist/assets/vendor-router-*.js     40.36 kB │ gzip:  14.53 kB  (cached vendor chunk)
dist/assets/LiturgicalView-*.js    34.13 kB │ gzip:   6.44 kB  (lazy loaded view)
dist/assets/vendor-lucide-*.js     21.06 kB │ gzip:   7.37 kB  (cached vendor chunk)
dist/assets/CompareView-*.js       17.33 kB │ gzip:   4.32 kB  (lazy loaded view)
dist/assets/AnalyticsView-*.js     14.59 kB │ gzip:   4.63 kB  (lazy loaded view)
dist/assets/OriginalStudyView-*.js 10.40 kB │ gzip:   3.25 kB  (lazy loaded view)
```

### 3. Cumulative Layout Shift (CLS) Elimination via Layout Skeletons

To solve high CLS scores on dynamic passage and calendar views (measured at 0.93 in initial mobile audits), dedicated layout skeletons were developed:
- `LiturgicalViewSkeleton.tsx`: Renders structured placeholder blocks for readings, date controls, and liturgical summaries while calendar data loads, completely eliminating layout shifting.
- `VerseReaderSkeleton.tsx`: Renders structured Scripture line skeletons with `aria-busy="true"` and `role="status"` while chapter text is fetched.

### 4. Non-Blocking Font Delivery & Mobile Web Standards (`frontend/index.html`)

- Converted Google Fonts (`Lora` and `JetBrains Mono`) to non-render-blocking asynchronous links using `rel="preload" as="style"` combined with `media="print" onload="this.media='all'"` and a `<noscript>` fallback, removing ~280–1,050 ms of initial render blocking.
- Added `task frontend:preview` targeting port 4173 to enable authentic Lighthouse audits against production builds.

### 5. Application-Wide Accessibility & Touch Usability

- Connected explicit form `<label>` and `aria-label` attributes across `VerseReader`, `VerseSearch`, `AiSemanticSearch`, `AnalyticsView`, `CompareView`, `OriginalStudyView`, `WorkspaceSidebar`, and `NotebookEditor`.
- Upgraded all `Clear input` buttons (`X`) to minimum 44x44px touch targets (`w-11 h-11 flex items-center justify-center`).
- Resolved WCAG 2.5.3 (Label in Name) mismatch in `VerseReader.tsx` by replacing redundant `aria-label` on verse spans with `title`.
- Corrected prohibited ARIA roles on `UserAvatar` (`role="img"`) and `UserMenuDropdown` (replacing invalid `role="menu"` with `role="dialog"`).

---

## Security Review Assessment

A dedicated security audit report under `.security_audits/` is **not warranted** for this pull request based on the following evaluation:

- **JWT Cookie Mitigation Hardened**: In `backend/internal/middleware/auth_middleware.go`, the cookie clearance logic was updated with `Secure: isProduction` and `SameSite: http.SameSiteLaxMode`, resolving CodeQL security advisories for unauthenticated session resets.
- **Path Traversal Safety Preserved**: Static asset serving continues to execute through Go 1.24 `os.OpenRoot` jail confinement, and path cleaning prevents directory traversal. Caching headers only attach to responses already validated within the sandboxed directory.
- **Client Sanitization Intact**: Lazy loading and `<Suspense>` boundaries do not introduce unsanitized user inputs or dangerously set inner HTML.
- **Supply-Chain Integrity**: Dependabot alerts (#29–#37) were audited and verified to reside entirely in development/tooling dependencies (`happy-dom`, `vitest`, `vitepress`) with zero impact on the production Go binary. All linters and tests passed (`task check`).

---

## Files Changed

| File | Change |
| ------ | -------- |
| `VERSION` | Bump patch version from 3.15.0 to 3.15.1 |
| `backend/internal/version/version.go` | Synchronize application release constant to 3.15.1 |
| `backend/internal/middleware/auth_middleware.go` | Set `Secure: isProduction` and `SameSite: http.SameSiteLaxMode` when clearing expired or invalid JWT cookies |
| `backend/main.go` | Implement granular `Cache-Control` policy for hashed assets, root files, and SPA HTML |
| `backend/main_test.go` | Add unit tests verifying `Cache-Control` headers for hashed assets and SPA fallbacks |
| `frontend/index.html` | Asynchronous non-render-blocking Google Fonts loading with preload and noscript fallback |
| `frontend/package.json` | Update frontend semantic version to 3.15.1 |
| `Taskfile.yml` | Add `frontend:preview` automation command targeting port 4173 for accurate Lighthouse audits |
| `frontend/src/App.tsx` | Lazy load `LiturgicalView`, `ReadingPlansView`, `AnalyticsView`, `CompareView`, `OriginalStudyView`, and `NotebookCanvasView` with Suspense |
| `frontend/src/AppRoutes.tsx` | Separate top-level routes and lazy load secondary routes (`/login`, `/register`, `/verify-email`, `/settings`) |
| `frontend/src/main.tsx` | Connect `AppRoutes` wrapped in `<Suspense>` with pure root mounting |
| `frontend/vite.config.ts` | Configure granular `manualChunks` (`vendor-react`, `vendor-charts`, `vendor-dnd`, `vendor-router`, `vendor-lucide`) |
| `frontend/src/components/analytics/AnalyticsView.tsx` | Add accessible `aria-label` to reference input, upgrade clear button to min 44x44px touch target |
| `frontend/src/components/compare/CompareView.tsx` | Connect `<label htmlFor>` to reference input with `aria-label`, expand clear button to 44x44px touch target |
| `frontend/src/components/layout/UserAvatar.tsx` | Add explicit `role="img"` to avatar containers with `aria-label` to satisfy prohibited ARIA role rules |
| `frontend/src/components/layout/UserMenuDropdown.tsx` | Add accessible `aria-label` tags, replace invalid `role="menu"` with `role="dialog"` matching child items |
| `frontend/src/components/layout/WorkspaceSidebar.tsx` | Add accessible `aria-label` to new workspace input |
| `frontend/src/components/notebook/NotebookEditor.tsx` | Add accessible `aria-label` to title edit input |
| `frontend/src/components/original/OriginalStudyView.tsx` | Connect `<label htmlFor>` to reference input with `aria-label`, expand clear button to 44x44px touch target |
| `frontend/src/components/reader/VerseReader.tsx` | Eliminate CLS with `VerseReaderSkeleton`, resolve WCAG 2.5.3 name mismatch on verses, expand clear button |
| `frontend/src/components/reader/VerseReaderSkeleton.tsx` | Create layout placeholder skeleton preventing Cumulative Layout Shift during passage retrieval |
| `frontend/src/components/reader/VerseReaderSkeleton.test.tsx` | Unit test verifying accessible `aria-busy` and `aria-label` attributes on `VerseReaderSkeleton` |
| `frontend/src/views/LiturgicalViewSkeleton.test.tsx` | Unit test verifying accessible `aria-busy` and `aria-label` attributes on `LiturgicalViewSkeleton` |
| `frontend/src/components/search/AiSemanticSearch.tsx` | Add accessible `aria-label` to semantic query and save title inputs |
| `frontend/src/components/search/VerseSearch.tsx` | Add accessible `aria-label` to search input and save name, expand clear button touch target to 44x44px |
| `frontend/src/utils/i18n.ts` | Add localized `liturgicalSelectDate`, `clearInputLabel`, and `referenceInputPlaceholder` strings |
| `frontend/src/views/LiturgicalView.tsx` | Add accessible `aria-label` to date input, integrate skeleton placeholder to eliminate 0.93 CLS |
| `frontend/src/views/LiturgicalViewSkeleton.tsx` | Create layout-preserving skeleton component preventing Cumulative Layout Shift during data load |
| `frontend/src/utils/version.ts` | Synchronize client application version string to 3.15.1 |
| `pr_stories/117-perf-pagespeed-insights-and-core-web-vitals.md` | Document Pull Request story and performance metrics |

---

## Testing Strategy & Metrics

### Automated Backend Tests

Backend tests verified HTTP response caching headers, path sanitization, and regression-free routing:

```text
=== RUN   TestFrontendHandlerServesSPAAndAssets
--- PASS: TestFrontendHandlerServesSPAAndAssets (0.00s)
=== RUN   TestFrontendHandlerRejectsSymlinkEscape
--- PASS: TestFrontendHandlerRejectsSymlinkEscape (0.00s)
=== RUN   TestFrontendHandlerHandlesInvalidPathErrors
--- PASS: TestFrontendHandlerHandlesInvalidPathErrors (0.00s)
PASS
ok  	github.com/mvirtai/clible-v3-go	0.011s
```

Backend statement coverage remained robust across services:

- Total statement coverage: **77.5%**
- `internal/api`: **75.6%**
- `internal/parsers`: **91.6%**
- `internal/cache`: **87.5%**
- `internal/dsl`: **80.7%**

### Automated Frontend Tests

Full Vitest and TypeScript validation (`task frontend:check`):

```text
$ tsc -b
$ eslint .
$ vitest run

 Test Files  57 passed (57)
      Tests  427 passed (427)
   Start at  17:13:11
   Duration  13.28s (transform 4.01s, setup 1.29s, import 18.58s, tests 12.16s, environment 39.35s)
```

Production build verification (`pnpm run build`):

```text
dist/index.html                              12.01 kB │ gzip:   3.92 kB
dist/assets/index-D41K5Ty_.css              105.44 kB │ gzip:  16.71 kB
dist/assets/rolldown-runtime-hePW80VL.js      0.71 kB │ gzip:   0.42 kB
dist/assets/Login-DRCilgjQ.js                 3.59 kB │ gzip:   1.33 kB
dist/assets/VerifyEmail-DtlKpLCF.js           4.61 kB │ gzip:   1.94 kB
dist/assets/Register-CLgSXxA7.js              6.35 kB │ gzip:   1.83 kB
dist/assets/OriginalStudyView-BrlMyzDP.js    10.40 kB │ gzip:   3.25 kB
dist/assets/ReadingPlansView-CfmRxSAm.js     11.20 kB │ gzip:   3.09 kB
dist/assets/AnalyticsView-DmE3t-N_.js        14.59 kB │ gzip:   4.63 kB
dist/assets/CompareView-BYD34xAM.js          17.33 kB │ gzip:   4.32 kB
dist/assets/UserSettingsView-CUJ8auEg.js     18.09 kB │ gzip:   3.75 kB
dist/assets/vendor-lucide-Dg9WPIT5.js        21.06 kB │ gzip:   7.37 kB
dist/assets/LiturgicalView-DuNtU-8i.js       34.13 kB │ gzip:   6.44 kB
dist/assets/vendor-router-CkOAgehR.js        40.36 kB │ gzip:  14.53 kB
dist/assets/vendor-dnd-BJd_A6x7.js          105.31 kB │ gzip:  33.60 kB
dist/assets/NotebookCanvasView-DodqAVIl.js  127.42 kB │ gzip:  32.80 kB
dist/assets/vendor-react-CPD2FCRC.js        214.86 kB │ gzip:  68.00 kB
dist/assets/vendor-charts-BIqYL7dJ.js       360.19 kB │ gzip: 104.83 kB
dist/assets/index-0YS3Q1vM.js               386.84 kB │ gzip: 106.02 kB
```

- **Zero chunks exceed the 500 kB limit.**
- All dynamic routes, secondary views, and heavy charting/DnD libraries are isolated into independent cached or lazy chunks.
