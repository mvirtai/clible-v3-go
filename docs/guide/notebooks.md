# Notebooks, 2D Canvas & Hybrid Cells

clible-v3 introduces **Clible Notebooks**, an interactive, multi-dimensional workspace designed for deep theological research, collaborative scripture exploration, and structured documentation.

Notebooks integrate narrative text, live computational queries, 2D matrix canvas layouts, and embedded **ISLA reactive directives**, allowing researchers to build structured, reproducible study paths.

---

## High-Level Concept & 2D Canvas Matrix

A Notebook is a flexible research document composed of ordered **Cells** that can be displayed as either a linear document or an expansive **2D Canvas Matrix Grid**:

- **24-Column Resizable Grid**: Each notebook card can define a `colSpan` (from 1 to 24 columns, default 12) and an optional custom `colHeight` (in pixels) for side-by-side comparative matrices.
- **Card Matrix Overview**: Multiple study streams can sit parallel on the screen without horizontal scrolling constraints.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Notebook: Romans 5 Exegesis (2D Canvas Matrix)                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│  [Card 1: Markdown Notes]        │  [Card 2: Live ISLA Embed]          │
│  colSpan: 12                     │  colSpan: 12                        │
│                                  │                                     │
│  Justification by faith brings   │  ! at(Rom 5:1) => vs(KR92, KJV)     │
│  peace with God through Christ.  │  ─────────────────────────────────  │
│                                  │  KR92: Koska me siis olemme...      │
│                                  │  KJV:  Therefore being justified... │
├──────────────────────────────────┴─────────────────────────────────────┤
│  [Card 3: CLI Query Scratchpad]                                        │
│  colSpan: 24                                                           │
│  $ clible search "grace" --scope=ROM                                   │
│  [x] ROM 5:2  [x] ROM 5:15  [ ] ROM 5:17  ──> [ Freeze to Markdown ]   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Cell Types & Hybrid Workflows

Clible Notebooks support three primary cell paradigms:

### 1. Markdown Cells (`markdown`)

Markdown cells are formatted text blocks used for exegesis notes, articles, sermon manuscripts, and headers:

- **Syntax**: Full GitHub Flavored Markdown (GFM).
- **Embedded Reactive Directives**: You can embed live ISLA directives directly inside Markdown text (e.g. `! at(Joh 3:16) => vs(KR92, KJV)` or `! search("armo") @epistolat => count()`).
- **Reading Mode Polish**: Technical query syntax is hidden in reading mode and replaced by sleek scripture cards; hovering reveals a `✦` inspect badge.

### 2. CLI Command Cells (`code`) — Persistent Scratchpad

Code cells provide an interactive command-line interface directly in the browser:

- **Syntax**: Starts with a `$ clible` command (e.g., `$ clible read Joh 3:16`, `$ clible search "armo" --scope=NT`, `$ clible compare ROM 5:1 --with=KJV`).
- **Interactive Checkboxes**: Query results display checkbox toggles next to each returned verse.
- **The "Freeze" Workflow**: Clicking **Freeze** immediately converts the checked verses into a formatted Markdown cell below, while **instantly resetting the CLI prompt** back to a clean `$ clible` state. This persistent scratchpad design prevents cluttering the document with dozens of one-off query cells.

### 3. Reactive ISLA Embeds

When authoring markdown, you can insert inline or block ISLA directives:

- `! at(Joh 3:16) => vs(KR92, KJV)` — Live 2-column comparative translation card.
- `! range(Joh 1:1, Joh 1:5) => themes(5)` — Dynamic thematic keyword cloud.
- `! search("armo" AND "rauha") @epistolat => count()` — Metric counter card.

---

## Cell Positioning, Ordering & Drag-and-Drop

To support seamless dragging, dropping, and reordering in the React frontend:

- Each cell contains an explicit `position` integer field.
- The `notebook_cells` table enforces a composite unique constraint `UNIQUE (notebook_id, position)` to eliminate ordering collisions.
- When cells are dragged to a new position:
  1. The client updates the local order positions.
  2. The client sends the entire ordered array to `PUT /api/notebooks/{id}/cells`.
  3. The backend processes a transactional save: it updates the cell records with their new positions in a single ACID transaction.

---

## Scope Integration & Workspaces

Notebooks can optionally be linked to a **Workspace Scope**:

- When created or updated with a `scopeId`, the notebook belongs to that research workspace.
- Fetching the workspace via `GET /api/scopes/workspace?id={scopeId}` returns all associated notebooks alongside saved searches and analyses in a single payload.
- If a workspace scope is deleted, linked notebooks have their `scope_id` set to `NULL` (`ON DELETE SET NULL`), ensuring personal research notes are never lost.

---

## Security, Isolation & Bilingual Support

- **User Isolation**: Every database operation verifies that the requesting user's `userID` from the JWT session matches the `user_id` stored on the notebook record.
- **Bilingual i18n**: All UI components, drag handles, button tooltips, and error notifications are localized in Finnish (`fi`) and English (`en`) via `frontend/src/i18n.ts`.

