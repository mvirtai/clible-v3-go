---
name: clible-skills
description: >-
  Root-level skill index and discovery hub for the Clible v3 agent workspace.
  Lists domain, integration, utility, and plugin-installed Google Cloud skills
  with on-demand loading. Use when choosing which `.agents/skills/` skill to
  read, discovering available Clible agent capabilities, or resolving skill
  paths without loading every SKILL.md.
---

# Clible v3 — Agent Skills Index

Root-level skill discovery file for `.agents/skills/`.
Read this file to choose a skill, then open only the matching `SKILL.md`.
Do not load every skill. Nested files under `skills/` are bundled with this
index; keep them in place when editing these instructions.

Related non-skill workflow: [workflows/plan_feature.md](workflows/plan_feature.md)
(Finnish feature-planning workflow for `.plans/`).

## Skill Loading Protocol

1. **On-demand loading**: Read a skill `SKILL.md` only when its domain matches the current task.
2. **Clible-first**: For Clible product work, start with `clible-v3-expert`, then add `code-review` or `clible-quality-gates` as needed.
3. **One skill at a time**: Prefer the single best match; load a second skill only for a distinct sub-task.
4. **Recursion**: This file is the root index. Each skill `SKILL.md` contains its own instructions.

### Route by task

| Task | Load |
|---|---|
| Architecture, Go/React/Neon/ISLA overview | `clible-v3-expert` |
| `task check`, tests, lint, coverage, version bump | `clible-quality-gates` |
| Code review of Clible changes | `code-review` |
| ISLA v2 DSL grammar or notebook execution | `isla-dsl-architecture` |
| React 19.2 / React Compiler rules | `react-compiler-audit` |
| `pr_stories/` audit | `pr-story-reviewer` |
| Markdown Kanban / `.plans/TODOS.md` | `markdown-kanban` |
| Speechify TTS integration | `speechify-tts` |
| Broken skill install / `manifest.json` | `skill-repair` |
| GCP / BigQuery / GCS plugin work | matching Data Agent Kit skill below |

## Clible Domain Skills

Project-specific skills for the Clible v3 codebase:

| Skill | Path | Description |
|---|---|---|
| **clible-v3-expert** | [SKILL.md](skills/clible-v3-expert/SKILL.md) | Solution Architect guide: Go 1.22+ backend, React 19.2 + React Compiler, ISLA v2, Neon PostgreSQL, release hygiene. |
| **clible-quality-gates** | [SKILL.md](skills/clible-quality-gates/SKILL.md) | Taskfile automation, Go and Vitest suites, linter, coverage, semantic version bumps. |
| **code-review** | [SKILL.md](skills/code-review/SKILL.md) | Architectural, security, and quality review against Clible backend, React Compiler, dual-DB, and i18n rules. |
| **isla-dsl-architecture** | [SKILL.md](skills/isla-dsl-architecture/SKILL.md) | ISLA v2 object-method DSL architecture and grammar for notebooks. |
| **react-compiler-audit** | [SKILL.md](skills/react-compiler-audit/SKILL.md) | Enforces zero `useEffect` for state sync, `useSyncExternalStore`, `useActionState`, derived state, full i18n. |
| **pr-story-reviewer** | [SKILL.md](skills/pr-story-reviewer/SKILL.md) | Fresh-eyes review of `pr_stories/` markdown: facts, tone, verified tests, purposeful diagrams. |
| **markdown-kanban** | [SKILL.md](skills/markdown-kanban/SKILL.md) | Finds existing kanban boards and edits the Markdown Kanban extension format. |

## Integration Skills

| Skill | Path | Description |
|---|---|---|
| **speechify-tts** | [SKILL.md](skills/speechify-tts/SKILL.md) | Speechify Text-to-Speech API examples for Node.js, Python, and cURL. |

## Utility Skills

| Skill | Path | Description |
|---|---|---|
| **skill-repair** | [SKILL.md](skills/skill-repair/SKILL.md) | Repair failed skill installs and update `manifest.json` after a fix. |

## Google Cloud / Data Agent Kit Skills (plugin-installed)

Installed via the Data Agent Kit plugin. Available but not Clible-specific.
Load only the named skill whose domain matches the GCP task.

- `accidental-data-loss-prevention`, `bigquery-ai-ml`, `bigquery-bigframes`, `bigquery-data-transfer-service`
- `bigquery-graph-author`, `bigquery-graph-query`, `bigquery-sql`
- `building-data-apps`, `data-autocleaning`, `dataform-bigquery`
- `discovering-gcp-data-assets`, `gcp-data-pipelines`, `gcp-dataflow`
- `gcp-managed-spark-upgrades`, `gcp-pipeline-orchestration`, `gcp-pipeline-resource-provisioning`
- `gcp-spark-troubleshooting`, `gcs-security-assessment`
- `google-cloud-auth-verification`, `google-cloud-storage-basics`
- `google-cloud-storage-bucket-architect`, `google-cloud-storage-fuse`
- `managing-python-dependencies`, `ml-best-practices`, `notebook-guidance`, `schema-mapping`
