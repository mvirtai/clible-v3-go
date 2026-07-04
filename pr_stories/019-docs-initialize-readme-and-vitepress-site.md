# Docs: Initialize README and VitePress Site

## Business Context

As clible-v3-go transitions into a mature web-native REST API application ready for Google Cloud deployment, it requires structured, comprehensive, and public-facing technical documentation.

This pull request initializes the **VitePress** documentation framework in the `docs/` directory, compiles high-quality technical documentation for all backend/frontend layers, and sets up a robust root `README.md` to serve as the project's primary GitHub landing page.

Furthermore, this PR corrects a critical architectural misconception by removing all legacy "offline-first" descriptions, correctly framing **clible-v3-go** as a **web-native, stateless, and cloud-ready client-server REST API**.

---

## Architectural & Documentation Changes

### Root Directory

#### `README.md` [NEW]

* Created a professional project README describing clible-v3-go's purpose, key features, technology stack, and local execution instructions using `Taskfile`.
* Visualized the compiled Go backend architecture monolith and boundary rules using a Mermaid flowchart.

---

### VitePress Documentation Site (`docs/`)

#### `package.json` [NEW]

* Initialized a decoupled package descriptor specifying `vitepress v1.6.4` dev dependency and scripts to run the dev server (`docs:dev`) and build production assets (`docs:build`) using `pnpm`.

#### `.vitepress/config.ts` [NEW]

* Configured VitePress settings including site titles, localized base path matching the GitHub Pages repository namespace (`/clible-v3-go/`), local search provider, custom footer, and structured navigation menus.
* Added inline TypeScript environment declarations for `process` to prevent Node-type compilation errors inside `.ts` config scopes.

#### `postcss.config.cjs` [NEW]

* Added an empty PostCSS module exporter. This prevents Vite's builder from traversing up to global home directories (e.g. `/home/vivaldev/postcss.config.cjs`) and failing due to missing `tailwindcss` module definitions inside the docs workspace.

#### `index.md` [NEW]

* Built the home page featuring standard VitePress Hero sections, high-level highlights, and a documentation directory map.

---

### Guides & Deep Dives

#### `architecture/overview.md` [NEW]

* Documents the backend's strict Layered Architecture (API, Service, Repository, Parser) and boundaries.
* Includes a Mermaid sequence diagram visualizing a typical HTTP request lifecycle (e.g., resolving `GET /api/verses?ref=John+3:16`).

#### `architecture/database.md` [NEW]

* Documents the SQLite 3 database schema and includes a Mermaid Entity-Relationship Diagram (ERD).
* Explains the external content virtual table configuration of FTS5 (`verses_fts`) along with database triggers (`verses_ai`, `verses_ad`, `verses_au`) maintaining search indexes without raw memory overhead.
* Documents the embedded migrations engine (`//go:embed` matching transaction rollbacks).

#### `guide/import-and-seeding.md` [NEW]

* Explains the memory-efficient streaming XML parser pipeline using Go's tokenized `xml.Decoder` executing under a constant $O(1)$ RAM footprint.
* Explains the functional callback pattern and bulk insertion chunking (buffer sizing of 500 records) to write entire translations to SQLite in under 2 seconds.

#### `api/reference.md` [NEW]

* An exhaustive REST API reference outlining endpoints, query parameters, request/response models, and JSON payload contracts (such as scripture lookups, FTS search, translations ingestion, saved workspace scopes, text analytics, and search history).

#### `guide/getting-started.md` [NEW]

* Guides developers through local setups, pnpm dependency installations, environment configuration variables, and Vite local proxies.
* Lists quality-assurance testing tools (`task check`, `golangci-lint`, `Vitest`).

---

## Verification & Deployment Strategy

To run and verify the documentation site locally:

```bash
cd docs
pnpm install
pnpm run docs:dev
```

* **Local Verification**: The dev server boots successfully at `http://localhost:5173/clible-v3-go/` (including functional local search indexing, sidebar navigation, and Mermaid diagram rendering).
* **Production Build Validation**: Compiles without errors via `pnpm run docs:build`.
