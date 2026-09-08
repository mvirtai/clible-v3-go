---
layout: home

hero:
  name: clible-v3
  text: Web-native Bible study & research platform
  tagline: >
    Go REST API + React 19 + ISLA v2 — a purpose-built query language,
    2D canvas research notebooks, full-text search, text analytics,
    and comparative translation matrices. Cloud-native, completely free.
  actions:
    - theme: brand
      text: Explore the platform
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/mvirtai/clible-v3-go

features:
  - icon: ✦
    title: ISLA v2 Query Language
    details: >
      An ergonomic object-method DSL embedded directly inside Markdown.
      @(Joh 3:16).vs(KR92, KJV) =>  search("grace").at(epistles).stats() >>
      Deterministic AST parser, Monaco IntelliSense, and Levenshtein diagnostics.
  - icon: 📓
    title: Notebooks & 2D Canvas
    details: >
      24-column resizable grid workspace with hybrid Markdown notes,
      reactive ISLA embeds, and a persistent CLI scratchpad with interactive
      verse selection and one-click Freeze-to-Markdown.
  - icon: 🔎
    title: Dual Full-Text Search
    details: >
      High-speed GIN tsvector indexing on PostgreSQL with FTS5 external
      content table fallback for in-memory testing. Boolean AND/OR,
      regex pattern match, and smart genre scope filtering.
  - icon: 📊
    title: Text Analytics
    details: >
      Lexical diversity (Type-Token Ratio), token frequency rankings,
      thematic keyword extraction, and side-by-side translation comparison
      matrices — all accessible via a single ISLA directive.
  - icon: ⚡
    title: O(1) Streaming Ingestion
    details: >
      Memory-efficient streaming XML parser ingests Bible translations directly
      into PostgreSQL with zero disk buffering, handling multi-megabyte USFX
      and OSIS files in a single linear pass.
  - icon: 🗂️
    title: Research Workspaces
    details: >
      Isolated project scopes organize saved searches, lexical analyses,
      and notebooks into cohesive research workspaces. Single-roundtrip
      loading via GET /api/scopes/workspace.
  - icon: 🤖
    title: Gemini AI Integrations
    details: >
      Greek and Hebrew morphological insights, semantic conceptual scripture
      search, hermeneutical analysis, and comparative translation commentary
      powered by Google Gemini.
  - icon: 🚀
    title: Native Go REST API
    details: >
      High-performance stateless monolith using Go 1.22+ standard routing.
      Context-propagated cancellation, O(1) streaming uploads, and clean
      four-layer boundary architecture.
  - icon: 🌐
    title: Bilingual & Accessible
    details: >
      Complete Finnish (fi) and English (en) UI localization with one-click
      language switching. Warm gold design tokens with seamless dark and
      light mode support.
---

## Platform Architecture at a Glance

clible-v3 is designed as a web-native research suite accessed directly in your browser.
The ISLA query engine runs server-side as a dedicated Go package, processing expressions
in under 50 µs from lexer to result projection:

```mermaid
graph TD
    User(["Researcher / User"]) --> UI["Web Application: React 19 + Tailwind v4"]

    subgraph Core_Features ["Core Features"]
        UI --> R["Scripture Reader & Navigation"]
        UI --> C["Comparison Matrix & Diffing"]
        UI --> S["Full-Text & Boolean Search"]
        UI --> O["Original Languages & Morphology"]
        UI --> A["Text Analytics & ISLA Queries"]
        UI --> N["2D Canvas Notebooks"]
        UI --> W["Project Workspaces & Scopes"]
        UI --> AI["Theological AI Engine"]
    end

    subgraph Cloud_Infrastructure ["Cloud Infrastructure"]
        R & C & S & O & A & N & W & AI --> API["Go REST API Monolith"]
        API --> ISLA["ISLA v2 Engine (new_dsl/)"]
        API --> DB[("Neon PostgreSQL")]
        API --> AICloud["Gemini AI"]
        ISLA --> DB
    end
```

---

## Documentation Map

| If you want to… | Start here |
|---|---|
| Learn how to navigate and use the web interface | [Platform Overview & Quick Start](/guide/getting-started) |
| Read scriptures and explore canonical books | [Scripture Reader & Navigation](/guide/reader) |
| Compare translations side-by-side with visual diffs | [Comparison & Diffing](/guide/compare-and-diff) |
| Master full-text, regex search, and linguistic analytics | [Search & Text Analytics](/guide/search-and-analytics) |
| Study Greek/Hebrew root words and morphological lemmas | [Original Languages & Morphology](/guide/original-languages) |
| Leverage theological AI insights and semantic search | [Theological AI Tools](/guide/ai-study-tools) |
| Organize research into scopes and saved searches | [Workspaces & Scopes](/guide/workspaces) |
| Create 2D canvas study sheets and freeze CLI queries | [Notebooks & 2D Canvas](/guide/notebooks) |
| Master the ISLA v2 query language | [ISLA v2 Language Guide](/guide/isla-guide) |
| Manage the translation catalog and streaming XML imports | [Translations & Ingestion](/guide/import-and-seeding) |
| Self-host the application or set up local development | [Self-Hosting & Setup](/guide/self-hosting) |
| Understand the Go + React layered architecture | [Architecture Overview](/architecture/overview) |
| Explore the PostgreSQL GIN and SQLite FTS5 schemas | [Database & Dual FTS](/architecture/database) |
| Read the formal ISLA v2 grammar and EBNF | [ISLA v2 Language Specification](/architecture/isla-specification) |
| Browse the complete REST API endpoints | [Web API Reference](/api/reference) |
