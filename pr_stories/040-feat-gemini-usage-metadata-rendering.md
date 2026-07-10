# PR Story: Gemini API Usage Metadata Rendering

## Business Context

To increase transparency, track resource consumption, and provide developers/users with visibility into AI model usage, the application now extracts, aggregates, and renders Gemini API's `usageMetadata` (token consumption statistics) directly in the UI. 

This gives immediate feedback on how many prompt tokens, candidate (output) tokens, and total tokens were consumed by each AI request, including multi-stage pipelines such as AI Search.

## Architectural Changes

### Backend (Go)

- **Service Layer** (`backend/internal/services/ai_service.go`):
  - Created a new `GeminiUsageMetadata` struct representing the token counts (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`) returned by the Gemini API.
  - Linked `GeminiUsageMetadata` to the `geminiResponse` and the public `AIResponse` models.
  - Updated the signature of the internal `callGemini` helper function to return `(string, *GeminiUsageMetadata, error)`.
  - Updated all Gemini endpoint operations (`GetInsight`, `GetTone`, `DeepDive`, `OriginalStudy`, `GetComparison`) to extract, map, and return token usage.
  - In `AISearch` (which invokes Gemini twice for planning and summarization), aggregated the token usage statistics from both calls by summing their counts and returning them under the root response map.

### API Layer (Go)

- **AI Handler** (`backend/internal/api/ai_handler.go`):
  - Ensured all HTTP responses marshaled from `AIResponse` include the `usageMetadata` JSON payload.

### Frontend Layer (TypeScript & React)

- **TypeScript Definitions** (`frontend/src/types/`):
  - [ai.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/types/ai.ts): Added the `GeminiUsageMetadata` interface and updated `AiTextResponse` to include `geminiUsageMetadata`.
  - [aiSearch.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/types/aiSearch.ts): Updated `AiSearchResponse` to include `usageMetadata`.
  - [originalStudy.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/types/originalStudy.ts): Updated `OriginalStudyResult` to include `geminiUsageMetadata`.
- **UI Components** (`frontend/src/components/`):
  - Created the [GeminiUsage.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/GeminiUsage.tsx) component: A unified, compact, and themed display card rendering the engine model name alongside prompt, output, and total token usage with a pulse-animated CPU icon.
  - Integrated the `<GeminiUsage>` card beneath AI markdown results in [VerseReader.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/VerseReader.tsx) (AI Insights), [AnalyticsView.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/AnalyticsView.tsx) (Tone Analysis), [CompareView.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/CompareView.tsx) (Comparative Analysis), and [OriginalStudyView.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/OriginalStudyView.tsx) (Original Language Study).
  - Updated [DeepDiveCard.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/DeepDiveCard.tsx) to accept `geminiUsageMetadata` and display token usage for all live Deep Dive sections, updating states and props accordingly across caller views.

## Testing Strategy

### Automated Tests

- **Backend Handler & Service Tests**:
  - Updated `ai_service_test.go` to mock Gemini responses with token metadata and verify aggregation.
  - Added new handler tests in `ai_handler_test.go` for the `GetTone` and `GetOriginalStudy` endpoints, asserting that token metadata is correctly parsed and returned in HTTP responses.
- **Frontend API & Component Tests**:
  - Added a test in `api.test.ts` verifying that `getAiInsight` and `getAiOriginalStudy` properly receive and deserialize token metadata.
  - Added a test in `VerseReader.test.tsx` verifying that `<GeminiUsage>` correctly renders Prompt, Output, and Total counts when loaded with saved insight metadata.

### Manual Verification

- Ran the local check suite using `task check`, which compiles the backend, audits packages, runs ESLint on the frontend, compiles TypeScript, and runs Vitest successfully.
- Verified in the browser that token counts render cleanly under the AI Insights card, the Tone Analysis card, the Comparative Analysis view, the Original Study view, and all recommended Deep Dive details cards without console syntax errors.
