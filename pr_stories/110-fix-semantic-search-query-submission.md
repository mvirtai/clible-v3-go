# PR Story: 110 – Preserve Semantic Search Queries During Submission

## Overview & Business Context

Semantic search accepts a natural-language query through a controlled input and submits it with React 19's form `action` API. The search action reads the submitted `query` from `FormData`; clearing the input on the submit button's click introduced an unnecessary state mutation at the exact moment that value was being handed to the action. In the observed flow, the query disappeared as the search began, obscuring whether the request had received the user's intent.

This fix removes that competing side effect. The input remains the source of truth while the form action captures and processes the submitted value, keeping the user-visible field and the action payload aligned through the pending transition.

---

## Architectural & System Changes

### Semantic search form lifecycle

- Removed the submit button's `onClick` handler that reset `queryInput` before the form action completed its submission work.
- Kept query ownership in the controlled input (`value` / `onChange`) and submission in the existing `action={searchAction}` form; the action continues to trim and read `query` from `FormData`.
- Left the pending-state behavior unchanged: `useActionState` still disables the button and displays the existing loading label while the request is in progress.
- No API, backend, or search-result behavior was changed.

The important boundary is the form action's submitted value: cleanup should not run from the submit button before that boundary has consumed the input. This change removes the competing event-side mutation rather than duplicating query state or adding submission-specific plumbing.

---

## Testing Strategy & Metrics

### Automated Frontend Tests

Ran `task frontend:test` after the change. The complete Vitest suite passed; no new test file or backend behavior was introduced by this UI-only fix.

```text
Test Files  51 passed (51)
     Tests  394 passed (394)
  Duration  23.79s (transform 8.97s, setup 3.15s, import 34.14s, tests 20.29s, environment 71.86s)
```

### Manual Verification

The interaction was reproduced before the fix: submitting a typed semantic-search query cleared the input immediately. A post-fix browser/API round trip was not verified as part of this change; the automated suite is the verification reported here.

---

## Files Changed

| File | Change Summary |
|------|----------------|
| `frontend/src/components/search/AiSemanticSearch.tsx` | Removed the submit-click state reset so the native form action can consume the controlled query without a competing clear. |
| `pr_stories/110-fix-semantic-search-query-submission.md` | Records the observed failure mode, design choice, scope, and verified test output. |
