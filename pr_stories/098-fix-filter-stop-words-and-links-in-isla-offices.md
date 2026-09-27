# Pull Request Story: 098 – Filter Stop Words, URLs and Liturgical Rubrics in ISLA Context

## Overview & Business Context

When exporting church year texts or daily prayer offices (`officesToISLA` and `liturgicalToISLA`) into interactive ISLA v2 notebook cells, hymn recommendations and responsory texts often contained external URLs (`https://virsikirja.fi/...`), markdown links, and structural liturgical markers (e.g. `> **E:**`, `> **S:**`, `> **Kaikki:**`, `### 1. Johdanto`, `*Ehdotus:*`). When users subsequentely referenced this preceding context using the caret operator (`^`, e.g. `^.top(10)` or `^.themes()`), the analysis caught protocol tokens (`https`, `www`, `virsikirja`, `virsi`), liturgical roles, and headings instead of the day's actual scripture readings and prayers.

This architectural fix cleans the entire caret resolution pipeline across backend and frontend:
1. **Context Verse Resolution**: The execution engine dynamically extracts scripture citations (e.g. `! @(Ps 118:19-29)`) referenced in the context text and fetches their actual verse texts, ensuring caret analytics analyze genuine scripture texts alongside prayers.
2. **Liturgical Rubric & URL Stripping**: Strips markdown headers, liturgical actor tags (`**E:**`, `**S:**`), rubric guidelines, and web URLs before NLP analytics.
3. **Comprehensive Stopwords**: Extends embedded and static dictionaries with web protocol artifacts (`https`, `http`, `www`, `url`, `com`, `fi`), full Finnish pronoun inflections (`meitä`, `meidät`, `sinun`, `minut`), and liturgical structural words.
4. **Clean Export Defaults**: Sets `stripLinks: true` as the universal default for all liturgical notebook exports.

---

## Architectural & System Changes

### 1. Backend Caret Context Cleansing & Verse Resolution (`backend/new_dsl/executor.go` & `backend/internal/dsl/executor.go`)

- Implemented `ExtractVerseRefs(text string) []string` and `extractContextVerses(ctx *ExecutionContext, text string) []models.Verse` to resolve scripture citations embedded in preceding notebook cells.
- Enhanced `StripISLAFromText` with regex cleaning for standalone URLs, markdown links, markdown headers (`#{1,6}`), metadata lines (`**Päivämäärä:**`), liturgical rubrics (`*Ehdotus:*`, `*Tai vaihtoehtoisesti...*`), role markers (`**E:**`, `**S:**`, `**Kaikki:**`, `(+)`), and blockquote formatting.
- Updated `executeCellCtxExpr` and `extractTargetContent` to pass fetched verses and cleaned prayer text concurrently to `applyAnalyticalMethods`.
- Updated `aggregateText` and `AnalyticsFinder` in `backend/internal/services/cli_service.go` to combine both verses and prose rather than discarding one.

### 2. Stopwords Dictionary Expansion (`backend/internal/services/stopwords.json` & `stop_words.go`)

- Added web URL protocol terms and domain artifacts: `"https"`, `"http"`, `"www"`, `"url"`, `"fi"`, `"com"`, `"net"`, `"org"`.
- Added missing Finnish pronoun cases: `"meitä"`, `"meidät"`, `"meille"`, `"meiltä"`, `"sinulle"`, `"sinulta"`, `"minulle"`, `"minulta"`, `"teille"`, `"teiltä"`, `"heille"`, `"heiltä"`, `"heitä"`, `"heidät"`.
- Added liturgical keywords and fixed map key duplicates (`"aamen"`, `"amen"`, `"halleluja"`, `"alleluia"`, `"vaihtoehtoisesti"`, `"lukukappale"`, `"lukukappaleet"`, `"esirukous"`, `"päivämäärä"`, `"väri"`).

### 3. Frontend Caret Context Sanitization (`frontend/src/components/notebook/isla/islaUtils.ts`)

- Enhanced `stripISLAFromText` to filter URLs, headers, rubrics, and liturgical roles, leaving only authentic narrative notes and prayers for caret analytics.
- Updated `liturgicalToISLA` and `officesToISLA` in `frontend/src/utils/liturgicalIslaExport.ts` to default `stripLinks: true`.
- Updated `LiturgicalView.tsx` to pass `{ specificOffice: activeOffice, stripLinks: true }` when exporting offices.

---

## Testing Strategy & Metrics

### Quality Gates

- `task backend:check`: Linter passed, all tests passed with `-race`, test coverage at 76.5%.
- `task frontend:check`: All 46 Vitest test suites (366 tests) passed with zero errors, TypeScript verification clean.
- `task check`: Full local verification passed.

```text
 ✓ src/utils/liturgicalIslaExport.test.ts (20 tests) 28ms
 ✓ src/components/notebook/cells/MarkdownCell.test.tsx (15 tests) 372ms
 Test Files  46 passed (46)
      Tests  366 passed (366)
```

## Files Changed

| File | Changes |
| :--- | :--- |
| `backend/internal/services/stopwords.json` | Added URL protocols, domain artifacts, full Finnish pronouns, and liturgical terms |
| `backend/internal/services/stop_words.go` | Added URL protocols, Finnish pronouns, and deduplicated map entries |
| `backend/internal/services/cli_service.go` | Combined target verses and text in AnalyticsFinder |
| `backend/new_dsl/executor.go` | Added verse citation extraction, rubric stripping, and verse aggregation in cell context |
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
| `pr_stories/098-fix-filter-stop-words-and-links-in-isla-offices.md` | Updated PR story documentation |
