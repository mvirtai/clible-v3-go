# ISLA Language Guide & Hybrid Cells

> **ISLA** — *Inline Structure & Logic Architecture*  
> (Also: *Interactive Scripture & Layout Analyzer*)  
> *A comprehensive guide to ISLA syntax, quick line directives (!isla, !@), hybrid notebook workflows, and reactive Markdown blocks.*

---

## 1. Overview & Vision

In traditional computational notebooks and study environments, researchers are often forced to choose between two extremes:

1. **Static Narrative (Markdown)**: Ideal for reading and publishing, but unable to dynamically update or compare scriptures across different translations without tedious copy-pasting.
2. **Command Cells (CLI / REPL)**: Powerful for querying, but produce fragmented, cell-heavy documents that cannot be read smoothly as continuous articles, commentaries, or sermon manuscripts.

**ISLA bridges this gap with a unified hybrid architecture:**
You write clean, standard Markdown text and seamlessly embed fast **ISLA quick directives** (such as `!@Joh 3:16 ? KR92 : KJV` or `!isla ...`). The execution engine parses them into deterministic ASTs and renders responsive, live scripture comparison cards directly within your narrative flow.

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
        EMBED["!@Joh 3:16 ? KR92 : KJV or !isla ..."]
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
| **Reactive Embed** | `ISLABlock` (`!isla`, `!@`, `!?`) | Live, dynamic queries and side-by-side translation matrices | When you want a permanent live card that reacts to translation changes. |

> [!TIP]
> **Why do CLI cells persist after freezing?**  
> In Clible-v3, a CLI cell acts as a persistent "workbench". When you click **Freeze**, the selected verses are converted into a Markdown cell below/above, and the CLI input **instantly resets back to a pristine `$ clible` prompt**. You do not need to create 50 separate CLI cells; one or two cells serve as continuous scratchpads throughout your session.

---

## 3. Fast Embedding Shortcuts in Markdown

Forget clumsy multi-line code fences! ISLA supports 4 fast embedding patterns:

### Method 1: Ultra-Fast Quick Aliases `!@` and `!?` (Recommended)

Place an exclamation mark directly before `@` or `?`:

```markdown
Key comparative passage:
!@Joh 3:16 ? KR92 : KJV

Quick text search:
!? "light" @Joh => limit:3
```

### Method 2: Direct Line Directive `!isla ...` or `! ...`

```markdown
!isla @Joh 3:16 => KR92
! @Rom 8:28-30 ? KR92 : KJV
```

### Method 3: Inline Shortcut `` `!isla ...` `` or `` `!@...` ``

Embed live verses directly inside paragraph sentences:

```markdown
The cornerstone verse `!@Joh 3:16 ? KR92 : KJV` anchors the entire chapter.
```

### Method 4: Markdown Embed Tag `![[@...]]`

```markdown
Clickable link: [[Joh 3:16]]
Live embedded card: ![[@Joh 3:16 ? KR92 : KJV]]
```

---

## 4. Visual Polish: Command Syntax Hidden in Reading Mode

When exiting edit mode (`Esc` or `Ctrl + Enter`):

1. **Clean Typography**: The technical query syntax (`!@Joh 3:16 ? KR92 : KJV`) is hidden, presenting clean, distraction-free Lora serif scripture cards.
2. **Hover Inspection**: Hovering over any card reveals a floating `✦ @Joh 3:16 ? KR92 : KJV` badge in the top-right corner to inspect the underlying query.

---

## 5. ISLA Syntax Reference & Cheat Sheet

| Query Pattern | Syntax Example | Rendered View | Description |
| --- | --- | --- | --- |
| **Verse Lookup** | `@Joh 3:16` | Verse Card | Retrieves passage in default translation |
| **Pipeline Projection** | `@Joh 3:16 => KR92` | Verse Card | Projects passage into specified translation |
| **Ternary Comparison** | `@Joh 3:16 ? KR92 : KJV` | 2-Column Matrix | Synchronized side-by-side comparative layout |
| **Full-Text Search** | `? "love"` | Verse List | Full-text FTS5 database search |
| **Scoped Search** | `? "light" @Joh` | Verse List | Search restricted to specific biblical book |
| **Testament Filter** | `? "grace" @NT` | Verse List | Search restricted to New or Old Testament |
| **Regex Query** | `? /righteous.*/ @Rom` | Verse List | Morphological pattern match |
| **Count Aggregator** | `? "grace" @Rom => count` | Metric Card | Match count metric card |
| **Contextual Scope** | `^ => #themes` | Badge Cloud | Extracted thematic keywords from prior cells |
