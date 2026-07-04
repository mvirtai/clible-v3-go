# Feature: Frontend Foundation Setup

## Business Context

This pull request establishes the core frontend foundations for `clible-v3-go`, setting up the TypeScript types, utilities, API client services, and test environment to enable reliable web application development. The work is logically grouped to provide:

1. **Test Environment Bootstrapping**: Vitest is configured with the `happy-dom` browser-like environment and a customized setup file to enable unit testing for API and utility functions.
2. **Go REST API Domain Alignment**: Explicit TypeScript type definitions are implemented to strictly map to the REST API JSON structures exposed by the Go backend (verses, translations, search history, text analytics, etc.).
3. **Core Utility Modules**: High-performance, dependency-free utility layers are ported for lightweight localization (`i18n.ts`) and Bible book name normalizations and localized citation formatting (`bookNames.ts`).
4. **API Service Client**: A centralized, stateless `ApiService` class abstracts backend HTTP requests (`fetch`), providing typed promises and clean error propagation for frontend components.

## Architectural Changes

- **Vitest Configuration (`frontend/vite.config.ts`, `frontend/vitest.setup.ts`)**:
  - Registered `vitest` globals and integrated the lightweight `happy-dom` emulation layer.
  - Initialized a global mock guard for `fetch` in `vitest.setup.ts` to prevent tests from hitting actual endpoints.
- **TypeScript & Build Configuration (`frontend/package.json`, `frontend/tsconfig.app.json`)**:
  - Added testing scripts (`test`, `test:watch`, etc.) and dev dependencies (`vitest`, `happy-dom`).
  - Added `vitest` types and included `vitest.setup.ts` in the compilation scope.
- **REST API Payload Mapping Types (`frontend/src/types/`)**:
  - `bible.ts`: Maps the Go `FrontendVerse`, `FrontendBibleResponse`, `InstalledTranslation`, `TextStats`, and `ComparisonResult` models.
  - `searchQuery.ts` & `search.ts`: Defines types for FTS5 queries, history entries (aligned with backend camelCase mappings), and multi-search response statistics.
- **Stateless HTTP Client (`frontend/src/services/api.ts`)**:
  - Encapsulates all backend paths (`/api/verses`, `/api/search`, `/api/translations`, `/api/history`, `/api/analytics/*`).
  - Ensures clean HTTP error handling, rejecting promises when responses are not `ok`.
- **Localization & Normalization Utilities (`frontend/src/utils/`)**:
  - `i18n.ts`: Simple translation lookup hook matching English and Finnish keys with zero dependencies.
  - `bookNames.ts`: normalizes inputs (e.g. `Joh.` / `Genesis` -> canonical ID `JHN`) and formats citations localized for Finnish (`Apostolien teot (Ap. t. 1:8)`) or English (`JHN 3:16`).
- **Book Metadata Updates (`frontend/src/data/book_names.json`)**:
  - Added `"citation_abbr_fi": "Ap. t."` to the Acts (`ACT`) record to ensure accurate Finnish abbreviation rendering.

## Testing Strategy

- **API Mock Testing (`frontend/src/services/api.test.ts`)**:
  - Verifies that `ApiService` constructs request URLs correctly and passes credential flags.
  - Asserts that failed HTTP responses propagate as exceptions containing status codes.
- **Book Name Verification (`frontend/src/utils/bookNames.test.ts`)**:
  - Tests various abbreviations, localized translations, and full reference formatting for both Finnish and English locales.
- **Command-Line Validation**:
  - Run all tests using Vitest to confirm 100% pass rates.

---

## Architectural Changes & File Transformations

### A. Testing & Transpilation Settings

- **`frontend/vite.config.ts` [MODIFY]**: Added `test` configurations including `globals: true`, environment `happy-dom`, and pointing to setup files.

- **`frontend/vitest.setup.ts` [NEW]**: Initialized global `fetch` as a Vitest mock function to shield testing code from network environments.

- **`frontend/tsconfig.app.json` [MODIFY]**: Included `vitest.setup.ts` in compilation and registered `"vitest"` in the types list.

- **`frontend/package.json` [MODIFY]**: Added test execution commands and installed development testing dependencies.

### B. Domain Type Declarations

- **`frontend/src/types/bible.ts` [NEW]**: Type definitions for verses, translation indexes, word frequency charts, and text similarity metrics.

- **`frontend/src/types/search.ts` [NEW]**: Type definitions for search rows and results count.

- **`frontend/src/types/searchQuery.ts` [NEW]**: Type definitions for search input options and history entries.

### C. Services & Utilities

- **`frontend/src/services/api.ts` [NEW]**: Stateless services class providing typed promises to talk with HTTP JSON endpoints.

- **`frontend/src/services/api.test.ts` [NEW]**: Unit tests checking parameter mapping, post payloads, and error propagation.

- **`frontend/src/utils/i18n.ts` [NEW]**: Simple dictionary translation structure.

- **`frontend/src/utils/bookNames.ts` [NEW]**: Normalization utilities for references, books, and language abbreviations.

- **`frontend/src/utils/bookNames.test.ts` [NEW]**: Unit tests checking citation abbreviations and translation lookups.

- **`frontend/src/data/book_names.json` [MODIFY]**: Specified `"citation_abbr_fi": "Ap. t."` for the `ACT` entry.

---

## Testing Strategy & Verification

### Automated Verification

Run Vitest suites to ensure all test files compile and execute successfully:

```bash
pnpm test
```

**Status**: PASS (12/12 tests passing).
