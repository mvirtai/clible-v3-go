# Clible v3 Architecture Overview

This document provides a comprehensive structural reference for Clible v3, detailing directory structures, subsystem boundaries, and key files.

---

## 1. System Map & Directory Structure

```text
clible-v3-go/
├── backend/
│   ├── cmd/api/                  # Binary entrypoint (main.go, server bootstrap)
│   ├── internal/
│   │   ├── api/                  # HTTP handlers, routes, middleware, request/response models
│   │   ├── ctxkeys/              # Typed context keys for authenticated user IDs
│   │   ├── db/                   # Database repository layer (*sql.DB, queries, migrations)
│   │   ├── models/               # Domain models and entity structs
│   │   ├── parsers/              # O(1) streaming parsers (XML/JSON Bible importers)
│   │   ├── services/             # Core business logic, batching, service orchestration
│   │   └── version/              # SemVer version string exposed to API
│   ├── migrations/               # Sequentially numbered SQL migrations (embedded via //go:embed)
│   └── new_dsl/                  # ISLA v2 engine (lexer, LL(1) parser, AST, executor)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Shared UI widgets (badges, buttons, inputs, modals)
│   │   │   ├── notebook/         # 2D Canvas, 24-col grid, hybrid cells, ISLA blocks
│   │   │   ├── reader/           # Distraction-free scripture reader, chapter navigation
│   │   │   ├── search/           # Text search, AI semantic search, verse curation cards
│   │   │   └── user/             # User menu, avatar, settings dropdown, guest banner
│   │   ├── hooks/                # useSyncExternalStore, custom navigation hooks
│   │   ├── types/                # Strict TypeScript models matching backend JSON
│   │   ├── utils/                # i18n dictionary, version helper, formatting utilities
│   │   ├── App.tsx               # Root view router & SPA layout
│   │   ├── index.css             # Tailwind v4 @theme configuration & CSS variables
│   │   └── main.tsx              # React 19.2 DOM bootstrap
│   └── package.json              # Managed strictly via pnpm
├── .agents/                      # Antigravity agent configuration, rules, and skills
│   ├── rules/                    # Hierarchical rules (guest mode, markdown kanban)
│   ├── skills/                   # Domain skills (isla, quality gates, react compiler, etc.)
│   └── workflows/                # Standardized developer runbooks (plans, reviews, PRs)
├── .plans/                       # Finnish architectural plans and guides (NEVER committed)
├── pr_stories/                   # English Pull Request stories with factual audit
└── Taskfile.yml                  # Unified task automation (check, build, test, version, git)
```

---

## 2. Backend Subsystems (Go 1.22+)

### A. HTTP Routing & API Layer (`backend/internal/api/`)

- Built on Go 1.22+ standard library `http.ServeMux`.
- Routes use exact HTTP method prefixes:
  - `GET /api/verses`
  - `POST /api/dsl/execute`
  - `POST /api/auth/register`
  - `GET /api/user/settings`
- Middleware extracts user identities safely into context using typed keys ([`ctxkeys.GetUserID(ctx)`](file:///home/vivaldev/code/clible-v3-go/backend/internal/ctxkeys)).

### B. Service Layer (`backend/internal/services/`)

- Orchestrates multi-step operations (e.g. verse aggregation, user preferences, guest notebook TTL cleanup).
- Enforces batching (recommended chunk size: 500 records) to maintain constant memory overhead.
- Strictly decoupled from HTTP primitives (`http.ResponseWriter`, `*http.Request`).

### C. Repository Layer (`backend/internal/db/`)

- Interacts directly with `*sql.DB`.
- Strictly uses parameterized SQL (`$1, $2`).
- Dual-driver compatibility:
  - Production: Neon PostgreSQL with connection pooling.
  - Tests: SQLite `:memory:` for high-speed automated unit tests.

### D. ISLA v2 Engine (`backend/new_dsl/`)

- Independent, high-performance compiler and query engine:
  - `lexer.go`: Tokenizes source strings up to 2000 runes in $O(1)$ space.
  - `parser.go`: Deterministic LL(1) recursive-descent parser (< 50 µs parse time).
  - `ast.go`: Pure AST nodes (`ISLAExpression`, `ObjectNode`, `MethodCall`, `OutputOp`).
  - `executor.go`: Resolves AST against database repositories and returns structured verse arrays or metric maps.

---

## 3. Frontend Subsystems (React 19.2 & TypeScript)

### A. State Management & Navigation

- Zero `useEffect` for state synchronization.
- Browser URL, query parameters, and history navigation are tracked using `useSyncExternalStore` subscribed to `popstate`.
- Active view switching (`notebook`, `reader`, `search`, `settings`) is driven by URL hash/pathname.

### B. 2D Canvas & Grid Matrix

- Located in `frontend/src/components/notebook/`.
- 24-column flexible CSS Grid.
- Cells can be moved, resized, collapsed, and grouped.
- Hybrid cells support rich Markdown text, embedded ISLA v2 query blocks, and live verse result cards.

### C. Internationalization (`frontend/src/i18n.ts`)

- Strict bilingual support: Finnish (`fi`) and English (`en`).
- Helper function `t("key")` retrieves translated strings.
- Zero hardcoded text allowed in any TSX markup.
