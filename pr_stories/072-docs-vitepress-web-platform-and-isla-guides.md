# PR Story: VitePress Documentation Overhaul — Web-Native Platform & ISLA Guides

## Business Context

As clible-v3 transitioned from a traditional CLI utility to a modern, cloud-native web application (Go REST API + React 19 SPA + Neon PostgreSQL), the existing documentation partially retained legacy CLI-first and local-clone framing. This created friction for end-users, researchers, and theological students who access clible-v3 directly through their web browsers.

This pull request delivers a comprehensive overhaul of the VitePress documentation suite (`docs/`), restructuring it into an authoritative, professional, and user-centric knowledge base.

Key objectives achieved:

1. **Web-Native Product Framing**: Reorients the landing page and getting-started guide to introduce clible-v3 as a web-native research workspace, detailing the Reader, Dual Full-Text/Regex Search, Side-by-Side Comparison Matrix, Text Analytics, Scoped Workspaces, 2D Canvas Notebooks, and AI study tools.
2. **Comprehensive Research Workspaces Guide (`docs/guide/workspaces.md`)**: Documents project-based exegesis workflows, pinned searches, saved analyses, and aggregate single-roundtrip workspace fetching (`GET /api/scopes/workspace?id=...`).
3. **Search & Text Analytics Guide (`docs/guide/search-and-analytics.md`)**: Details the dual-search architecture (PostgreSQL GIN tsvector indexing with SQLite FTS5 fallback), search scoping, history tracking, and quantitative lexical analysis (Type-Token Ratio / TTR, n-grams, word frequency rankings).
4. **Dedicated Self-Hosting & Development Guide (`docs/guide/self-hosting.md`)**: Separates developer/DevOps installation instructions (Docker containers, Go/Node prerequisites, Taskfile automation, and quality gates) from the general user guide.
5. **Interactive 2D Canvas & ISLA Directives Alignment**: Refines the Notebooks and ISLA Language guides with practical examples, functional pipelines (`=> use()`, `=> vs()`, `=> refs()`, `=> themes()`, `=> count()`), smart genre scopes (`@epistolat`, `@evankeliumit`, `@toora`, etc.), and Monaco IntelliSense features.

---

## Architectural & Documentation Structure Changes

```mermaid
graph TD
    Root[VitePress Docs Root: docs/] --> Config[docs/.vitepress/config.ts]
    Root --> Index[docs/index.md: Web Platform Hero & Map]
    
    subgraph Guides [User Guide & Workspaces]
        Config --> G1[guide/getting-started.md: Platform Overview & Quick Start]
        Config --> G2[guide/workspaces.md: Research Workspaces & Scopes]
        Config --> G3[guide/search-and-analytics.md: Search Modes & Lexical Analytics]
        Config --> G4[guide/notebooks.md: 2D Canvas & Hybrid Cells]
        Config --> G5[guide/isla-guide.md: ISLA Directives & Functional Pipelines]
        Config --> G6[guide/import-and-seeding.md: Translations Catalog & O(1) Ingestion]
        Config --> G7[guide/self-hosting.md: Self-Hosting, Docker & Quality Gates]
    end
    
    subgraph Architecture [Architecture & Engine Specs]
        Config --> A1[architecture/overview.md: Layered REST Monolith]
        Config --> A2[architecture/database.md: Dual FTS & ERD Schemas]
        Config --> A3[architecture/isla-specification.md: Formal EBNF Grammar]
    end
    
    subgraph API [API Reference]
        Config --> API1[api/reference.md: Endpoints & Payloads]
    end
```

### Summary of File Changes

| File | Change Type | Description |
|---|---|---|
| `docs/.vitepress/config.ts` | **MODIFY** | Updated site description, enhanced sidebar grouping into *User Guide & Workspaces*, *Architecture & Core Engines*, and *Web REST API*. |
| `docs/index.md` | **MODIFY** | Replaced developer-only terminal snippet with web platform architectural diagram and comprehensive navigation matrix. |
| `docs/guide/getting-started.md` | **MODIFY** | Rebuilt from scratch as *Platform Overview & Quick Start*, providing a 5-minute UI tour and workflow guide for web users. |
| `docs/guide/reader.md` | **NEW** | Comprehensive guide covering scripture reading, canonical navigation, serif typography, and verse action bars. |
| `docs/guide/compare-and-diff.md` | **NEW** | Dedicated guide for dual-translation alignment, LCS visual word diffing, dynamic similarity bars, and AI comparative exegesis. |
| `docs/guide/search-and-analytics.md` | **NEW** | Full documentation of search modes (FTS, phrase, regex), book scoping, search history, and quantitative lexical metrics (TTR). |
| `docs/guide/original-languages.md` | **NEW** | Deep-dive guide covering Koine Greek (SBLGNT) and Biblical Hebrew (Aleppo/Leningrad), interlinear lemmas, and morphological parsing. |
| `docs/guide/ai-study-tools.md` | **NEW** | Documentation of theological AI insights, NextFocusChips suggestions, DeepDiveCards, and semantic natural language search. |
| `docs/guide/workspaces.md` | **NEW** | Comprehensive guide covering workspace creation, pinned searches, saved analyses, and aggregate JSON payload fetching. |
| `docs/guide/notebooks.md` | **MODIFY** | Polished 2D canvas matrix documentation, persistent CLI scratchpad (`$ clible`), freeze workflow, and reactive ISLA embeds. |
| `docs/guide/isla-guide.md` | **MODIFY** | Complete guide covering quick directives, functional pipeline actions, smart genre scopes, and Monaco IntelliSense. |
| `docs/guide/import-and-seeding.md` | **MODIFY** | Reframed to cover user translation catalog activation in the UI alongside the $O(1)$ streaming XML parsing engine. |
| `docs/guide/self-hosting.md` | **NEW** | Dedicated technical guide for developers/sysadmins detailing Docker deployment, Go/React local setup, and Task quality gates. |
| `README.md` | **MODIFY** | Overhauled root repository showcase with compelling value proposition, feature highlights, and documentation matrix. |
| `.env.example` | **MODIFY** | Updated standard connection template to default to PostgreSQL/Neon connection string. |

---

## Testing & Verification Strategy

### 1. VitePress Documentation Build

The documentation suite was built using `vitepress build` to ensure all cross-document markdown links, mermaid diagrams, and navigation configurations compile with zero errors:

```text
> clible-v3-docs@1.0.0 docs:build /home/vivaldev/code/clible-v3-go/docs
> vitepress build

  vitepress v2.0.0-alpha.18
✓ building client + server bundles...
✓ rendering pages...
build complete in 3.47s.
```

### 2. Quality Gates & Backend Test Suite

All workspace quality gates passed cleanly with race detection and linter verification:

```text
total: (statements) 79.1%
task: [check] echo "All local quality checks passed flawlessly!"
All local quality checks passed flawlessly!
```
