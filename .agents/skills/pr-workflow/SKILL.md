---
name: pr-workflow
description: Prepare or execute a lean branch, commit, and pull request workflow using repo conventions first, with conventional commits and concise PR updates.
---

# PR Workflow

Use this skill when the user asks to start work on a branch, prepare commits, open or update a pull request, or clean up after merge.

## Process

1. Detect repo conventions first:
   - `Taskfile`, `Makefile`, scripts, PR templates, story files, branch rules
2. Prefer repo automation when present. Otherwise use plain `git` and `gh`.
3. Use modern Git commands:
   - `git switch -c <branch>`
   - `git restore ...`
4. Default branch naming:
   - `<type>/<kebab-case-description>`
   - common types: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`, `perf`, `ui`
5. Default commit and PR titles:
   - Conventional Commits
   - example: `fix: handle empty response body`
6. Group commits by subject area:
   - Keep each commit focused on one coherent topic; stage only files that belong to that topic.
   - Split independent concerns into separate commits instead of combining them in a catch-all commit.
   - Keep tightly coupled implementation, tests, and documentation together when they serve the same topic.
7. Before opening or updating a PR:
   - run the repo's relevant quality gate
   - make sure the PR description or story matches the latest truth
8. If changes touch security-sensitive areas, load `security-review`.
9. After merge, only if asked:
   - sync the base branch
   - delete the merged local branch
   - note any follow-up work

## Output

Keep PR summaries concise:
- what changed
- why
- how it was validated
