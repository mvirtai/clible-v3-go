---
applyTo: "**"
---
# Review findings: fix or hand off

For every finding, pick one path.

## Path A: one-click fix
Use a GitHub `suggestion` block when the fix:
- touches only the commented lines, and
- needs no new files, tests, or multi-file changes.

## Path B: agent handoff
If the fix needs multiple files, new or updated tests, a refactor, a benchmark run, or a design decision, don't guess a partial suggestion.
Write the comment in two parts:
1. A one to three sentence explanation: what is wrong, why it matters, severity (blocker / suggestion / nit).
2. A fenced block titled `Copy-paste prompt for coding agent`, using the template below.

### Template

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
```

## Rules for writing the prompt
- Make it self-contained. The agent has not seen the review thread.
- Name exact files, functions and line ranges. Never write "fix the issue above."
- Include only verified facts. Mark anything unverified as "suspected."
- Give runnable validation commands, not "run the tests."
- Group related findings into one prompt only if they touch the same code. Otherwise write separate prompts.
- If the right fix is ambiguous, list the options with a recommended default, and ask the human to choose before handoff.
- Never include secrets, tokens or private URLs.

## Summary comment
At the end of the review, add a table of all Path B findings:

| # | Severity | Finding | Files | Prompt location |
|---|---|---|---|---|

Mark blockers first.