# Pull Request Story: 106 – Run the Frontend Test Suite in CI

## Overview & Business Context

`frontend/package.json` has defined a `test` script (`vitest run`) for some time, and the repository currently carries 49 Vitest suites covering 379 assertions across components, services, and ISLA utilities. None of that coverage was ever executed by continuous integration: the `frontend-pipeline` job in `.github/workflows/ci.yml` only ran `tsc --noEmit`, `pnpm lint`, and `pnpm build`. A pull request could regress component behavior, break a service contract, or silently corrupt the ISLA intellisense logic, and as long as the code still typechecked, linted, and bundled, CI would report green.

This closes that gap by inserting a dedicated `pnpm test` step into the existing frontend pipeline, so the Vitest suite becomes a required, blocking gate alongside the type and lint checks it already runs next to.

---

## Architectural & System Changes

### 1. CI Workflow (`.github/workflows/ci.yml`)

- Added a `Run frontend test suite` step (`run: pnpm test`) to the `frontend-pipeline` job, placed after `Run ESLint quality code gates` and before `Execute production build smoke-test` — tests gate the build the same way lint already does, and both run before the more expensive build step.
- No new job, runner, or dependency setup was needed: the step reuses the job's existing `pnpm/action-setup` + `actions/setup-node` (with `pnpm` cache) and the `pnpm install --frozen-lockfile` step already present.

---

## Testing Strategy & Metrics

### Automated Frontend Tests

Verified by letting the new step run for real on GitHub Actions (job `Frontend Quality & Build Verification`, part of PR #117's CI run) rather than only locally, confirming the step wiring, caching, and working directory are all correct in the actual CI environment:

```text
 RUN  v4.1.11 /home/runner/work/clible-v3-go/clible-v3-go/frontend

 ✓ src/services/api.test.ts (16 tests) 22ms
 ✓ src/components/notebook/isla/islaIntellisense.test.ts (45 tests) 21ms
 ✓ src/utils/liturgicalIslaExport.test.ts (20 tests) 14ms
 ... (49 test files total)

 Test Files  49 passed (49)
      Tests  379 passed (379)
   Duration  11.83s (transform 1.54s, setup 495ms, import 7.36s, tests 4.06s, environment 15.09s)
```

The job's subsequent steps (`tsc --noEmit`, `pnpm build`) also passed on the same run, and the sibling `backend-pipeline` and `docker-pipeline` jobs were unaffected, confirming no cross-job coupling was introduced.

### Files Changed

| File | Changes |
| :--- | :--- |
| `.github/workflows/ci.yml` | Added `Run frontend test suite` (`pnpm test`) step to `frontend-pipeline`, between lint and build |
| `pr_stories/106-ci-run-frontend-test-suite-in-pipeline.md` | Documented PR story and verification metrics |
