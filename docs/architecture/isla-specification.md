# ISLA Language Specification & Architecture

> **ISLA** — *Inline Structure & Logic Architecture*  
> (Also: *Interactive Scripture & Layout Analyzer*)  
> Dedicated with love to Isla Aurora.

---

## 1. Executive Summary & Vision

**ISLA** is an ergonomic, human-readable, domain-agnostic inline query and command language designed for structured text exploration, multidimensional comparison, and reactive document embedding.

Modern technical writing and computational research demand a lightweight syntax that can sit naturally inside Markdown documents, notebook cells, terminal pipelines, and visual canvas layouts without the boilerplate of general-purpose programming languages or the verbosity of SQL.

ISLA bridges the gap between text-based human thinking and structured query execution:

```mermaid
graph LR
    subgraph Inputs
        MD["Markdown ```isla Block"]
        CELL["Notebook Hybrid Cell"]
        CLI["Terminal CLI Pipeline"]
    end

    subgraph "ISLA Core"
        LEX["Lexer (O(1) Streaming)"]
        PARSE["Deterministic AST Parser"]
    end

    subgraph "AST Execution Engine"
        EXEC["AST Execution Engine"]
        ADAPT["Layout & Projection Adapters"]
    end

    subgraph Outputs
        VIEW_M["Matrix / Side-by-Side View"]
        VIEW_C["Interactive Cards & Badges"]
        VIEW_T["JSON / Streaming Text"]
    end

    MD --> LEX
    CELL --> LEX
    CLI --> LEX

    LEX --> PARSE
    PARSE --> EXEC
    EXEC --> ADAPT

    ADAPT --> VIEW_M
    ADAPT --> VIEW_C
    ADAPT --> VIEW_T
```

---

## 2. Core Design Principles

1. **Zero Friction Inline Syntax**: An ISLA statement must be concise enough to fit in a single line, yet expressive enough to specify multi-source comparisons, projections, and layout formats.
2. **Deterministic & Context-Free**: The grammar is strictly deterministic (LL(1) / Pratt-parsable), allowing instantaneous parsing (< 100 µs) in memory-constrained environments or browser WebAssembly instances.
3. **Pipeline Composability**: Queries follow an intuitive command-modifier-view pipeline:
   `VERB TARGET [OPTIONS...] [MODIFIERS...] [VIEW_PROJECTION]`
4. **Host-Agnostic Embeddability**: ISLA is designed to be hosted within Markdown code fences (```` ```isla ````), reactive notebook canvas cells, IDE extensions (LSP), or CLI toolchains (`clible isla run`).
5. **Separation of Parsing and Execution**: The parser outputs a clean Abstract Syntax Tree (AST) that can be dispatched to any execution runtime or adapter.

---

## 3. Formal Syntax & Grammar (EBNF)

```ebnf
Statement       ::= Command [ OptionList ] [ ModifierList ] [ ViewClause ]

Command         ::= VerseCommand | SearchCommand | CompareCommand | CustomCommand
VerseCommand    ::= "verse" StringLiteral
SearchCommand   ::= "search" StringLiteral
CompareCommand  ::= "compare" StringLiteral

OptionList      ::= Option { Option }
Option          ::= FlagOption | KeyValueOption | TargetListOption

FlagOption      ::= "--" Identifier
KeyValueOption  ::= "--" Identifier "=" ( StringLiteral | NumberLiteral | Identifier )
TargetListOption::= "--compare" "="? "[" TargetItem { "," TargetItem } "]"
TargetItem      ::= Identifier | StringLiteral

ModifierList    ::= Modifier { Modifier }
Modifier        ::= "--count" [ "=" NumberLiteral ]
                  | "--filter" "=" StringLiteral
                  | "--range" "=" ( StringLiteral | NumberLiteral ".." NumberLiteral )

ViewClause      ::= "--view" "=" ( "side-by-side" | "matrix" | "grid" | "raw" | "card" )
                  | "--format" "=" ( "json" | "markdown" | "table" | "text" )

StringLiteral   ::= '"' { Character } '"' | "'" { Character } "'"
NumberLiteral   ::= Digit { Digit }
Identifier      ::= Letter { Letter | Digit | "_" | "-" }
```

---

## 4. Query Anatomies & Examples

### 4.1. Single Target Lookup

Retrieves a primary text target across default or specified translations.

```isla
verse "Joh 1:1"
verse "Joh 1:1" --translation="raamattu-1938"
```

### 4.2. Multilateral Comparative Analysis

Cross-references multiple translation layers side-by-side:

```isla
verse "Joh 1:1" --compare=[raamattu-1938, nestle1904, kjv] --view=side-by-side
```

### 4.3. Matrix Projections & Morphology

Performs an aligned word-by-word or verse-by-verse matrix layout:

```isla
verse "Joh 1:1-5" --compare=[nestle1904, raamattu-1938] --view=matrix --align=interlinear
```

### 4.4. Full-Text Linguistic Search & Filtering

Executes structured regex or literal searches with match limits:

```isla
search "logos" --scope="NT" --count=10 --view=card
```

---

## 5. Execution Pipeline

ISLA statements are processed in four distinct, decoupled stages:

```mermaid
sequenceDiagram
    autonumber
    participant Host as Host (Markdown / Cell / CLI)
    participant Lexer as ISLA Lexer
    participant Parser as ISLA Parser
    participant Engine as AST Execution Engine
    participant Renderer as UI / Projection Adapter

    Host->>Lexer: Raw Input String
    Lexer->>Parser: Stream of Tokens (O(1))
    Parser->>Engine: Abstract Syntax Tree (AST)
    Engine->>Engine: Context Evaluation & DB/Memory Fetch
    Engine->>Renderer: Evaluated Result Set & Matrix Diffs
    Renderer-->>Host: Formatted Output (Cards / Canvas / JSON)
```

1. **Tokenization (Lexing)**: Scans input runes into positional tokens (`TOKEN_VERB`, `TOKEN_STRING`, `TOKEN_FLAG`, `TOKEN_LBRACKET`, etc.) without heap allocations where possible.
2. **Syntax Analysis (Parsing)**: Transforms tokens into an immutable `ASTNode` tree with strict validation of flags and arguments.
3. **Execution (AST Engine)**: Resolves references against the underlying storage layer (PostgreSQL, SQLite `:memory:`, or in-memory vector cache) using context cancellation.
4. **Projection (Rendering)**: Adapts the evaluated dataset to the desired layout (Side-by-Side Cards, Alignment Matrix, or JSON stream).

---

## 6. Open-Source Ecosystem Roadmap

To establish ISLA as a competitive, widely adopted inline querying standard, the open-source rollout follows a multi-phase trajectory:

```mermaid
timeline
    title ISLA Open Source Roadmap
    Phase 1 : Core Go Lexer/Parser Engine : AST Integration in Clible-v3 : EBNF Grammar Validation
    Phase 2 : WebAssembly (Wasm) Engine : TypeScript / Browser Runtime : Embedded Markdown Previews
    Phase 3 : Obsidian & Notion Plugins : Language Server Protocol (LSP) : VS Code Syntax Extension
    Phase 4 : Standalone CLI (`isla-cli`) : Extensible Plugin Architecture : Cross-Domain Dialects
```

### Phase 1: Core Go Engine (Current)

* Pure Go standard library lexer & parser with zero external dependencies.
* Robust test suite covering edge cases, invalid tokens, and nested modifiers.
* Deep integration with the Clible-v3-go database and service architecture.

### Phase 2: WebAssembly & Frontend SDK

* Compile `isla-core` to a tiny Wasm binary (< 150 KB) or standalone TypeScript library.
* Live in-browser syntax highlighting, validation, and autocomplete.
* Instant rendering of ```` ```isla ```` blocks in Markdown viewers.

### Phase 3: Developer Tooling & Editor Integrations

* **Language Server Protocol (LSP)**: Real-time diagnostics, hover tooltips (verse previews), and auto-completion for popular editors.
* **Obsidian / Logseq / Notion Plugins**: Community plugins enabling researchers to embed live ISLA query blocks inside personal knowledge graphs.
* **VS Code & JetBrains Extensions**: Syntax highlighting, code snippets, and inline evaluation.

### Phase 4: Generalized Cross-Domain Dialects

* Abstract the core AST so third-party developers can plug in custom domains:
  * Legal & Case Law Citation Queries (`isla-law`)
  * Medical & Genome Sequence Annotations (`isla-bio`)
  * Literature & Historical Manuscripts (`isla-manuscripts`)

---

## 7. Quality & Performance Benchmarks

| Metric | Target | Measurement Strategy |
| --- | --- | --- |
| **Lexer Allocation Rate** | 0 allocs/op for single-line queries | Go `testing.B` with `AllocsPerRun` |
| **Parser Latency** | < 50 µs per query | Deterministic single-pass Pratt parsing |
| **Binary Footprint** | < 500 KB standalone | Static Go compilation without cgo |
| **AST Immutability** | 100% thread-safe | Value receivers & copy-on-write nodes |

---

## 8. Naming & Dedication

The name **ISLA** honors *Isla Aurora*, symbolizing brightness, clarity, and elegant structure.

Every query executed by the engine represents a commitment to clean code, joyful engineering, and lasting open-source value.
