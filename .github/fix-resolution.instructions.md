---
applyTo: "**/*"
---
# Fix-resolution instructions for agents

## Goal
When working on a bug fix, issue resolution, or follow-up patch, optimize for correctness, completeness, and minimal scope.

## Required behavior
- Start by identifying the smallest code path that explains the bug or failure.
- Read the direct callers, direct callees, and any tests that already cover the affected flow.
- Prefer changing the narrowest layer that fixes the root cause.
- Preserve existing public behavior unless the issue explicitly calls for a behavior change.
- If the fix changes output, state, or side effects, add or update tests that prove the new behavior and protect against regression.
- Keep the patch focused on the reported problem; avoid opportunistic refactors.

## Context-awareness
- Use the issue, PR description, stack trace, failing test, or reproduction steps as the primary source of truth.
- Verify assumptions against code, not memory.
- If the repository already documents follow-up work, do not treat it as part of the fix unless the current issue depends on it.
- If multiple bugs are present, separate the root cause from secondary symptoms before editing code.

## Debugging and validation
- Reproduce the failure when possible before changing code.
- After a fix, validate the exact failing path first.
- Add regression tests for:
  - empty inputs
  - boundary conditions
  - error paths
  - previously failing cases
- If the change touches performance-sensitive code, confirm it does not introduce obvious allocation or complexity regressions.
- Prefer targeted validation over broad, expensive test runs unless the issue spans many modules.

## Review-quality expectations
- Keep changes as small and understandable as possible.
- Leave a brief note in the PR or commit message explaining root cause and why the fix is correct.
- If there is a tradeoff, explain it explicitly.
- Avoid unrelated cleanup, naming churn, or large refactors in the same patch.

## Escalation rules
- If the root cause cannot be confirmed from the available context, stop and ask for more information rather than guessing.
- If a fix would require changing behavior outside the reported issue, call that out before implementing it.
- If multiple possible fixes exist, choose the least risky one first.

## Final checklist
- [ ] Root cause identified
- [ ] Minimal fix applied
- [ ] Regression test added or updated
- [ ] Behavior verified on the failing path
- [ ] No unrelated refactor included