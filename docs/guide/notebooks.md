# Notebooks, 2D Canvas & Hybrid Cells

clible-v3 introduces **Clible Notebooks**, an interactive, multi-dimensional workspace
designed for deep theological research, collaborative scripture exploration, and
structured documentation.

Notebooks integrate narrative text, live computational queries, 2D matrix canvas layouts,
and embedded **ISLA v2 reactive directives**, allowing researchers to build structured,
reproducible study paths across dozens of annotated cell types.

---

## High-Level Concept & 2D Canvas Matrix

A Notebook is a flexible research document composed of ordered **Cells** that can be
displayed either as a linear document or as an expansive **2D Canvas Matrix Grid**:

- **24-Column Resizable Grid**: Each notebook card defines a `colSpan` (1–24 columns,
  default 12) and an optional `colHeight` (in pixels) for side-by-side comparative layouts.
- **Card Matrix Overview**: Multiple study streams sit in parallel without horizontal
  scrolling constraints.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Notebook: Romans 5 Exegesis (2D Canvas Matrix)                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│  [Card 1: Markdown Notes]        │  [Card 2: Live ISLA v2 Embed]       │
│  colSpan: 12                     │  colSpan: 12                        │
│                                  │                                     │
│  Justification by faith brings   │  @(Rom 5:1).vs(KR92, KJV) =>       │
│  peace with God through Christ.  │  ─────────────────────────────────  │
│                                  │  KR92: Koska me siis olemme...      │
│                                  │  KJV:  Therefore being justified... │
├──────────────────────────────────┴─────────────────────────────────────┤
│  [Card 3: CLI Query Scratchpad]                                        │
│  colSpan: 24                                                           │
│  $ clible search "grace" --scope=ROM                                   │
│  [x] ROM 5:2  [x] ROM 5:15  [ ] ROM 5:17  ──> [ Freeze to Markdown ]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Cell Types & Hybrid Workflows

Clible Notebooks support three primary cell paradigms:

### 1. Markdown Cells (`markdown`)

Markdown cells are formatted text blocks used for exegesis notes, articles, sermon
manuscripts, and section headers:

- **Syntax**: Full GitHub Flavored Markdown (GFM).
- **Embedded Reactive Directives**: You can embed live ISLA v2 directives directly inside
  Markdown text, for example:
  ```markdown
  The cornerstone verse in Paul's argument:

  ! @(Rom 5:1).vs(KR92, KJV) =>

  Lexical analysis of this passage:

  ! @(Rom 5:1-5).stats() >>
  ```
- **Reading Mode Polish**: Technical query syntax is hidden in reading mode and replaced
  by sleek scripture cards. Hovering over any card reveals a `✦` inspect badge
  showing the underlying ISLA expression.

### 2. CLI Command Cells (`code`) — Persistent Scratchpad

Code cells provide an interactive command-line interface directly in the browser:

- **Syntax**: Starts with a `$ clible` command (e.g., `$ clible read Joh 3:16`,
  `$ clible search "armo" --scope=NT`).
- **Interactive Checkboxes**: Query results display toggleable checkboxes next to each verse.
- **The "Freeze" Workflow**: Clicking **Freeze** converts checked verses into a formatted
  Markdown cell while **instantly resetting** the CLI prompt to a clean `$ clible` state.
  One scratchpad cell serves as a continuous inquiry workbench throughout the session —
  no need to create dozens of one-off query cells.

### 3. Reactive ISLA v2 Embeds

When authoring Markdown cells, you can insert inline ISLA v2 directives as block or
inline elements. These are evaluated server-side and rendered as live result cards:

```isla
@(Joh 3:16).vs(KR92, KJV) =>
range(Joh 1:1, Joh 1:18).themes(8) >>
search("armo" AND "rauha").at(epistolat).count() =>
^all.stats() >> Notebook Analytics
```

See the [ISLA v2 Language Guide](/guide/isla-guide) for the complete syntax reference.

---

## ISLAEditor — Interactive Query Input & Gestures

The **ISLAEditor** component provides real-time language intelligence and ergonomic gestures directly in the
notebook cell editor, powered by pure modular TypeScript helpers (`islaLexer.ts`, `islaIntellisense.ts`, `islaEditorGestures.ts`):

### Syntax Highlighting Overlay Pattern

The editor uses an **overlay pattern** to render ISLA tokens in rich color without the overhead of heavy external web editor dependencies:

```
┌──────────────────────────────────────────────────────────────────────┐
│ div.relative (wrapper)                                                │
│ ├─ div[aria-hidden] ISLASyntaxLayer  ← colour-coded token overlay    │
│ │   ├─ @(          ← amber (trigger)                                 │
│ │   ├─ Joh 3:16   ← cyan (citation)                                 │
│ │   └─ .vs(       ← fuchsia (method)                                │
│ └─ <textarea>      ← transparent text, visible amber caret           │
└──────────────────────────────────────────────────────────────────────┘
```

The `<textarea>` handles standard browser keyboard input, native selections, and undo stacks with `color: transparent`, while the `aria-hidden` overlay renders matching tokenized `<span>` elements aligned pixel-perfectly.

### Smart Typing Gestures

To speed up analytical composition, the editor includes automated typing helpers:

- **Smart `!` Command Trigger**: Typing `!` at the start of an empty command line automatically inserts `! ` and immediately triggers the root autocompletion menu.
- **Smart `@` Verse Trigger**: Typing `@` automatically outputs `@()` with the cursor positioned inside `@(|)` to prompt instant biblical book suggestions.
- **Auto-Closing Delimiters**: Typing `(`, `"`, or `'` inserts the matching pair with centered caret placement.
- **Selection Wrapping**: Selecting text and typing `@`, `(`, `"`, or `'` wraps the selection non-destructively.
- **Overtype Skipping**: Typing `)`, `"`, or `'` against existing closing punctuation skips forward without duplicating the character.
- **Pair Deletion**: Pressing Backspace inside `@(|)` removes the entire wrapper cleanly.

### Autocompletion & Intellisense

Typing in the editor triggers context-aware suggestions:

| Cursor context | Suggestions offered |
|---|---|
| `!` | Root snippet queries (`@(Joh 3:16) =>`, `search("armo") =>`) |
| `@(` | Canonical book names and smart genre groups (`Joh`, `ROM`, `GEN`, `epistolat`, ...) |
| `search(` / `?` | Query templates, boolean patterns, regex literals |
| `range(` / `(` | Canonical book and chapter range patterns with `..` support |
| `#` | Variable snippet templates containing `#` (`! #armo.top(10) =>`) |
| `.` | All valid methods for the current object type |
| `.at(` | All scope identifiers and book names |
| `.use(` | Installed translation IDs |
| `.vs(` | Two-translation pair templates |

Keyboard navigation: `↑↓` moves focus, `Enter/Tab` selects, `Escape` closes.

### Hover Documentation & Levenshtein Diagnostics

Hovering over any ISLA keyword or method displays documentation with type signatures and examples. Unrecognized method names return instant Levenshtein suggestions:

```
isla: unknown method .cnt()
      Did you mean: .count() ?
```

---

## Cell Positioning, Ordering & Drag-and-Drop

To support seamless dragging, dropping, and reordering in the React frontend:

- Each cell contains an explicit `position` integer field.
- The `notebook_cells` table enforces a composite unique constraint
  `UNIQUE (notebook_id, position)` to eliminate ordering collisions.
- When cells are dragged to a new position:
  1. The client updates the local position array.
  2. The client sends the entire ordered array to `PUT /api/notebooks/{id}/cells`.
  3. The backend processes a transactional save with a single ACID transaction.

---

## Scope Integration & Workspaces

Notebooks can optionally be linked to a **Workspace Scope**:

- When created or updated with a `scopeId`, the notebook belongs to that research workspace.
- Fetching the workspace via `GET /api/scopes/workspace?id={scopeId}` returns all associated
  notebooks alongside saved searches and analyses in a single payload.
- If a workspace scope is deleted, linked notebooks have their `scope_id` set to `NULL`
  (`ON DELETE SET NULL`), ensuring personal research notes are never lost.

---

## Security, Isolation & Bilingual Support

- **User Isolation**: Every database operation verifies that the requesting user's `userID`
  from the JWT session matches the `user_id` stored on the notebook record.
- **Bilingual i18n**: All UI components, drag handles, button tooltips, and error
  notifications are localized in Finnish (`fi`) and English (`en`) via `frontend/src/i18n.ts`.
