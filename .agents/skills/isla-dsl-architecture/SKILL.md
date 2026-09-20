---
name: isla-dsl-architecture
description: Comprehensive architectural guide and grammar reference for Clible's ISLA v2 (Inline Structure & Logic Architecture) object-method DSL in notebooks.
---

# ISLA v2 DSL Architecture & Grammar Guide

> **ISLA** — *Inline Structure & Logic Architecture*  
> *(Also: Interactive Scripture & Layout Analyzer)*  
> *Dedicated with love to Isla Aurora.*

ISLA v2 is Clible's domain-specific query language for interactive notebook cells, analytical text comparisons, and reactive document embedding.

---

## 1. Core Grammar & Mental Model

Every ISLA v2 expression follows a strictly deterministic three-phase pipeline:

```text
[Object] . [Method Chain] [Output Operator]
```

### Phase 1: Source Object

Defines the initial dataset:

* Verse references: `Room 8:28`, `Joh 3:16`, `Gen 1:1-3`
* Lexical / Semantic tokens: `#rakkaus`, `#armo`, `#usko`
* Genre scopes: `@evankeliumit`, `@epistolat`, `@toora`, `@runous`

### Phase 2: Method Chain (`.method(...)`)

Transforms, filters, or analyzes the dataset:

* Translation comparison: `.vs(kr38, kr92, kjv)`
* Morphological analysis: `.greek()`, `.hebrew()`, `.strong()`
* Frequency & Lexical metrics: `.count(words)`, `.top(10)`, `.themes()`
* Semantic search: `.similar("armon merkitys")`
* References & cross-links: `.refs()`, `.crossrefs()`

### Phase 3: Output Operator (Routing)

Routes the result to the notebook layout:

* `=> #slug` — Named variable / reference for reactive re-use
* `>>` — Render card below the active cell (`islaOutputBelow`)
* `>` — Render inline card / embed (`islaOutputInline`)
* `<<` — Render card above the active cell (`islaOutputAbove`)

---

## 2. Example Expressions

### Text Analysis & Word Frequency

```text
Room 8:1-17.count(words) >> "Roomalaiskirjeen sanatiheys"
```

### Multidimensional Translation Comparison

```text
Joh 1:1-5.vs(kr38, kr92, kjv, novum) >> #alkuhymni
```

### Scoped Semantic Exploration

```text
@evankeliumit.similar("armo ja totuus").top(5) >>
```

---

## 3. Codebase Structure

| Layer | Path | Responsibility |
| :--- | :--- | :--- |
| **AST Definitions** | `backend/new_dsl/ast.go` | `ISLAExpression`, `ObjectNode`, `MethodCall`, `OutputOp` |
| **Lexer (Go)** | `backend/new_dsl/lexer.go` | O(1) streaming tokenizer, max 2000 runes |
| **Parser (Go)** | `backend/new_dsl/parser.go` | Deterministic LL(1) recursive-descent parser (< 50 µs) |
| **Executor (Go)** | `backend/new_dsl/executor.go` | Resolves AST against database repositories & models |
| **Frontend Lexer** | `frontend/src/components/notebook/isla/islaLexer.ts` | Real-time Monaco / React syntax highlighting |
| **Frontend UI** | `frontend/src/components/notebook/isla/ISLABlock.tsx` | Renders output badges, direction arrows, and comparison cards |
| **Localization** | `frontend/src/utils/i18n.ts` | `islaOutputAbove`, `islaOutputBelow`, `islaOutputInline` |

---

## 4. Key Rules for Agents Writing ISLA Code

1. **Uniform Object-Method Syntax**: Never mix legacy v1 syntax (`=> use(...)`) into new expressions; always use `.vs(...)`.
2. **Deterministic Backwards Compatibility**: Legacy v1 notebooks are handled by fallback in `CLIService.ExecuteDSL`. Never break existing AST contracts.
3. **Safe Output Rendering (XSS Protection)**: Slugs (`#slug`) and labels must always be sanitized as safe text nodes without raw HTML injection.
4. **Localization**: Never hardcode UI labels for output directions; always use `frontend/src/utils/i18n.ts`.
