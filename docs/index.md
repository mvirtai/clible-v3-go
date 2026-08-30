---
layout: home

hero:
  name: clible-v3
  text: Web-native Bible study & research platform
  tagline: High-performance Go REST API + React 19 Frontend. Full-text search, text analytics, ISLA DSL query engine, and 2D canvas research workspaces powered by Neon PostgreSQL. Optimized for cloud deployment.
  actions:
    - theme: brand
      text: Explore the platform
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/mvirtai/clible-v3-go

features:
  - icon: 🚀
    title: Native Go REST API
    details: High-performance backend utilizing Go 1.22+ standard routing and graceful shutdown. Optimized for stateless cloud deployment.
  - icon: ✦
    title: ISLA DSL Query Engine
    details: Ergonomic inline query language with functional pipelines, boolean search, range lookups, Levenshtein diagnostics, and Monaco Intellisense.
  - icon: 📓
    title: Notebooks & 2D Canvas
    details: Interactive 24-column resizable grid workspace with hybrid Markdown notes, reactive ISLA embeds, and persistent CLI scratchpad.
  - icon: 🔎
    title: Dual Full-Text Search
    details: High-speed GIN tsvector indexing on PostgreSQL with FTS5 external content table fallback for in-memory testing.
  - icon: 📊
    title: Text Analytics
    details: Lexical density, n-grams, token frequency analysis, and side-by-side translation comparison matrices.
  - icon: 🗂️
    title: Research Workspaces
    details: Save search queries, analyses, and notebooks into persistent scopes with automatic translation inference.
  - icon: ⚡
    title: O(1) XML Streaming Import
    details: Memory-efficient streaming XML ingestion directly into the database with zero disk buffering.
  - icon: 🤖
    title: Gemini AI Integrations
    details: Intelligent insights, comparative translation studies, word investigations, and semantic search powered by Gemini.
  - icon: 🌐
    title: React 19 + Tailwind v4 + i18n
    details: Sleek gold/warm-neutral design tokens, full English/Finnish bilingual localization, and fluid dark/light themes.
---

## Platform Architecture at a Glance

clible-v3 is designed as a web-native research suite accessed directly in your browser:

```mermaid
graph TD
    User(["Researcher / User"]) --> UI["Web Application: React 19 + Tailwind v4"]
    
    subgraph Core_Features ["Core Features"]
        UI --> R["Scripture Reader & Navigation"]
        UI --> C["Comparison Matrix & Diffing"]
        UI --> S["Dual Full-Text & Regex Search"]
        UI --> O["Original Languages & Morphology"]
        UI --> A["Text Analytics & Word Frequencies"]
        UI --> N["2D Canvas Notebooks & ISLA"]
        UI --> W["Project Workspaces & Scopes"]
        UI --> AI["Theological AI Engine"]
    end
    
    subgraph Cloud_Infrastructure ["Cloud Infrastructure"]
        R & C & S & O & A & N & W & AI --> API["Go REST API Monolith"]
        API --> DB[("Neon PostgreSQL")]
        API --> AICloud["Gemini AI"]
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
| Master the ISLA query language and reactive directives | [ISLA Language Guide](/guide/isla-guide) |
| Manage the translation catalog and streaming XML imports | [Translations & Ingestion](/guide/import-and-seeding) |
| Self-host the application or set up local development | [Self-Hosting & Setup](/guide/self-hosting) |
| Understand the Go + React layered architecture | [Architecture Overview](/architecture/overview) |
| Explore the PostgreSQL GIN and SQLite FTS5 schemas | [Database & Dual FTS](/architecture/database) |
| Read the formal ISLA language grammar and EBNF | [ISLA Language Specification](/architecture/isla-specification) |
| Browse the complete REST API endpoints | [Web API Reference](/api/reference) |
