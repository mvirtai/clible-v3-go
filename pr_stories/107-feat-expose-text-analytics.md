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
- Make `.lemma()`, `.cluster()`, and `.categorize()` discoverable in ISLA autocomplete and hover documentation.
- Add executor coverage for the `unique_token_count` and `character_count` stats payload fields.

### 3. Scope boundary

- No database migration, API route, or dependency change is planned.

---

## Testing Strategy & Metrics

### Automated Backend Tests

`task backend:check` passed. The backend unit suite completed successfully with 77.0% statement coverage.

### Automated Frontend Tests

`task frontend:check` passed: TypeScript and ESLint completed successfully, then Vitest completed with 50 test files and 380 tests passing.

`task check` was not run because its backend and frontend constituent checks had already passed and duplicate execution was declined.
