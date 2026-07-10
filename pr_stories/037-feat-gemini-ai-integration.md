# PR Story: Gemini AI Integration (Pathway D)

## Context & Business Value

This Pull Request implements the core features of **Pathway D (Gemini AI Integration)** in Clible-v3-go. It delivers AI-assisted Bible study capabilities, including:

1. **Passage Insights**: Explanatory theological context and summaries.
2. **Linguistic & Tone Analysis**: Style, emotional tones, and semantic nuances.
3. **Comparative Original Language Study**: In-depth comparisons of Koine Greek or Biblical Hebrew against modern translations across verse, chapter, and book scopes.
4. **AI-Assisted Search (RAG)**: Natural-language queries planned by Gemini, executed against the SQLite FTS5 database, and summarized with references.
5. **Interactive Topic Deep Dives**: Multi-turn analysis triggered by tekoäly-recommended keywords and chips.

The integration is secured with JWT authentication and protected by a specialized, strict IP rate limiter (max 5 calls per minute) to control Gemini API costs.

---

## Architectural Changes

### 1. Backend (Go)

- **Gemini 3.x Model Configuration (`backend/internal/config/config.go`)**:
  - Upgraded the default Gemini model across all features to `gemini-3.1-flash-lite` (with fallback support for `gemini-3-flash`) to address API version `v1beta` 404/503 errors and utilize the faster Gemini 3.x models.
- **AI Service (`backend/internal/services/ai_service.go`)**:
  - Implements `AIService` methods using the standard library `net/http` package.
  - Connects to Google's Gemini API with standard configurations.
  - Extracts JSON recommendation blocks from model outputs via `parseAIResponse` to separate Markdown text from recommendations (`next_focus`).
  - Employs a two-phase `AISearch` execution: first, Gemini designs a structural search plan; second, the search is resolved against the database and summarized.
  - Added `GetComparison` service method using `GeminiModelTone` to compare differences, style, and theological nuances between two translations.
- **AI REST Handler (`backend/internal/api/ai_handler.go`)**:
  - Exposes REST handlers for `/api/ai/insight`, `/api/ai/tone`, `/api/ai/deep-dive`, `/api/ai/original-study`, `/api/ai/search`, and `/api/ai/compare`.
  - Implements graceful error handling: returns a `503 Service Unavailable` JSON response if `GEMINI_API_KEY` is not configured.
- **Routing & Rate Limiting (`backend/main.go` & `backend/internal/middleware/ratelimit.go`)**:
  - Configures a dedicated visitor rate limiter (`middleware.NewIPRateLimiter(rate.Limit(5.0/60.0), 2)`) specifically wrapping the AI routes.
  - Protects all `/api/ai/*` routes with the standard authentication middleware.
  - Bypasses rate limiting for localhost loopback IPs (`127.0.0.1` and `::1`) during development.

### 2. Frontend (React & TypeScript)

- **Workspace Scopes Integration**:
  - **Saving**: Added "Save to Workspace" buttons to the AI Insight (`VerseReader`), AI Tone (`AnalyticsView`), AI Original Study (`OriginalStudyView`), and AI Translation Comparison (`CompareView`) result panels, saving these analyses directly using `apiService.saveAnalysis` with types `insight`, `tone`, `original`, and `comparison` respectively.
  - **Loading**: Updated `handleLoadSavedAnalysis` in `App.tsx` and implemented render synchronization in `VerseReader`, `AnalyticsView`, and `CompareView` to support parsing and rendering saved tekoäly-analyses directly from the workspace sidebar without triggering new API calls.
- **Typography & Layout Spacing Fixes**:
  - Wrapped global CSS tags (`h1, h2, h3, p, code`) inside a `@layer base` block in `index.css` to allow Tailwind classes to function properly.
  - Implemented explicit inline margin styles (`style={{ marginTop: '2.5rem', marginBottom: '1rem' }}`) on custom Markdown elements in `markdownComponents.tsx` and removed the outer `.prose` classes to completely prevent CSS Cascade Layer overrides and resets from collapsing margins.
- **TypeScript Models (`frontend/src/types/`)**:
  - Added [ai.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/types/ai.ts) for general AI output.
  - Added [aiSearch.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/types/aiSearch.ts) for FTS plan tracking.
  - Added [originalStudy.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/types/originalStudy.ts) for comparative original studies.
- **API service wrappers (`frontend/src/services/api.ts`)**:
  - Added fetch methods for all six AI endpoints (including `getAiComparison`).
- **Markdown components (`frontend/src/utils/markdownComponents.tsx`)**:
  - Integrates `react-markdown` styling rules for table alignments, headers, blockquotes, and prose.
- **AI UI elements (`frontend/src/components/`)**:
  - Created `NextFocusChips` and `DeepDiveCard` to render recommendations and dynaamisia deep dive topics.
  - Created `OriginalStudyView` to let users manage original language packs, input references, configure comparative targets, and view aligned study maps.
- **Feature Wiring (`App.tsx`, `VerseReader.tsx`, `AnalyticsView.tsx`, `CompareView.tsx`)**:
  - Integrated the "Alkukieli" vertical/horizontal comparative tab and AI Translation Comparison card in CompareView into the main layout.
  - Wired the "Analyze" triggers in Lukukone, Analytiikka, and Käännösvertailu views to dispatch live API calls.
  - Configured state resets to clear old AI results on subsequent scripture lookups or search executions.

---

## Verification & Testing

### Automated Tests

- **AI Service Unit Tests (`backend/internal/services/ai_service_test.go`)**:
  - Validates `GetInsight`, `GetTone`, `DeepDive`, `AISearch`, and `GetComparison` logic.
  - Mocks the Gemini HTTP JSON API using a custom `http.RoundTripper` transport override.
  - Leverages SQLite `:memory:` database migrations and seeding for database searches.
- **AI Handler Unit Tests (`backend/internal/api/ai_handler_test.go`)**:
  - Tests request parsing, JSON schema outputs, and HTTP response codes (200, 400, 503) for all endpoints including `/api/ai/compare`.

### Manual Verification Steps

1. Set `GEMINI_API_KEY` in `backend/.env`.
2. Run `go test ./...` in the backend to confirm service compilation.
3. Build the frontend (`npm run build`) to ensure TypeScript compiles without warning.
4. Launch the application, navigate to **Lukukone**, and run "Analysoi tekstiä".
5. Save the analysis to the active workspace scope and verify it appears in the sidebar.
6. Click the saved analysis in the sidebar to verify it loads instantly into the reader.
7. Repeat the save and load flow for the Tone, Original Language study, and Translation Comparison panels.
