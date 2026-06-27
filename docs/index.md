---
layout: home

hero:
  name: clible-v3
  text: Web-native Bible study platform
  tagline: High-performance Go REST API + React 19 Frontend. Full-text search, text analytics, and customizable research workspaces powered by local SQLite. Optimized for cloud deployment.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/mvirtai/clible-v3-go

features:
  - icon: 🚀
    title: Native Go REST API
    details: High-performance backend utilizing Go 1.22+ standard routing and graceful shutdown. Optimized for stateless cloud deployment.
  - icon: 🔎
    title: FTS5 full-text search
    details: Scoped searches across the whole Bible, testaments, or specific ranges with optional regex filtering.
  - icon: 📊
    title: Text analytics
    details: Lexical density, n-grams, word frequency analysis, and side-by-side translation comparisons.
  - icon: 🗂️
    title: Research workspaces
    details: Save search queries and text analyses into persistent scopes (workspaces) for quick retrieval.
  - icon: ⚡
    title: O(1) XML Streaming Import
    details: Memory-efficient streaming XML ingestion directly into SQLite. No temporary files or DOM buffering.
  - icon: 🎨
    title: React 19 + Tailwind v4
    details: Sleek, responsive gold/warm-neutral theme featuring Georgia serif typography and auto dark/light modes.
---

## At a glance

To spin up clible-v3 locally using `Taskfile`:

```bash
# Clone the project
git clone https://github.com/mvirtai/clible-v3-go.git
cd clible-v3-go

# Start the Go REST API (runs migrations and starts SQLite db automatically)
task backend:dev

# Start the Vite + React frontend (in another terminal)
task frontend:dev
```

## Documentation map

| You want to…                                | Start here                                      |
|---------------------------------------------|-------------------------------------------------|
| Install and run clible-v3 locally           | [Getting started](/guide/getting-started)       |
| Understand the REST endpoints               | [API reference](/api/reference)                 |
| Learn about the layered architecture        | [Architecture overview](/architecture/overview) |
| Read about the SQLite database and schemas   | [Database & FTS5](/architecture/database)       |
| Deep dive into O(1) XML ingestion           | [Import & seeding](/guide/import-and-seeding)   |
