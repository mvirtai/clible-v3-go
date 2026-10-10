# Pull Request Story: [116] – Document Semantic Search and Improve Finnish VitePress Copy

## Overview & Business Context

The VitePress guides described semantic search as if it directly matched concepts, without explaining how results are produced or how the feature differs from vector similarity search. This update documents the actual Gemini-assisted query planning and full-text search flow in both language versions, including canonical passage enrichment and the limits of the generated summary.

The Finnish VitePress pages were also proofread for clearer, more consistent terminology and more natural phrasing.

## Architectural & System Changes

### 1. Semantic Search Documentation

- Explain that Gemini converts a natural-language question into a full-text search plan for the selected translation.
- Describe how a recognized canonical reference can add its passage verses to the search results, and how Gemini summarizes up to 15 verse snippets.
- Clarify that the feature does not use vector embeddings and that results depend on the selected translation and generated search plan.
- Add matching explanations and links to the English and Finnish search guides.

### 2. Finnish VitePress Copy and Navigation

- Proofread the Finnish landing page, guides, and architecture pages; improve terminology, grammar, and readability.
- Localize the navigation labels and page metadata more naturally.
- Add and complete the documentation task on the project Kanban board.

## Files Changed

| File | Change |
|------|--------|
| `docs/.vitepress/config.ts` | Refine Finnish site description, navigation, and footer copy |
| `docs/fi/index.md` | Improve Finnish landing-page language and terminology |
| `docs/fi/architecture/database.md` | Clarify Finnish database and full-text-search descriptions |
| `docs/fi/architecture/isla-specification.md` | Improve Finnish ISLA architecture wording |
| `docs/fi/architecture/overview.md` | Proofread Finnish architecture overview |
| `docs/fi/guide/ai-study-tools.md` | Document the semantic-search workflow, limitations, and usage in Finnish |
| `docs/fi/guide/compare-and-diff.md` | Improve Finnish wording for translation comparison and text differences |
| `docs/fi/guide/getting-started.md` | Proofread Finnish quick-start guide |
| `docs/fi/guide/import-and-seeding.md` | Improve Finnish translation-management and import wording |
| `docs/fi/guide/isla-guide.md` | Refine Finnish ISLA terminology and prose |
| `docs/fi/guide/liturgical-calendar.md` | Proofread Finnish calendar guide |
| `docs/fi/guide/notebooks.md` | Improve Finnish notebook and editor descriptions |
| `docs/fi/guide/original-languages.md` | Proofread Finnish original-languages guide |
| `docs/fi/guide/reader.md` | Improve Finnish reader instructions |
| `docs/fi/guide/search-and-analytics.md` | Clarify Finnish search modes and link to semantic-search guidance |
| `docs/fi/guide/self-hosting.md` | Improve Finnish installation and setup wording |
| `docs/fi/guide/terms-and-privacy.md` | Proofread Finnish terms and privacy copy |
| `docs/fi/guide/workspaces.md` | Clarify Finnish workspace guidance |
| `docs/guide/ai-study-tools.md` | Document the semantic-search workflow and limitations in English |
| `docs/guide/search-and-analytics.md` | Link English search guidance to the semantic-search guide |
| `kanban/todos.md` | Record the completed documentation task |
| `pr_stories/116-docs-semantic-search-and-finnish-language-quality.md` | Document this change |

## Testing Strategy & Metrics

- `task docs:build` — passed; VitePress rendered the documentation successfully.
- `git diff --check -- kanban/todos.md docs` — passed.
- `task check` — blocked during backend lint/typecheck by the pre-existing working-tree change `backend/internal/services/ai_service.go:809:1: missing return`. That backend file was not changed as part of this documentation update.

This documentation-only change does not require an application version bump.
