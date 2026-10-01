# Pull Request Story 107: Expose Text Analytics Across the Workspace and ISLA

## Summary

This change connects the text metrics Clible already calculates to the places where
readers explore and reuse them. The analytics workspace now exposes word, bigram,
and trigram frequencies; ISLA can request n-grams directly; and both surfaces report
hapax legomena alongside the existing lexical statistics.

The work deliberately reuses the canonical analytics service and existing result
cards. It adds no database schema, endpoint, or dependency.

## Problem and Design

The backend already calculated bigrams and trigrams, but those results did not make
it through the complete product path: the analytics workspace could not select them,
and ISLA had no method to request them. The stats payload also used inconsistent
unique-token field names across execution paths, making an existing metric harder to
render reliably.

The implementation closes those gaps at the shared boundaries rather than adding a
parallel analytics implementation:

- The analytics service remains the canonical source for verse analysis and feeds
  both the REST response and ISLA execution context.
- ISLA's `.ngrams(size, limit)` uses the canonical bigram/trigram result when the
  analytics service is available. A deterministic local fallback supports cell
  context and standalone executor use.
- Historical saved analytics remain readable: the new hapax fields are optional in
  the frontend model and are omitted from old snapshots when unavailable.
- Frequency and stats labels are localized in Finnish and English.

## Analytics Workspace

- Add a words / bigrams / trigrams selector to the frequency chart.
- Keep the word cloud permanently visible beside the chart; changing the chart level
  does not change the cloud's word-only view.
- Give n-gram bars enough horizontal space and use readable labels without
  horizontal scrolling.
- Add hapax count and share to the summary metrics.
- Keep frequency selection and chart sizing as pure derived helpers with focused
  tests.

## ISLA Analytics

### N-grams

The new `.ngrams(size, limit)` method accepts size `2` for bigrams or `3` for
trigrams. The result limit defaults to `10` and is capped at `1000`; invalid sizes,
non-positive limits, and excess arguments return errors.

```isla
! @(Joh 7).ngrams(2, 10) =>
! @(Joh 7).ngrams(3, 5) =>
! ^.ngrams(2, 10) =>
```

The first two expressions analyze a passage; the last analyzes the current notebook
cell's context. Results reuse the existing frequency card and display a localized
bigram or trigram heading.

The editor provides a valid `.ngrams(2, 10)` starter completion, leaves the size
ready to change, suggests sizes and common/custom positive limits inside the call,
and documents the method in Finnish and English hover help. `ngrams` is
syntax-highlighted, and truncated result phrases expose their full text on hover.

### Stats and lexical diversity

ISLA stats now use the canonical `unique_token_count` field and include character
count and hapax metrics in both the analytics-service and fallback paths.
`.lemma()`, `.cluster()`, and `.categorize()` are discoverable from autocomplete and
hover documentation.

For normalized token frequencies \(f(w)\):

- `hapax_legomena_count` is the number of word types whose frequency is exactly one.
- `hapax_legomena_ratio` is the hapax count divided by the number of analyzed token
  occurrences. The API returns a ratio from `0` to `1`; UI cards render it as a
  percentage.

The count is computed after the same token processing used for lexical statistics,
including lemmatization when enabled. The ratio complements TTR; it should be read
with passage length in mind, especially for short samples.

ISLA stats cards, the main analytics workspace, and frozen Markdown result exports
include the new values. Existing saved results without hapax fields continue to
render without a fabricated zero.

## Documentation and Release Metadata

- Extend the VitePress analytics and ISLA guides with the metric definition,
  supported syntax, argument limits, examples, and common n-gram mistakes.
- Synchronize the project version to `3.12.1` across `VERSION`, frontend package
  metadata, frontend runtime fallback, and backend version metadata.

## Verification

- `task backend:check` — passed; **77.2%** statement coverage.
- `task frontend:check` — passed; TypeScript and ESLint passed, with **51 test files
  and 389 tests** passing.
- `task docs:build` — passed.
- `task frontend:build` passed before the latest hapax addition; Vite reported the
  existing large JavaScript chunk warning. The current changes have since passed the
  TypeScript, lint, and Vitest checks above.
- The user confirmed `.ngrams()` worked after restarting the backend. Hapax display
  is covered by automated tests; no separate manual browser verification is claimed.
- `task check` was not run; backend, frontend, and documentation gates were run
  individually.

## Files Changed

| Area | File | Responsibility |
|---|---|---|
| Analytics service | `backend/internal/services/analytics_service.go` | Canonical hapax counts and ratios for raw and lemmatized token streams. |
| Analytics service | `backend/internal/services/analytics_service_test.go` | Hapax count, ratio, empty input, and all-stopword behavior. |
| Service wiring | `backend/internal/services/cli_service.go` | Carries the new metrics into both ISLA execution engines. |
| Service wiring | `backend/internal/services/cli_service_test.go` | Checks metrics in service-backed ISLA stats. |
| Legacy DSL | `backend/internal/dsl/executor.go` | Propagates hapax metrics through legacy stats and local fallback. |
| Legacy DSL | `backend/internal/dsl/executor_test.go` | Verifies hapax fields in legacy stats results. |
| ISLA v2 | `backend/new_dsl/executor.go` | N-gram execution, input bounds, stats payload, and cell-context fallback. |
| ISLA v2 | `backend/new_dsl/executor_test.go` | N-gram and hapax fallback coverage. |
| ISLA v2 | `backend/new_dsl/parser.go` | Accepts `.ngrams()` in the ISLA method registry. |
| Analytics UI | `frontend/src/components/analytics/AnalyticsView.tsx` | Frequency-level controls and hapax summary metric. |
| Analytics UI | `frontend/src/components/analytics/WordCloud.tsx` | Persistent word-only cloud rendering. |
| Analytics UI | `frontend/src/components/analytics/WordCloud.test.ts` | Word-cloud sizing coverage. |
| Analytics UI | `frontend/src/components/analytics/frequencyData.ts` | Frequency selection and chart sizing helpers. |
| Analytics UI | `frontend/src/components/analytics/frequencyData.test.ts` | Frequency-selection and chart-height tests. |
| Analytics UI | `frontend/src/components/analytics/wordCloudUtils.ts` | Pure font sizing helper, separated for Fast Refresh compliance. |
| ISLA editor | `frontend/src/components/notebook/isla/ISLABlock.tsx` | Routes n-gram results to the frequency card. |
| ISLA editor | `frontend/src/components/notebook/isla/islaIntellisense.ts` | Method, argument, and hover completions. |
| ISLA editor | `frontend/src/components/notebook/isla/islaIntellisense.test.ts` | Method, argument, cursor, and hover completion tests. |
| ISLA editor | `frontend/src/components/notebook/isla/islaLexer.ts` | Syntax highlighting for `ngrams`. |
| ISLA editor | `frontend/src/components/notebook/isla/islaLexer.test.ts` | N-gram tokenization test. |
| ISLA editor | `frontend/src/components/notebook/isla/islaUtils.ts` | Bilingual command registry documentation. |
| ISLA results | `frontend/src/components/notebook/results/CellStatsResult.tsx` | Hapax metric in the ISLA stats card. |
| ISLA results | `frontend/src/components/notebook/results/CellStatsResult.test.tsx` | Stats-card metric coverage. |
| ISLA results | `frontend/src/components/notebook/results/CellWordFreqResult.tsx` | Localized n-gram titles and full phrase tooltip. |
| ISLA results | `frontend/src/components/notebook/results/CellWordFreqResult.test.tsx` | Bigram/trigram result headings. |
| API mapping | `frontend/src/services/api.ts` | Maps new analytics fields to the frontend stats model. |
| API mapping | `frontend/src/services/api.test.ts` | Tests the hapax response mapping. |
| Frontend types | `frontend/src/types/bible.ts` | Adds optional hapax fields for saved-stat compatibility. |
| Localization | `frontend/src/utils/i18n.ts` | Finnish and English metric labels. |
| Markdown export | `frontend/src/utils/markdown.ts` | Includes hapax values in frozen stats output. |
| Markdown export | `frontend/src/utils/markdown.test.ts` | Tests stats export with hapax values. |
| ISLA specification | `docs/architecture/isla-specification.md` | Adds n-gram support to the method-validation matrix. |
| User guide | `docs/guide/isla-guide.md` | Documents n-gram syntax and hapax stats fields. |
| User guide | `docs/guide/search-and-analytics.md` | Explains hapax metrics and short-sample interpretation. |
| Release metadata | `VERSION` | Sets release version to `3.12.1`. |
| Release metadata | `backend/internal/version/version.go` | Synchronizes backend version metadata. |
| Release metadata | `frontend/package.json` | Synchronizes frontend package version. |
| Release metadata | `frontend/src/utils/version.ts` | Synchronizes frontend runtime fallback version. |
| PR record | `pr_stories/107-feat-expose-text-analytics.md` | Records the feature rationale, contracts, verification, and file inventory. |
