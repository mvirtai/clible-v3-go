# Pull Request Story: 108 – Technical Design Template and Planning Conventions

## Overview & Business Context

Feature proposals lacked a reusable design document structure, and agent guidance on language policy, plan layout, and Kanban upkeep was implicit. This change adds a Finnish technical design template and codifies the planning conventions so that agents and developers work consistently.

---

## Architectural & System Changes

### 1. Documentation Templates

- Added `pr_stories/templates/TECHNICAL_DESIGN.template.md` covering problem description, proposed solution, alternatives, phased rollout (owners, monitoring, rollback) and success metrics (current state, target, period, source).

### 2. Agent Guidance

- `.agents/AGENTS.md`: mandatory language-policy acknowledgment, educational vs. agent plan guidance, `.plans/<topic>/00-overview.md` + `01-` phase layout, and Kanban currency rules.
- `.agents/workflows/plan_feature.md` and the markdown-kanban skill aligned with the new plan layout.

### 3. Kanban

- `kanban/todos.md` brought up to date with merged PRs #97–#123.

---

## Testing Strategy & Metrics

Documentation-only change; no backend or frontend tests apply. Validated with a structural Markdown check (headings, balanced code fences) and `git diff --check`.
