# Copilot review guidance for `mvirtai/clible-v3-go`

## Review priorities
- Focus on correctness first, then performance, then maintainability.
- Treat performance claims as hypotheses to verify, not facts to trust.
- Prefer concise, actionable review comments with a clear severity:
  - **blocker**: correctness, data loss, security, broken behavior
  - **suggestion**: important but non-blocking improvements
  - **nit**: style or minor cleanup only

## What to inspect on backend/performance PRs
- Read the changed function, its immediate callers, and its immediate callees.
- Check nearby tests and add coverage for edge cases introduced by the change.
- Verify algorithmic complexity and allocation behavior in hot paths.
- Be suspicious of:
  - accidental `O(n*m)` memory growth
  - repeated allocations inside loops
  - hidden database round trips
  - full scans when pagination or limits would help
  - benchmark claims that only use a single run

## Benchmark and perf validation
- If the PR mentions benchmark improvements, look for:
  - `go test -bench ... -benchmem`
  - multiple runs when results may be noisy
  - allocation counts, not just runtime
- If the benchmark result looks unusually large or small, call out noise and ask for repeated runs or `benchstat` when appropriate.
- Do not block on perfect benchmark methodology unless the PR’s correctness depends on it.

## Repo-specific rituals
- If the PR includes a user-facing or performance-related change, check whether it also includes:
  - a version bump when expected
  - a PR story or design note when the repo uses one
  - tests that cover the changed behavior
- If the PR description explicitly lists follow-up opportunities, do not raise them as blockers unless they affect the current patch.

## Review style
- Keep comments specific to the changed lines and nearby impact.
- Prefer one comment per distinct issue.
- Do not repeat the PR description unless you are verifying it.
- If something looks risky but not clearly wrong, phrase it as a question or suggestion.

## Fix-or-handoff behavior
For every finding, choose one of two paths.

### Path A: one-click fix
Use a GitHub `suggestion` block when the fix:
- touches only the commented lines, and
- needs no new files, tests, or multi-file changes.

### Path B: agent handoff
If the fix needs multiple files, new or updated tests, a refactor, a benchmark run, or a design decision, do not guess a partial suggestion.
Instead, write the review comment in two parts:
1. A short explanation: what is wrong, why it matters, and severity.
2. A fenced block titled `Copy-paste prompt for coding agent`, using this template:

```text
Repo: <owner>/<repo>
Branch: <PR head branch>   PR: #<number>

Problem:
<one paragraph: what is wrong, with file:line references and the observed or expected behavior>

Root cause (confirmed / suspected):
<state which; if suspected, say what to verify first>

Required changes:
1. <file>: <specific change>
2. <test file>: add/update tests for <cases: empty, boundary, error path, the failing case>
3. <other files if needed, e.g. version bump, docs, PR story>

Constraints:
- Keep the patch minimal; no unrelated refactors.
- Do not change public behavior except: <exception or "none">.
- Do not address these documented follow-ups: <list or "none">.

Validate with:
- <exact commands, e.g. go test ./internal/... -run <Name> -race>
- <benchmark command with -benchmem -count=10, if perf-related>
- task check

Done when:
- <observable acceptance criteria>
- Existing tests still pass and the new tests fail without the fix.

Output:
Push to the existing PR branch (or open a PR against <base>) with a description stating root cause and why the fix is correct.