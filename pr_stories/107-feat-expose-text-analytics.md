# Pull Request Story: 107 - expose existing text analytics

## Overview & Business Context

This draft planning PR defines how existing backend text analytics will become visible in the React analytics workspace and discoverable in ISLA. The implementation will expose n-gram frequencies and character counts, align the ISLA stats payload, and document Finnish lemma clustering commands.

---

## Architectural & System Changes

### 1. Analytics presentation

- Render the existing word, bigram, and trigram frequency datasets in the analytics workspace.
- Add character count to the statistical summaries.

### 2. ISLA analytics contract

- Align the unique-token field name between the `new_dsl` executor and the stats result card.
- Make `.lemma()`, `.cluster()`, and `.categorize()` discoverable in ISLA autocomplete and documentation.

### 3. Scope boundary

- No implementation code is included in this draft PR.
- No database migration, API route, or dependency change is planned.

---

## Testing Strategy & Metrics

Implementation validation will include targeted Go executor tests, frontend component and autocomplete tests, then `task backend:check`, `task frontend:check`, and `task check`. No automated checks apply to this planning-only commit.
