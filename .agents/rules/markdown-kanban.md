---
trigger: always_on
---

# Markdown Kanban Task Management Rule

When managing, reading, creating, or updating tasks and TODOs in Clible, adhere strictly to the **Markdown Kanban** protocol:

## 1. Multiple Board Search Protocol
- Search for active Kanban boards STRICTLY within the project root (`.plans/TODOS.md`, `kanban/*.md`, `.plans/todos/*.md`).
- NEVER search outside the project repository (do not check `..`, parent directories, or execute system-wide `locate` / `find /`).
- Align task status and descriptions across related boards without desynchronizing metadata.

## 2. Format Specification
All task boards must strictly follow the VS Code Markdown Kanban extension syntax:
- `# <Board Title>` for the board root.
- `## <Column Name>` (`Backlog`, `To Do`, `In Progress`, `Done`) for columns.
- `### <Task Title>` for each task item.
- Metadata under `### <Task Title>` (2 spaces indent):
  - `due: YYYY-MM-DD`
  - `tags: [tag1, tag2]`

  - `priority: high | medium | low`
  - `workload: Easy | Medium | Hard`
  - `defaultExpanded: true | false`
  - `steps:` with nested `- [ ]` checklist items
- Description block inside an indented ` ```md ` code fence.

## 3. Maintenance Policy
- Never revert a Kanban board file to standard markdown bullets (`- [ ] task`).
- Always keep `.plans/TODOS.md` up to date with task progress, linking relevant design documents under `.plans/` in the task descriptions.

## 4. Branch Isolation & PR Lifecycle Protocol (Mandatory for Automated / Terminal Agents)
Whenever an agent transitions a task to `## In Progress` and starts code modifications:
1. **Inspect Active Branch**: Agent must run `git branch --show-current` to identify the current branch.
2. **Never Work in Developer's Active Branch**: Agent **MUST NEVER** make implementation commits or write feature code directly to `main` or to the branch the developer is actively working on.
3. **Dedicated Topic Branch Creation**:
   - Agent must always switch to a fresh, dedicated topic branch:
     ```bash
     git switch -c <type>/<kebab-case-description>
     ```
   - Allowed prefixes: `feat/`, `fix/`, `ui/`, `refactor/`, `chore/`, `test/`, `perf/`.
4. **Scoped Quality Gates & Version Bump**:
   - Run relevant quality checks (`task frontend:check`, `task backend:check` or `task check`).
   - Remind the developer of semantic version bump (`task version:bump PART=patch|minor`).
5. **PR Story & Automated PR Creation**:
   - Create a Pull Request Story under `pr_stories/<seq>-<type>-<description>.md`.
   - Open the PR cleanly using:
     ```bash
     task git:pr FILE=pr_stories/<story-file>.md TITLE="<type>: <description in english>"
     ```
   - This ensures 100% WIP isolation and prevents agent changes from colliding with developer work.

## 5. Report me that this rule is read and enforced!