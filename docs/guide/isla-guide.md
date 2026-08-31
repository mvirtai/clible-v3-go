# ISLA Language Guide & Hybrid Cells

> **ISLA** — *Inline Structure & Logic Architecture*  
> (Also: *Interactive Scripture & Layout Analyzer*)  
> *A comprehensive guide to ISLA syntax, quick line directives (!isla, ! @), hybrid notebook workflows, and reactive Markdown blocks.*

---

## 1. Overview & Vision

In traditional computational notebooks and study environments, researchers are often forced to choose between two extremes:

1. **Static Narrative (Markdown)**: Ideal for reading and publishing, but unable to dynamically update or compare scriptures across different translations without tedious copy-pasting.
2. **Command Cells (CLI / REPL)**: Powerful for querying, but produce fragmented, cell-heavy documents that cannot be read smoothly as continuous articles, commentaries, or sermon manuscripts.

**ISLA bridges this gap with a unified hybrid architecture:**
You write clean, standard Markdown text and seamlessly embed fast **ISLA quick directives** (such as `! at(Joh 3:16) => vs(KR92, KJV)` or `! search("armo") => at(evankeliumit) => use(KR92) => count()`). The execution engine parses them into deterministic ASTs and renders responsive, live scripture comparison cards directly within your narrative flow.

---

## 2. Conceptual Roles: CLI Cells vs. Markdown vs. ISLA Blocks

```mermaid
flowchart TD
    subgraph Layer1 ["1. Scratchpad & Query Workspace (CLI CodeCell)"]
        CLI["$ clible read Joh 3:16 --compare=KJV"]
        CHECK["Interactive Checkboxes: Pick relevant verses"]
        FREEZE["Click: Freeze"]
        CLI --> CHECK --> FREEZE
    end

    subgraph Layer2 ["2. Permanent Narrative (MarkdownCell)"]
        NARRATIVE["Permanent study notes, articles, and commentary"]
        FROZEN["Frozen static verses inserted seamlessly"]
        NARRATIVE --- FROZEN
    end

    subgraph Layer3 ["3. Dynamic Reactive Embed (ISLA Directives)"]
        EMBED["! at(Joh 3:16) => vs(KR92, KJV) or ! search(...)"]
        LIVE["Live, side-by-side comparative scripture card (hidden command, visible on hover)"]
        EMBED --> LIVE
    end

    FREEZE -->|"Appends Markdown & resets CLI prompt"| NARRATIVE
    NARRATIVE -.->|"Can be enriched with"| EMBED
```

### Role Matrix

| Component | UI Entity | Primary Purpose | When to Use |
| --- | --- | --- | --- |
| **CLI Scratchpad** | `CodeCell` (`$ clible`) | Fast exploration, ad-hoc queries, filtering verses via checkboxes | When searching and discovering material before committing to text. |
| **Static Narrative** | `MarkdownCell` | Main reading text, headings, commentary, and permanent references | When authoring the final document or notes. |
| **Reactive Embed** | `ISLABlock` (`!isla`, `! at(...)`, `! @`, `! ?`) | Live, dynamic queries and side-by-side translation matrices | When you want a permanent live card that reacts to translation changes. |

> [!TIP]
> **Why do CLI cells persist after freezing?**  
> In Clible-v3, a CLI cell acts as a persistent "workbench". When you click **Freeze**, the selected verses are converted into a Markdown cell below/above, and the CLI input **instantly resets back to a pristine `$ clible` prompt**. You do not need to create 50 separate CLI cells; one or two cells serve as continuous scratchpads throughout your session.

---

## 3. Fast Embedding Shortcuts in Markdown

ISLA supports 4 fast embedding patterns:

### Method 1: Standard Quick Aliases `! at(...)`, `! @`, `! ?`, `! search(...)`, `! range(...)` (Recommended)

Place an exclamation mark followed by a space directly before the source expression:

```markdown
Key comparative passage:
! at(Joh 3:16) => vs(KR92, KJV)

Passage range study:
! range(Joh 1:1, Joh 3:36) => themes(5)

Boolean text search with smart scope:
! search("armo" AND "rauha") @epistolat => count()

Alternative search with named parameters:
! search("armo", scope: epistolat, limit: 5)
```

### Method 2: Direct Line Directive `!isla ...` or `! ...`

```markdown
! at(Joh 3:16) => use(KR92)
! at(Rom 8:28-30) => vs(KR92, KJV)
! range(GEN, DEU) => count()
```

### Method 3: Inline Shortcut `` `! @...` `` or `` `!isla ...` ``

Embed live verses directly inside paragraph sentences:

```markdown
The cornerstone verse `! at(Joh 3:16) => vs(KR92, KJV)` anchors the entire chapter.
```

### Method 4: Standard Markdown Embed `![...]` and Link `[...]`

Utilizes standard single bracket Markdown embed and link syntax:

```markdown
Inline clickable reference: [@Joh 3:16]
Live embedded scripture card: ![at(Joh 3:16) => vs(KR92, KJV)]
Live cross-references: ![from(Joh 3:16) => refs(3)]
Live passage range: ![range(Joh 1:1, Joh 3:36) => themes(5)]
```

---

## 4. Smart Scopes & Automatic Translation Inference

When executing searches across smart book groups, ISLA automatically selects the matching Bible translation based on the scope language (unless an explicit `=> use(...)` pipe is provided):

| Scope Identifier | Target Books | Inferred Translation | Example Query |
| --- | --- | --- | --- |
| `@epistolat` / `@kirjeet` | Paul & General Epistles (ROM..JUD) | **KR92** (`fin-1992`) | `! search("armo") @epistolat` |
| `@epistles` / `@letters` | Paul & General Epistles (ROM..JUD) | **WEB** (`web`) | `! search("grace") @epistles` |
| `@evankeliumit` | Gospels (MAT, MRK, LUK, JHN) | **KR92** (`fin-1992`) | `! search("valkeus") @evankeliumit` |
| `@gospels` | Gospels (MAT, MRK, LUK, JHN) | **WEB** (`web`) | `! search("light") @gospels` |
| `@toora` / `@laki` | Pentateuch (GEN..DEU) | **KR92** (`fin-1992`) | `! search("liitto") @toora` |
| `@torah` / `@law` | Pentateuch (GEN..DEU) | **WEB** (`web`) | `! search("covenant") @torah` |
| `@viisaus` / `@wisdom` | Wisdom literature (JOB..SNG) | Language-matched | `! search("viisaus") @viisaus` |
| `@profeetat` / `@prophets` | Major & Minor Prophets (ISA..MAL) | Language-matched | `! search("herra") @profeetat` |
| `@historia` / `@history` | Historical books (JOS..EST) | Language-matched | `! search("kuningas") @historia` |
| `@VT` / `@OT` | Old Testament (Genesis–Malachi) | Language-matched | `! search("armo") @VT => count()` |
| `@UT` / `@NT` | New Testament (Matthew–Revelation) | Language-matched | `! search("armo") @UT => count()` |

> [!TIP]
> **Explicit override:** To search a specific translation regardless of the scope language, append `=> use(...)`:  
> `! search("grace") @epistolat => use(KJV)`

---

## 5. Visual Polish: Command Syntax Hidden in Reading Mode

When exiting edit mode (`Esc` or `Ctrl + Enter`):

1. **Clean Typography**: The technical query syntax (`! at(Joh 3:16) => vs(KR92, KJV)`) is hidden, presenting clean, distraction-free Lora serif scripture cards.
2. **Hover Inspection**: Hovering over any card reveals a floating `✦ at(Joh 3:16) => vs(KR92, KJV)` badge in the top-right corner to inspect the underlying query.

---

## 6. Monaco Intellisense & Diagnostic Engine

ISLA features rich language intelligence integrated into notebook editors:

- **Autocompletion Triggers**:
  - `! ` — Presents quick action snippets (verse lookup, range, boolean search, comparison).
  - `@` — Triggers book and smart scope completions (`@epistolat`, `@evankeliumit`, `@toora`, `@viisaus`, `@profeetat`, etc.).
  - `=>` — Suggests pipeline actions (`use()`, `vs()`, `refs()`, `themes()`, `suggest()`, `count()`, `limit()`).
  - `?` — Suggests boolean search and regex patterns.
- **Hover Documentation**: Hovering over any ISLA keyword or citation in the editor displays inline markdown documentation with parameter descriptions and examples.
- **Levenshtein Distance Diagnostics**: If you mistype an action (such as `! at(Joh 3:16) => cnt()`), the parser returns a structured diagnostic error with a helpful correction:
  `Unknown action 'cnt'. Did you mean 'count'?`

---

## 7. ISLA Syntax Reference & Cheat Sheet

| Query Pattern | Syntax Example | Rendered View | Description |
| --- | --- | --- | --- |
| **Passage Lookup** | `! at(Joh 3:16)`<br>`! @Joh 3:16` | Verse Card | Retrieves passage in default translation |
| **Passage Range** | `! range(Joh 1:1, Joh 1:5)`<br>`! range(GEN, DEU)` | Verse Collection | Fetches contiguous text passage from start to end |
| **Translation Projection** | `! at(Joh 3:16) => use(KR92)`<br>`! @Joh 3:16 => in(KR92)` | Verse Card | Projects passage into specified translation |
| **Comparative Matrix** | `! at(Joh 3:16) => vs(KR92, KJV)`<br>`! @Joh 3:16 ? KR92 : KJV` | 2-Column Matrix | Synchronized side-by-side comparative layout |
| **Cross-References** | `! at(Joh 3:16) => refs(3)`<br>`! ~ @Joh 3:16` | Verse Collection | Related cross-references from the database |
| **Thematic Extraction** | `! at(Joh 3:16) => themes(5)`<br>`! range(Joh 1:1, Joh 1:5) => themes(5)`<br>`! ^ => themes(10)` | Keyword Cloud | Extracted thematic keywords and frequencies |
| **Contextual Suggestions** | `! ^ => suggest(3)`<br>`! at(Joh 3:16) => suggest(5)` | Verse Collection | Content-driven related scripture suggestions |
| **Full-Text Search** | `! search("love")`<br>`! ? "love"` | Verse List | Full-text database search |
| **Boolean AND Search** | `! search("armo" AND "rauha")` | Verse List | Verses matching all specified search terms |
| **Boolean OR Search** | `! search("kuolema" OR "elämä")` | Verse List | Verses matching at least one specified term |
| **Named Parameter Search** | `! search("armo", scope: epistolat, limit: 5)` | Verse List | Structured search with inline scope and limit |
| **Scoped Search** | `! search("light") @Joh`<br>`! search("valkeus") => at(Joh)` | Verse List | Search restricted to specific biblical book |
| **Genre & Group Scopes** | `! search("armo") @epistolat`<br>`! search("grace") @epistles`<br>`! search("valkeus") @evankeliumit`<br>`! search("laki") @toora` | Verse List | Search restricted to smart genre group with auto-inferred translation |
| **Regex Query** | `! ? /righteous.*/ @Rom` | Verse List | Morphological pattern match |
| **Count Aggregator** | `! search("armo" AND "rauha") @epistolat => count()`<br>`! range(Joh 1:1, Joh 1:5) => count()` | Metric Card | Match count metric card |
| **Chained Pipeline** | `! search("armo") => at(epistolat) => use(KR92) => count()` | Result Card | Sequential multi-stage evaluation |


