# Pull Request Story: 117 – PageSpeed Insights and Core Web Vitals Optimizations

## Overview & Business Context

While Clible maintains high desktop responsiveness, performance audits revealed that on lower-powered mobile devices and throttled 4G connections, initial load and interaction times experienced unnecessary overhead. Mobile First Contentful Paint (FCP) and Largest Contentful Paint (LCP) were weighed down by a monolithic 1.36 MB JavaScript bundle containing heavy charting, graph, and canvas calculation dependencies needed only when explicitly switching to secondary workspaces.

Furthermore, static assets lacked explicit `Cache-Control` response directives in the Go SPA server, causing browsers to repetitively revalidate and download static resources, while Google Fonts (`Lora` and `JetBrains Mono`) introduced render-blocking stylesheets during initial layout calculation. An accessibility gap in the mobile user dropdown also surfaced due to missing `aria-label` values on icon-only action triggers.

This Pull Request resolves these bottlenecks across backend and frontend layers:

1. Employs aggressive immutable caching for hashed client assets and deterministic `no-cache` revalidation for HTML entrypoints.
2. Implements asynchronous route/view-level code splitting using `React.lazy()` and `<Suspense>`, reducing the initial JavaScript payload by over 46% (632 kB uncompressed reduction; down to 206 kB gzipped).
3. Eliminates render-blocking font requests with asynchronous stylesheet preloading and fallback handling.
4. Elevates mobile accessibility compliance by supplying explicit, localized `aria-label` attributes to icon controls in `UserMenuDropdown`.

---

## Architectural & System Changes

### 1. Static Asset Caching Architecture (`backend/main.go`)

In `frontendHandler`, the SPA static file routing was augmented with content-aware cache policies:

- Hashed assets under `/assets/*` (generated with content hashes by Vite) are served with `Cache-Control: public, max-age=31536000, immutable`, saving ~1.1 MB in repeated network overhead.
- SPA shell entrypoints (`/`, `/index.html`, or not-found SPA fallback routes) explicitly send `Cache-Control: no-cache, must-revalidate` to guarantee instant client updates upon new deployments.
- Other root static files (e.g., `favicon.svg`, manifests) default to `Cache-Control: public, max-age=86400`.
- Unit tests in `backend/main_test.go` assert these headers across `/assets/*`, direct assets, and SPA paths.

### 2. Frontend Code-Splitting & Lazy Loading (`frontend/src/App.tsx`)

Heavy view components were converted to dynamic chunk imports with `React.lazy()` and wrapped in accessible `<Suspense>` boundaries:

- `AnalyticsView` (bundling `d3` and `recharts`)
- `CompareView` (multi-translation alignment calculations)
- `OriginalStudyView` (morphological dictionaries and original language concordance)
- `NotebookCanvasView` (bundling `@dnd-kit/react`, `@dnd-kit/helpers`, `react-markdown`, and remark plugins)

The initial startup path now loads solely `VerseReader` and `VerseSearch`, keeping initial bundle parsing and compilation fast on constrained mobile runtimes.

```text
Before code splitting:
dist/assets/index-BJBnXF6n.js   1,365.79 kB │ gzip: 384.89 kB

After code splitting:
dist/assets/index-DeHI5hR4.js     733.82 kB │ gzip: 206.13 kB  (-46.3% JS bundle size)
dist/assets/AnalyticsView-*.js    363.21 kB │ gzip: 105.54 kB  (lazy loaded)
dist/assets/NotebookCanvasView-*.js 241.16 kB │ gzip:  69.04 kB  (lazy loaded)
dist/assets/CompareView-*.js       17.87 kB │ gzip:   4.61 kB  (lazy loaded)
dist/assets/OriginalStudyView-*.js  10.58 kB │ gzip:   3.38 kB  (lazy loaded)
```

### 3. Non-Blocking Font Delivery & Mobile Web Standards (`frontend/index.html`)

- Converted Google Fonts (`Lora` and `JetBrains Mono`) to non-render-blocking asynchronous links using `rel="preload" as="style"` combined with `media="print" onload="this.media='all'"` and a `<noscript>` fallback, removing ~280–1,050 ms of initial render blocking.

### 4. Accessibility & Touch Usability (`frontend/src/components/layout/UserMenuDropdown.tsx`)

- Added explicit `aria-label` attributes to the Translation Management and User Settings action buttons within `UserMenuDropdown`, ensuring screen readers and automated accessibility auditing tools identify the controls when icons or responsive viewports hide inline label text.

---

## Security Review Assessment

A dedicated security audit report under `.security_audits/` is **not warranted** for this pull request based on the following evaluation:

- **No Authentication / Authorization Boundary Changes**: No JWT token verification, password hashing, session lifecycle, or role logic was modified.
- **Path Traversal Safety Preserved**: Static asset serving continues to execute through Go 1.24 `os.OpenRoot` jail confinement, and path cleaning prevents directory traversal. Caching headers only attach to responses already validated within the sandboxed directory.
- **Client Sanitization Intact**: Lazy loading and `<Suspense>` boundaries do not introduce unsanitized user inputs or dangerously set inner HTML.
- **Supply-Chain Integrity**: No new external dependencies were introduced; lockfile policies and security linters passed flawlessly (`task check`).

---

## Files Changed

| File | Change |
| ------ | -------- |
| `VERSION` | Bump patch version from 3.15.0 to 3.15.1 |
| `backend/internal/version/version.go` | Synchronize application release constant to 3.15.1 |
| `backend/main.go` | Implement granular `Cache-Control` policy for hashed assets, root files, and SPA HTML |
| `backend/main_test.go` | Add unit tests verifying `Cache-Control` headers for hashed assets and SPA fallbacks |
| `frontend/index.html` | Asynchronous non-render-blocking Google Fonts loading with preload and noscript fallback |
| `frontend/package.json` | Update frontend semantic version to 3.15.1 |
| `frontend/src/App.tsx` | Lazy load `AnalyticsView`, `CompareView`, `OriginalStudyView`, and `NotebookCanvasView` with Suspense |
| `frontend/src/components/layout/UserMenuDropdown.tsx` | Add accessible `aria-label` tags to translation management and settings triggers |
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
$ vitest run -- --coverage --reporter=verbose

 Test Files  55 passed (55)
      Tests  425 passed (425)
   Start at  11:30:50
   Duration  13.85s (transform 3.74s, setup 1.40s, import 20.27s, tests 12.17s, environment 40.46s)
```

Production build verification (`pnpm run build`):

- `dist/index.html`: 11.52 kB (gzip: 3.80 kB)
- `dist/assets/index-DeHI5hR4.js`: 733.82 kB (gzip: 206.13 kB)
- Independent dynamically-imported chunks for analytics, comparison, original language study, and notebook canvas.
