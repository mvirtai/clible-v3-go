# Pull Request Story: 098 – Filter Stop Words, URLs and Liturgical Rubrics in ISLA Context

## Overview & Business Context

When exporting church year texts or daily prayer offices (`officesToISLA` and `liturgicalToISLA`) into interactive ISLA v2 notebook cells, hymn recommendations and responsory texts often contained external URLs (`https://virsikirja.fi/...`), markdown links, and structural liturgical markers (e.g. `> **E:**`, `> **S:**`, `> **Kaikki:**`, `### 1. Johdanto`, `*Ehdotus:*`). When users subsequently referenced this preceding context using the caret operator (`^`, e.g. `^.top(10)` or `^.themes()`), the analysis caught protocol tokens (`https`, `www`, `virsikirja`, `virsi`), liturgical roles, and headings instead of the day's actual scripture readings and prayers.

Furthermore, words without stop-word filtering appeared in caret analytics because `AnalyticService` was uninitialized in the CLI service layer at server startup, causing the DSL executor to fall back to a raw frequency extractor that lacked stop-word checks.

This architectural fix cleans the entire caret resolution pipeline across backend and frontend, establishes single-source-of-truth stop-word filtering, optimizes CI and local test runners, and bumps the version to **3.9.5**:

1. **Context Verse Resolution**: The execution engine dynamically extracts scripture citations (e.g. `! @(Ps 118:19-29)`) referenced in the context text and fetches their actual verse texts, ensuring caret analytics analyze genuine scripture texts alongside prayers.
2. **Liturgical Rubric & URL Stripping**: Strips markdown headers, liturgical actor tags (`**E:**`, `**S:**`), rubric guidelines, and web URLs before NLP analytics.
3. **Theologically Grounded Stopwords**: Extends embedded and static dictionaries with web protocol artifacts (`https`, `http`, `www`, `url`, `com`, `fi`), full Finnish pronoun inflections (`itse`, `itseämme`, `itsemme`, `itseään`, `jota`, `tätä`, `meitä`, `meidät`), and liturgical structural words (`virsi`, `virsikirja`, `psalmi`). Explicitly preserves authentic theological terms (`rukoilla`, `kiitos`, `paha`, `jeesus`, `kristus`, `armo`) as first-class thematic concepts.
4. **Unified Analytics Wiring**: Wires `AnalyticService` into `CLIService` at application boot (`backend/main.go`) and merges Go `stopWords` into `AnalyticService` memory dictionary.
5. **Deduplicated Text Aggregation**: Patches `aggregateText` in `backend/new_dsl/executor.go` so `fallback` is only utilized when verses contain no text, eliminating word-count duplication in variable resolution.
6. **Clean Export Defaults**: Sets `stripLinks: true` as the universal default for all liturgical notebook exports.
7. **CI & Local Performance Optimization**: Caches `golangci-lint` binary in GitHub Actions (`actions/cache@v4`) with native compilation resolving Go 1.24/1.26 toolchain mismatches, and separates local `backend:test-cov` from `-race` detection into `backend:test-race`, reducing local check duration from ~50 seconds to under 1.5 seconds.

---

## Architectural & System Changes

### 1. Backend Caret Context Cleansing & Verse Resolution (`backend/new_dsl/executor.go` & `backend/internal/dsl/executor.go`)

- Implemented `ExtractVerseRefs(text string) []string` and `extractContextVerses(ctx *ExecutionContext, text string) []models.Verse` to resolve scripture citations embedded in preceding notebook cells.
- Enhanced `StripISLAFromText` with regex cleaning for standalone URLs, markdown links, markdown headers (`#{1,6}`), metadata lines (`**Päivämäärä:**`), liturgical rubrics (`*Ehdotus:*`, `*Tai vaihtoehtoisesti...*`), role markers (`**E:**`, `**S:**`, `**Kaikki:**`, `(+)`), and blockquote formatting.
- Updated `executeCellCtxExpr` and `extractTargetContent` to pass fetched verses and cleaned prayer text concurrently to `applyAnalyticalMethods`.
- Refactored `aggregateText` to only fallback to raw text if verses slice is empty, preventing double-counting of words in `#variable.count(words)` pipelines.

### 2. Stopwords Dictionary Expansion & Service Wiring (`backend/internal/services/`)

- Exported `IsStopWord(word string) bool` in `stop_words.go` for external validation.
- Added web URL protocol terms and domain artifacts: `"https"`, `"http"`, `"www"`, `"url"`, `"fi"`, `"com"`, `"net"`, `"org"`.
- Added missing Finnish pronoun cases: `"itse"`, `"itseämme"`, `"itsemme"`, `"itseään"`, `"itseensä"`, `"itseäni"`, `"jota"`, `"tätä"`, `"tämän"`, `"tästä"`, `"tällä"`, `"tältä"`, `"meitä"`, `"meidät"`, `"hän"`.
- Maintained strict distinction between grammatical stop words and semantic theological vocabulary: verified that verbs like `rukoilla`, `kiitos`, and `paha` remain intact in analysis.
- In `backend/main.go`, invoked `cliService.SetAnalyticService(analyticService)` to activate `AnalyticsFinder` in the V2 execution context.
- In `backend/internal/services/analytics_service.go`, automatically merged `stopWords` map into `stopwordsMap` so all analytics engines share a synchronized dictionary.

### 3. Frontend Caret Context Sanitization (`frontend/src/`)

- Enhanced `stripISLAFromText` in `islaUtils.ts` to filter URLs, headers, rubrics, and liturgical roles, leaving only authentic narrative notes and prayers for caret analytics.
- Updated `liturgicalToISLA` and `officesToISLA` in `frontend/src/utils/liturgicalIslaExport.ts` to default `stripLinks: true`.
- Updated `LiturgicalView.tsx` to pass `{ specificOffice: activeOffice, stripLinks: true }` when exporting offices.

### 4. CI Workflow & Taskfile Performance Optimization

- In `.github/workflows/ci.yml`, added `actions/cache@v4` caching for `~/go/bin/golangci-lint` keyed on runner OS and `backend/go.mod` hash, using `go install` for native compilation to eliminate Go 1.24/1.26 toolchain version conflicts.
- In `Taskfile.yml`, optimized `backend:test-cov` for rapid local feedback loops (no `-race`, concise output, ~1s execution), while providing `backend:test-race` for deep concurrency audits.

---

## Testing Strategy & Metrics

### Quality Gates

- `task backend:check`: Linter passed, all tests passed, statement coverage at **76.5%**.
- `task frontend:check`: All 46 Vitest test suites (**366 tests**) passed with zero errors, TypeScript verification clean.
- `task backend:test-race`: Concurrency data race check passed cleanly.
- `task check`: Full local verification passed in **1.2s**.

```text
 ✓ src/utils/liturgicalIslaExport.test.ts (20 tests) 28ms
 ✓ src/components/notebook/cells/MarkdownCell.test.tsx (15 tests) 372ms
 Test Files  46 passed (46)
      Tests  366 passed (366)
```

## Files Changed

| File | Changes |
| :--- | :--- |
| `.github/workflows/ci.yml` | Added `actions/cache@v4` and native `go install` compilation for `golangci-lint` |
| `Taskfile.yml` | Optimized `backend:test-cov` and added dedicated `backend:test-race` task |
| `VERSION` | Bumped release version from `3.9.4` to `3.9.5` |
| `backend/internal/version/version.go` | Bumped Go runtime version constant to `3.9.5` |
| `frontend/package.json` | Bumped package version to `3.9.5` |
| `frontend/src/utils/version.ts` | Bumped frontend version constant to `3.9.5` |
| `backend/main.go` | Injected `analyticService` into `cliService.SetAnalyticService` at application boot |
| `backend/internal/services/analytics_service.go` | Merged `stopWords` map into `AnalyticService` dictionary |
| `backend/internal/services/stop_words.go` | Added URL protocols, Finnish pronouns, `IsStopWord` helper, and deduplicated keys |
| `backend/internal/services/stop_words_test.go` | Added comprehensive unit tests for `IsStopWord`, `AnalyticService`, and `ExtractThemes` |
| `backend/internal/services/stopwords.json` | Added URL protocols, domain artifacts, and liturgical terms |
| `backend/internal/services/cli_service.go` | Combined target verses and text in `AnalyticsFinder` |
| `backend/new_dsl/executor.go` | Added verse extraction, rubric stripping, and deduplicated `aggregateText` |
| `backend/internal/dsl/executor.go` | Added verse extraction and rubric stripping for ScopeNode |
| `backend/internal/services/auth_service.go` | Added `CurrentBcryptCost` to optimize race detector test speed |
| `backend/internal/services/auth_service_test.go` | Set `CurrentBcryptCost = bcrypt.MinCost` in test init |
| `backend/internal/api/auth_handler_test.go` | Set `CurrentBcryptCost = bcrypt.MinCost` in test init |
| `backend/internal/api/user_settings_handler.go` | Used `CurrentBcryptCost` |
| `backend/internal/api/user_settings_handler_test.go` | Set `CurrentBcryptCost = bcrypt.MinCost` in test init |
| `frontend/src/utils/liturgicalIslaExport.ts` | Defaulted `stripLinks: true` in `liturgicalToISLA` and `officesToISLA` |
| `frontend/src/utils/liturgicalIslaExport.test.ts` | Added unit tests for default `stripLinks: true` and `stripLinks: false` |
| `frontend/src/views/LiturgicalView.tsx` | Passed `stripLinks: true` on office export |
| `frontend/src/components/notebook/isla/islaUtils.ts` | Enhanced `stripISLAFromText` with rubric, header, and URL stripping |
| `frontend/src/components/notebook/cells/MarkdownCell.test.tsx` | Added test verifying liturgical rubric and URL stripping from caret context |
| `kanban/todos.md` | Synchronized task progress and completed items |
| `pr_stories/098-fix-filter-stop-words-and-links-in-isla-offices.md` | Updated PR story documentation to match current architecture |
