# Pull Request Story: 112 – Reduce Translation Comparison Memory

## Business Context

Translation comparison computes a longest-common-subsequence score for every aligned verse. The original dynamic-programming implementation retained the full `(m + 1) × (n + 1)` matrix even though each score depends only on the preceding row and the values already computed in the current row. Across a 1,000-verse comparison, that unnecessary matrix allocation dominated both memory traffic and runtime.

This change keeps the same score and quadratic comparison work, but rolls the matrix through two rows sized to the shorter input string. The existing 1,000-verse benchmark measured 104,024,687 B/op before the change and 12,179,337 B/op after it, an 88.3% reduction in allocated bytes.

## Architectural & System Changes

### Translation similarity scoring

- Replaced the full LCS matrix in `computeSequenceRatio` with two reusable rows.
- Uses the shorter string for row width, reducing working memory from `O(m × n)` to `O(min(m, n))` while preserving the prior byte-based score.
- Added regression cases for empty input, identical and partially matching strings, and swapped input lengths.

## Additional Performance Opportunities Identified

These are separate follow-up opportunities, not changes included in this PR. Impact and effort are qualitative estimates from code inspection, not measured production results.

| # | Opportunity | Evidence | Impact / effort |
|---|---|---|---|
| 1 | Replace the per-verse full LCS matrix with rolling rows. | `backend/internal/services/analytics_service.go`, `computeSequenceRatio` | **Implemented:** high / low |
| 2 | Bound or paginate regex search; its repository branch scans rows and runs Go regex matching after fetching them. | `backend/internal/db/verse_repo.go`, `Search` regex branch | High / medium |
| 3 | Add pagination or a response cap to full-text search; the query and response currently retain every match, which the UI then renders. | `backend/internal/db/verse_repo.go`, `Search`; `backend/internal/api/bible_handler.go`, `SearchVerses`; `frontend/src/components/search/VerseSearch.tsx` | High / medium |
| 4 | Avoid the extra translation-language database round trip on each keyword search. | `backend/internal/db/verse_repo.go`, `SearchByKeywords` | Medium / low |
| 5 | Add PostgreSQL GIN indexes for the English and Finnish text-search configurations used by keyword search; the existing verse GIN index covers only the `simple` configuration. | `backend/internal/db/verse_repo.go`, `SearchByKeywords`; `backend/internal/db/migrations.go`, migration 003 | High / medium |
| 6 | Add a composite `(user_id, searched_at DESC)` index for latest-per-user history retrieval, then verify the plan on production-sized data. | `backend/internal/db/search_history_repo.go`, `GetLatest`; migrations 006 and 008 | Medium / low |
| 7 | For already sorted same-reference inputs, align translation verses with a linear merge instead of building a map and sorting all keys. | `backend/internal/services/analytics_service.go`, `alignVerses` | Medium / medium |
| 8 | Reduce per-verse set allocations in token-overlap scoring by tracking intersection and union with fewer maps. | `backend/internal/services/analytics_service.go`, `computeTokenOverlap` | Medium / low |
| 9 | Stream analytics token counts and n-grams rather than retaining and revisiting the complete token slice for long references. | `backend/internal/services/analytics_service.go`, `AnalyzeVersesWithOptions` | Medium / medium |
| 10 | Select only the requested top frequencies instead of sorting the entire vocabulary when `TopN` is small. | `backend/internal/services/analytics_service.go`, `extractTopFrequencies` | Medium / medium |

## Improvement Metrics

Existing benchmark: `BenchmarkAnalyticService_CompareTranslations/1000_verses`, run with `-benchmem -count=1`.

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Time per operation | 95,558,832 ns/op | 60,122,879 ns/op | 37.1% lower |
| Allocated bytes | 104,024,687 B/op | 12,179,337 B/op | 88.3% lower |
| Allocations | 262,312 allocs/op | 163,066 allocs/op | 37.8% lower |

## Files Changed

| File | Change Summary |
|---|---|
| `backend/internal/services/analytics_service.go` | Compute LCS scores with two rolling rows sized to the shorter input. |
| `backend/internal/services/analytics_service_test.go` | Cover empty inputs, identical strings, partial matches, and row-width swapping. |
| `VERSION` | Bump application version to 3.13.1. |
| `backend/internal/version/version.go` | Synchronize backend version to 3.13.1. |
| `frontend/package.json` | Synchronize package version to 3.13.1. |
| `frontend/src/utils/version.ts` | Synchronize frontend runtime version to 3.13.1. |
| `pr_stories/112-perf-reduce-translation-comparison-memory.md` | Record the rationale, verified benchmark, and follow-up inventory. |

## Testing Strategy

### Automated test and quality results

The targeted analytics tests and benchmark passed before and after the change. The full `task check` quality gate passed:

```text
ok  	github.com/mvirtai/clible-v3-go/internal/services	1.020s	coverage: 78.4% of statements
 Test Files  51 passed (51)
      Tests  394 passed (394)
   Duration  10.42s (transform 3.95s, setup 960ms, import 14.45s, tests 8.09s, environment 31.58s)
All local quality checks passed flawlessly!
```
