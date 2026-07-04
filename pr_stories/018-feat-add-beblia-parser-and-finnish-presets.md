# Feature: BEBLIA XML Parser and Finnish Translation Presets

## Business Context

This pull request completes the core parser features and frontend presets required to fully support the most important Finnish Bible translations—specifically **Kirkkoraamattu 1992 (KR92)** and **Kirkkoraamattu 1933/38 (KR38)**.

To achieve this, two major steps were completed:

1. **BEBLIA XML Format Support**: KR92 is distributed in the `BEBLIA` XML schema, which structures books by position number (1–66) instead of canonical 3-letter book IDs (e.g., `GEN`, `JHN`). A robust streaming parser for this format was added to the backend.
2. **Dynaamic Preset Integrations**: The frontend `TranslationManager` was refactored to support flexible, URL-driven downloads from multiple GitHub repositories (specifically `seven1m/open-bibles` for OSIS/USFX formats and `Beblia/Holy-Bible-XML-Format` for the BEBLIA format). This enables one-click installations for KR92, KR38, and Biblia 1776 directly from the web.

---

## Architectural Changes

### Backend — `backend/internal/`

#### `parsers/xml_parser.go` [MODIFY]

* Added a static `orderedBookIDs` slice containing the 66 canonical Bible books in their standard biblical order. This is used to map 1-indexed book numbers in `BEBLIA` XMLs to canonical uppercase IDs (e.g. `1` -> `GEN`, `43` -> `JHN`) in O(1) time without querying the database.
* Extended the streaming token parser (`ParseStream`) to handle BEBLIA XML tags:
  * `<book number="...">`: Converts the book number to the corresponding canonical 3-letter ID.
  * `<chapter number="...">`: Parses the chapter number from the `number` attribute (in addition to USFX `<c id="...">`).
  * `<verse number="...">`: Parses the verse number from the `number` attribute.
* Cleaned up nested `if-else` chains in attribute parsing to utilize idiomatic Go `switch` statements (tagged switches) to comply with linter rules (`golangci-lint` / `gocritic`).
* Reset `currentBook`, `currentChapter`, and `verseNum` state variables upon encountering new elements. This prevents stale coordinate data from bleeding into subsequent malformed tags (state bleeding bug fix).

#### `parsers/xml_parser_test.go` [MODIFY]

* Added four new integration/boundary tests for `ParseStream`:
  * `successfully streams valid BEBLIA simple elements structure`: Verifies correct coordinate parsing and text extraction for BEBLIA XML structures.
  * `returns error when XML tokenization fails due to malformed XML`: Confirms proper error propagation for truncated/broken XML.
  * `aborts and returns callback error`: Assures that database or constraint errors from the callback halt the parser immediately.
  * `ignores invalid Beblia book numbers and values`: Verifies parser resilience when encountering out-of-range book numbers (e.g. `99`, `0`), alphabetical values, or invalid chapter/verse numbers.

---

### Frontend — `frontend/src/`

#### `components/TranslationManager.tsx` [MODIFY]

* Refactored `PresetTranslation` interface to replace `filename` with a direct `url` field.
* Updated `PRESET_TRANSLATIONS` to include the correct download URLs and formats for:
  * **Kirkkoraamattu 1992** (ID: `fin-1992`, Format: `BEBLIA`)
  * **Kirkkoraamattu 1933/38** (ID: `fin-biblia-33-38`, Format: `OSIS`)
  * **Biblia 1776** (ID: `fin-1776`, Format: `BEBLIA`)
  * **World English Bible** (ID: `web`, Format: `USFX` - corrected from `osis`)
  * **King James Version** (ID: `kjv`, Format: `OSIS`)
* Refactored `handleInstallPreset` to dynamically parse the target filename from the URL, decoupling the download mechanism from a single repository root.

#### `components/TranslationManager.test.tsx` [NEW]

* Implemented unit/component tests for `TranslationManager` using React 19 `createRoot` and Vitest:
  * Verifies rendering of the preset cards (KR92, KR38, etc.).
  * Verifies that clicking a preset card triggers a fetch to the correct URL and calls `apiService.importTranslation` with matching parameters and files.

#### `services/api.test.ts` [MODIFY]

* Added a test case verifying the `importTranslation` API client endpoint (checks `POST` method and `FormData` structure).
* Translated all previous Finnish test descriptions and comments to English to ensure codebase consistency.

---

## Testing Strategy

### Automated Verification

All quality checks, linters, and unit tests are passing successfully:

```bash
task check
```

**Results**:

* **Backend**: `internal/parsers` package tests passed (100% of XML parser scenarios covered). Statement coverage is at **94.4%** for parsers.
* **Frontend**: ESLint passed with 0 errors. Vitest ran 3 test files and all 18 tests passed.

### Manual Acceptance Tests

| Action | Target URL / Repo | Expected Result |
|---|---|---|
| Click "Install" on KR 1992 | `Beblia/Holy-Bible-XML-Format` | Installs successfully as `fin-1992` (BEBLIA) |
| Click "Install" on KR 1933/38 | `seven1m/open-bibles` | Installs successfully as `fin-biblia-33-38` (OSIS) |
| Search `Joh 3:16` in `fin-1992` | Local API | Returns "Sillä niin on Jumala maailmaa rakastanut..." |
| Search `Joh 3:16` in `fin-biblia-33-38` | Local API | Returns "Sillä niin on Jumala maailmaa rakastanut..." |
