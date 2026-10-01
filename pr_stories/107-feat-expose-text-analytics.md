# Pull Request Story: 107 - expose existing text analytics

## Overview & Business Context

This PR makes existing backend text analytics visible in the React analytics workspace and discoverable in ISLA. It exposes n-gram frequencies and character counts, aligns the ISLA stats payload, and documents Finnish lemma clustering commands.

---

## Architectural & System Changes

### 1. Analytics presentation

- Add a word, bigram, and trigram selector to the analytics workspace while reusing its existing chart and word-cloud renderers.
- Keep a dedicated word cloud visible alongside the chart while the chart selector changes frequency level.
- Render bigrams and trigrams in a full-width bar chart so phrases and their relative frequencies remain readable without horizontal scrolling.
- Add character count to the statistical summary cards.
- Keep frequency-data selection as a pure derived helper with focused unit coverage.

### 2. ISLA analytics contract

- Read the executor's canonical `unique_token_count` field in the ISLA stats result card and render character count.
- Add `.ngrams(2, N)` and `.ngrams(3, N)` to ISLA. The executor reuses the canonical bigram and trigram analytics when available, with a deterministic local fallback for cell context.
- Render ISLA n-gram results in the existing frequency card, with localized bigram and trigram headings.
- Complete `.ngrams()` from IntelliSense with a valid starter expression, guided size and result-limit suggestions, and bilingual hover documentation.
- Show the full n-gram phrase on hover when its result-card label is truncated; syntax-highlight `ngrams` as an ISLA method.
- Make `.lemma()`, `.cluster()`, and `.categorize()` discoverable in ISLA autocomplete and hover documentation.
- Add executor coverage for the `unique_token_count` and `character_count` stats payload fields.
- Document ISLA n-gram syntax, argument limits, valid examples, and common mistakes in the VitePress language guide and specification.

### 3. Scope boundary

- No database migration, API route, or dependency change is planned.

---

## Testing Strategy & Metrics

### Automated Backend Tests

`task backend:check` passed. The backend unit suite completed successfully with 77.0% statement coverage.

### Automated Frontend Tests

`task frontend:check` passed: TypeScript and ESLint completed successfully, then Vitest completed with 50 test files and 380 tests passing.

`task check` was not run because its backend and frontend constituent checks had already passed and duplicate execution was declined.

The focused ISLA backend packages passed with `go test ./new_dsl ./internal/services`. The TypeScript build and the focused ISLA result, autocomplete, and lexer Vitest suites passed.

`task docs:build` passed after the VitePress documentation update.

After adding the argument completions and hover details, `task frontend:lint` passed and the focused ISLA result, autocomplete, and lexer suites passed with 66 tests.
