---
name: markdown-kanban
description: Searches for multiple todo/kanban boards before editing and uses the Markdown Kanban extension format for task management in Clible.
---

# Markdown Kanban Skill

This skill governs task management, sprint tracking, and backlog coordination using the VS Code **Markdown Kanban** format.

---

## 1. Discovery Protocol: Search Strictly Within Workspace

Whenever tasks, todos, or backlog items are inspected, created, or updated:

1. **Search strictly within project root**: Check only workspace-relative boards:
   - Primary board: `.plans/TODOS.md`
   - Additional boards: `kanban/*.md`, `.plans/todos/*.md`
   - **STRICT PROHIBITION**: Never execute system-wide search tools (e.g. `locate`, `find /`, `whereis`) and never search parent directories (`../`).
2. **Respect board structure**: Never overwrite or degrade a Markdown Kanban board into plain bullet points or unstructured lists.

---

## 2. Markdown Kanban File Format

Markdown Kanban boards are standard markdown files structured specifically for the VS Code Markdown Kanban extension:

```markdown
# Board Title

## To Do

### Task Title

  - due: YYYY-MM-DD
  - tags: [tag1, tag2, tag3]
  - priority: high | medium | low
  - workload: Easy | Medium | Hard
  - defaultExpanded: true | false
  - steps:
      - [ ] Incomplete step
      - [x] Completed step
    ```md
    Task details, requirements, links, and architectural notes go here.
    ```

## In Progress

### Active Task

  - due: YYYY-MM-DD
  - tags: [backend, api]
  - priority: high
  - workload: Medium
  - defaultExpanded: true
  - steps:
      - [x] Database migration
      - [ ] Service endpoint
    ```md
    Implementation details...
    ```

## Done

### Completed Task

  - due: YYYY-MM-DD
  - tags: [setup]
  - priority: low
```

### Key Elements

- **Board Title**: H1 (`# Board Title`) defines the board name.
- **Columns**: H2 (`## Backlog`, `## To Do`, `## In Progress`, `## Review`, `## Done`) define Kanban columns. Columns can be reordered or hidden in the VS Code UI.
- **Tasks**: H3 (`### Task Name`) defines each card.
- **Metadata**: Indented two spaces under the H3 header:
  - `due: YYYY-MM-DD` — Target completion date.
  - `tags: [tag1, tag2]` — Comma-separated array used for filtering and visual badges.
  - `priority: high | medium | low` — Priority flag.
  - `workload: Easy | Medium | Hard` — Complexity estimation.
  - `defaultExpanded: true | false` — Whether the card opens expanded by default.
  - `steps:` — Subtask checklist with `- [ ]` and `- [x]`.
- **Description Block**: Indented markdown fence (````md ...````) containing rich markdown, links to plans (`.plans/...`), code references, and instructions.

---

## 3. Workflow Integration

- **Adding Tasks**: Place new tasks under `## To Do` or `## Backlog` with relevant tags (`frontend`, `backend`, `security`, `ui`, `i18n`, `performance`, `isla`).
- **Moving Tasks**: When starting work, move the task card under `## In Progress`. When completed and verified by quality gates, move under `## Done`.
- **Subtasks**: Update `steps:` checklist items as milestone stages complete.
- **Plan References**: Always link detailed architectural plans (`.plans/*.md`) in the task's description block.

---

## 4. Branch Isolation & PR Lifecycle Protocol (Agent Execution Safety)

To ensure terminal or autonomous agents never write or commit directly to the developer's working branch:

1. **Check Current Branch**:
   ```bash
   git branch --show-current
   ```
2. **Isolate Work in a New Topic Branch**:
   The agent **MUST NEVER** execute feature tasks directly in `main` or the branch the developer is actively using.
   Always switch to a dedicated topic branch:
   ```bash
   git switch -c <type>/<kebab-case-description>
   ```
   *Examples:* `feat/user-settings-page`, `ui/semantic-swipe-triage`.
3. **Execute & Verify via Quality Gates**:
   Run scoped checks (`task frontend:check`, `task backend:check` or `task check`).
4. **Draft PR Story**:
   Write the PR story under `pr_stories/<seq>-<type>-<kebab-case-description>.md`.
5. **Open Pull Request**:
   Use Taskfile automation to push and open the PR:
   ```bash
   task git:pr FILE=pr_stories/<story-file>.md TITLE="<type>: <description in english>"
   ```
   This keeps developer WIP completely isolated and clean.
