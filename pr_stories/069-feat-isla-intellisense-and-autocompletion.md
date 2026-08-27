# PR Story: ISLA IntelliSense Engine, Cross-Reference Classification, and Single Source of Truth Versioning

## Business Context

As part of the ISLA (Interactive Scripture Language Architecture) IDE experience in Clible-v3 notebooks, users require real-time interactive autocompletion and contextual syntax suggestions. Without intelligent autocompletion, composing DSL directives (such as ternary comparisons, scoped FTS searches, metric pipelines, book references, cross-references, and regex searches) requires manual syntax memorization, increasing cognitive load and error rates.

Furthermore, this PR resolves semantic classification ambiguities in the notebook ecosystem by cleanly designating `!~` and `~` as deterministic **Cross-Reference** (`refs`) queries rather than external AI calls, aligning UI badges with actual system behavior. In addition, it establishes a **Single Source of Truth (SSOT)** versioning architecture where the application version (`v3.1.1`) is extracted directly from the root [`VERSION`](file:///home/vivaldev/code/clible-v3-go/VERSION) file at compile-time and dynamically rendered in the application header.

---

## Architectural & Process Flows

### 1. Cursor Context & Suggestion Dispatch Flow

```mermaid
sequenceDiagram
    participant User as Notebook Editor (User)
    participant Engine as ISLA IntelliSense (getISLASuggestions)
    participant Catalog as Metadata Catalog (islaUtils)
    participant UI as Autocomplete Overlay Dropdown

    User->>Engine: Input Change or Cursor Move (lineText, cursorOffset)
    Engine->>Engine: Slice Text (textBeforeCursor = lineText[0..cursorOffset])
    alt Line starts with ! or empty
        Engine-->>UI: Return ISLA_MAIN_SNIPPETS (Template cards)
    else Line starts with quick directive (!?, !~, !^)
        Engine-->>UI: Return Filtered Templates (Search / Cross-refs / Scope)
    else Preceding token is @ (e.g. @Joh, @1Moos, @VT)
        Engine->>Catalog: Filter BIBLE_BOOKS by prefix (abbr, nameFi, nameEn, id)
        Catalog-->>Engine: Matching BibleBookSuggestionItems
        Engine-->>UI: Map to ISLASuggestion array (kind: reference)
    else Preceding token is => (e.g. => count, => #themes, => KR92)
        Engine->>Catalog: Filter APP_TRANSLATIONS + Pipeline Operations
        Catalog-->>Engine: Matching TranslationSuggestionItems
        Engine-->>UI: Return Functions, Keywords & Translation Targets
    else Preceding token is ? or : (e.g. ? KR92 : KJV)
        Engine->>Catalog: Filter APP_TRANSLATIONS by prefix
        Catalog-->>Engine: Matching TranslationSuggestionItems
        Engine-->>UI: Return Translation Targets (kind: translation)
    else No trigger pattern matches
        Engine-->>UI: Return empty array (Fallback silent state)
    end
    UI-->>User: Render Interactive Completion Popup with Fi/En Docs
```

### 2. Suggestion Classification & SSOT Architecture

```mermaid
graph TD
    A["Input Cursor Position"] --> B{"Trigger Token Pattern"}
    B -->|"Empty or ! / !isla"| C["ISLA_MAIN_SNIPPETS"]
    B -->|"!? / !~ / !^ Quick Directives"| C2["Filtered Specific Snippets"]
    B -->|"@ Book Reference"| D["BIBLE_BOOKS Catalog"]
    B -->|"=> Pipeline Operator"| E["Pipeline Aggregators & Limits"]
    B -->|"?: Comparison"| F["APP_TRANSLATIONS Catalog"]
    B -->|"No Match"| G["Empty Array Fallback"]
    
    C --> H["Unified ISLASuggestion Array"]
    C2 --> H
    D --> H
    E --> H
    F --> H
    G --> H

    subgraph SSOT_Versioning ["SSOT Versioning"]
        V["root /VERSION 3.1.1"] -->|"fs.readFileSync"| VC["frontend/vite.config.ts"]
        VC -->|"define __APP_VERSION__"| VT["frontend/src/utils/version.ts"]
        VT -->|"APP_VERSION"| AH["frontend/src/components/layout/AppHeader.tsx"]
    end
```

---

## Architectural & UX Changes

### 1. Dedicated ISLA Metadata Registry ([`islaUtils.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/isla/islaUtils.ts))

- **Single Source of Truth:** Dynamically maps all 66 Bible books from `bible_structure.json` alongside `bookNames.ts` helpers (`bookCitationAbbrevFi`, `bookNameLocalized`, `bookName`), generating clean abbreviations for ISLA references (e.g. `@Joh`, `@1Moos`, `@Gen`).
- **Testament-Level Scoping:** Built-in support for testament scopes (`@VT`, `@UT`, `@OT`, `@NT`) for broad queries such as `!? "armo" @ut => count`.
- **Accurate Translation Catalog:** Pre-configured with the application's actual installed Bible translations and ISLA code aliases:
  - `fin-1992` → `KR92` (Kirkkoraamattu 1992)
  - `fin-biblia-33-38` → `KR38` (Kirkkoraamattu 1933/38)
  - `fin-1776` → `1776` (Biblia 1776)
  - `eng-web` → `WEB` (World English Bible)
  - `kjv` → `KJV` (King James Version)

### 2. Contextual Autocompletion Engine ([`islaIntellisense.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/isla/islaIntellisense.ts))

- **Rich Dual-Language Documentation:** Each suggestion provides bilingual descriptions (`fi` and `en`) and syntax usage examples.
- **Strictly Active Feature Set:** Autocompletes all 100% verified backend executor directives:
  - Verse lookups (`!@Joh 3:16 => KR92`)
  - Ternary comparisons (`!@Joh 3:16 ? KR92 : KR38`)
  - Cross-references (`!~ @Joh 3:16`)
  - Scoped full-text search (`!? "valkeus" @Joh => limit:5`)
  - Regex morphology queries (`!? /righteous.*/ @Rom => limit:5`)
  - Contextual themes & tag clouds (`!^ => #themes`)
  - Dynamic limit parameters (`limit:3`, `limit:5`, `limit:10`)
- **Quick Prefix Recognition:** Typing `!?`, `!~`, or `!^` instantly presents the corresponding categorized template suggestions.
- **Dynamic Translation Scoping:** Accepts an optional `availableTranslations` parameter to constrain suggestions to active user translations while providing safe fallbacks.

### 3. Cross-Reference Classification & Badge Normalization

- **Semantic Realignment:** Replaced misleading `ai` category labels in [`islaClassifier.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/utils/islaClassifier.ts) with `refs` for `~`, `!~`, and `refs` commands.
- **UI Consistency:** Updated [`CellBadge.tsx`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/cells/CellBadge.tsx) and [`SortableNotebookCard.tsx`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/SortableNotebookCard.tsx) to render link icons (`🔗`) and localized badges (**Viitteet** / **Refs**).

### 4. Single Source of Truth Application Versioning (`v3.1.1`)

- **Vite Build-time Injection:** Configured [`vite.config.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/vite.config.ts) to read the root [`VERSION`](file:///home/vivaldev/code/clible-v3-go/VERSION) file (`3.1.1`) and define `__APP_VERSION__` for runtime consumption.
- **Dynamic Header Binding:** Replaced the hardcoded `v3` string in [`AppHeader.tsx`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/layout/AppHeader.tsx) with dynamic `v{APP_VERSION}`.
- **Automated Bump Safety:** Hardened `version:bump` task in [`Taskfile.yml`](file:///home/vivaldev/code/clible-v3-go/Taskfile.yml) with exact-match regular expressions to maintain syntactic validity.

### 5. Project Configuration & TypeScript 7.0 Readiness

- Configured `@/*` path alias in [`tsconfig.app.json`](file:///home/vivaldev/code/clible-v3-go/frontend/tsconfig.app.json) using standard `"@/*": ["./src/*"]` without deprecated `baseUrl`, and [`vite.config.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/vite.config.ts) using `node:path`.

---

## 📈 Improvement Metrics & Key Figures

* **Test Coverage:** `islaIntellisense.ts` achieved **100% statements, 100% branches, 100% functions, 100% lines**.
* **Metadata Coverage:** `islaUtils.ts` achieved **100% statements, 100% branches, 100% functions, 100% lines**.
* **Engine Execution Speed:** Sub-millisecond synchronous evaluation ($O(N)$ with $N \le 70$), ensuring zero typing stutter or frame drops.
* **Test Suite Status:** All 25 test suites and 135 unit/integration tests passing cleanly.

---

## Security & Compliance

* **Memory Safety & Sandbox Execution:** Pure in-memory lexical parsing without dynamic `eval()`, DOM script injection, or unsafe regex backtracking vulnerabilities.
* **Input Sanitization:** Regex matching restricts lookbacks to safe ASCII and unicode alphanumeric character classes.
* **Zero Leaks:** Client-side static suggestions do not transmit incomplete search keystrokes across the network.

---

## Files Changed

| File | Change Summary |
|------|----------------|
| [`VERSION`](file:///home/vivaldev/code/clible-v3-go/VERSION) | Bumps application version to `3.1.1`. |
| [`Taskfile.yml`](file:///home/vivaldev/code/clible-v3-go/Taskfile.yml) | Hardens `version:bump` task replacement patterns. |
| [`backend/internal/version/version.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/version/version.go) | Updates Go backend version constant to `3.1.1`. |
| [`frontend/package.json`](file:///home/vivaldev/code/clible-v3-go/frontend/package.json) | Updates frontend package version to `3.1.1`. |
| [`frontend/vite.config.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/vite.config.ts) | Extracts `VERSION` file and defines compile-time `__APP_VERSION__`; configures `@/*` alias. |
| [`frontend/src/vite-env.d.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/vite-env.d.ts) | Declares global `__APP_VERSION__` constant for TypeScript. |
| [`frontend/src/utils/version.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/utils/version.ts) | Exports `APP_VERSION` sourced from compile-time `__APP_VERSION__`. |
| [`frontend/src/components/layout/AppHeader.tsx`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/layout/AppHeader.tsx) | Binds header logo version badge to dynamic `APP_VERSION` instead of hardcoded `v3`. |
| [`frontend/src/components/layout/AppHeader.test.tsx`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/layout/AppHeader.test.tsx) | Asserts dynamic `v3.1.1` rendering in header unit tests. |
| [`frontend/src/components/notebook/isla/islaIntellisense.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/isla/islaIntellisense.ts) | Implements `ISLASuggestion` data model, `ISLA_MAIN_SNIPPETS` with cross-references, and `getISLASuggestions` engine with prefix filtering. |
| [`frontend/src/components/notebook/isla/islaUtils.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/isla/islaUtils.ts) | Defines `BIBLE_BOOKS` registry and `APP_TRANSLATIONS` catalog with bilingual metadata. |
| [`frontend/src/components/notebook/isla/islaIntellisense.test.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/isla/islaIntellisense.test.ts) | Comprehensive test suite covering snippets, prefixes (`!?`, `!~`, `!^`), book references, pipeline operators, comparisons, and fallbacks. |
| [`frontend/src/utils/islaClassifier.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/utils/islaClassifier.ts) | Replaces legacy `ai` category with accurate `refs` cross-reference classification. |
| [`frontend/src/utils/islaClassifier.test.ts`](file:///home/vivaldev/code/clible-v3-go/frontend/src/utils/islaClassifier.test.ts) | Unit tests verifying `refs` classification across queries, cells, and notebook summaries. |
| [`frontend/src/components/notebook/cells/CellBadge.tsx`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/cells/CellBadge.tsx) | Updates category badges and labels to render `Refs` / `Viitteet` 🔗. |
| [`frontend/src/components/notebook/cells/MarkdownCell.tsx`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/cells/MarkdownCell.tsx) | Aligns cross-reference shorthand documentation and processing. |
| [`frontend/src/components/notebook/SortableNotebookCard.tsx`](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/SortableNotebookCard.tsx) | Aligns 2D matrix canvas card previews to `refs` theme styling. |
| [`frontend/tsconfig.app.json`](file:///home/vivaldev/code/clible-v3-go/frontend/tsconfig.app.json) | Configures `"@/*": ["./src/*"]` without deprecated `baseUrl`. |
| [`Dockerfile`](file:///home/vivaldev/code/clible-v3-go/Dockerfile) | Copies root `VERSION` into frontend build stage for reproducible multi-stage Docker builds. |

---

## Testing Strategy

### Automated Test Results

#### Frontend (Vitest Suite with Coverage)

```text
Test Files  25 passed (25)
     Tests  135 passed (135)
  Duration  8.52s

% Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
.../notebook/isla  |   91.97 |    87.34 |   91.66 |   92.69 |                   
 islaIntellisense  |     100 |      100 |     100 |     100 |                   
 islaUtils.ts      |     100 |      100 |     100 |     100 |                   
 islaLexer.ts      |   89.09 |    84.04 |     100 |   88.99 | ...               
-------------------|---------|----------|---------|---------|-------------------
```

#### Backend (Go Test Suite)

```text
ok  	github.com/mvirtai/clible-v3-go/internal/api	(cached)
ok  	github.com/mvirtai/clible-v3-go/internal/config	(cached)
ok  	github.com/mvirtai/clible-v3-go/internal/db	(cached)
ok  	github.com/mvirtai/clible-v3-go/internal/dsl	(cached)
ok  	github.com/mvirtai/clible-v3-go/internal/parsers	(cached)
ok  	github.com/mvirtai/clible-v3-go/internal/services	(cached)
```

---

## Manual Verification Checklist

1. **Snippet Triggers:** Verified typing `!`, `!isla`, or starting a new line suggests template cards (`!@Joh 3:16 ? KR92 : KR38`, `!@Joh 3:16 => KR92`, `!~ @Joh 3:16`, `!? "armo" @ut => count`, `!? /righteous.*/ @Rom => limit:5`, `!^ => #themes`).
2. **Quick Prefix Triggers:** Verified typing `!?` triggers search templates, `!~` triggers cross-reference templates, and `!^` triggers context theme templates.
3. **Book Completion:** Verified typing `@joh`, `@1m`, `@room`, `@VT`, `@UT` suggests corresponding books with localized names and descriptions.
4. **Pipeline Completion:** Verified typing `=> ` suggests `count`, `#themes`, `limit:3`, `limit:5`, `limit:10`, and translations (`KR92`, `KR38`, `1776`, `WEB`, `KJV`).
5. **Comparison Targets:** Verified typing `? ` or `: ` suggests comparative translations.
6. **Cross-Reference Badges:** Verified cells containing `!~` or `~` render `Viitteet` / `Refs` 🔗 badge pill.
7. **Dynamic Version Header:** Verified the header logo displays `v3.1.1` dynamically from `VERSION`.
