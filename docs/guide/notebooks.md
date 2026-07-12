# Notebooks & Cells

clible-v3 introduces **Clible Notebooks**, an interactive, Jupyter Notebook-style workspace designed for deep theological research and structured scripture documentation. 

Notebooks integrate narrative notes with live queries and computational outputs, allowing developers and theological researchers to build structured, reproducible study paths.

---

## High-Level Concept

A Notebook is a document containing a sequence of independent **Cells**. 
Each cell represents either a block of static text or a dynamic script execution. Cells are arranged linearly and can be added, deleted, edited, or reordered dynamically.

```
┌────────────────────────────────────────────────────────┐
│  Notebook: Romans 5 Exegesis                           │
├────────────────────────────────────────────────────────┤
│  [Markdown Cell]                                       │
│  This notebook explores the concept of justification... │
├────────────────────────────────────────────────────────┤
│  [Code/Command Cell]                                   │
│  > /compare ROM 5:1-2                                  │
│  ────────────────────────────────────────────────────  │
│  Output:                                               │
│  web: ROM 5:1 | Being therefore justified by faith...  │
│  kjv: ROM 5:1 | Therefore being justified by faith...  │
└────────────────────────────────────────────────────────┘
```

---

## Cell Types

Clible Notebooks support two distinct cell types:

### 1. Markdown Cells (`markdown`)
Markdown cells are static text blocks used for documentation, exegesis notes, and formatting headers.
- **Syntax**: Full GitHub Flavored Markdown (GFM).
- **Behavior**: Renders into clean, readable HTML using standard typographies (such as Georgia serif).

### 2. Code Cells (`code`)
Code cells are interactive command inputs where users can execute specific study queries.
- **Syntax**: Starts with a slash command (e.g., `/read`, `/search`, `/compare`, `/analyze`).
- **Behavior**: When evaluated, the backend executes the query, compiles structured outputs, and caches the result payload.
- **State Storage**: The output is serialized and persisted as a structured JSON object (`result_json`) to prevent unnecessary server recalculations upon notebook reloading.

---

## Cell Positioning and Ordering

To support seamless dragging, dropping, and reordering in the React frontend:
- Each cell contains a `position` integer field.
- The `notebook_cells` table enforces a composite unique constraint `UNIQUE (notebook_id, position)` to ensure there are no collisions.
- When cells are reordered, deleted, or added:
  1. The client updates the local order positions.
  2. The client pushes the entire ordered list of cells to `PUT /api/notebooks/{id}/cells`.
  3. The backend executes a transactional save: it clears the old cells for the notebook and batch-inserts the new list with updated positions.

---

## Scope Integration

Notebooks can optionally be linked to a **Workspace Scope**:
- When a notebook is created with a `scopeId`, it becomes part of that workspace.
- Fetching the workspace via `GET /api/scopes/workspace?id={scopeId}` will automatically return all associated notebooks alongside saved searches and analyses.
- If a workspace scope is deleted, any linked notebooks have their `scope_id` set to `NULL` (`ON DELETE SET NULL`), preserving the user's research notebooks while cleaning up the workspace.

---

## Security and Isolation

Notebooks and cells are tightly bound to the authenticated user:
- Every query to fetch, update, delete, or save notebook data verifies that the requesting user's `userID` (extracted from the JWT session) matches the `user_id` stored in the database.
- Attempting to access or modify a notebook owned by another user returns an HTTP `403 Forbidden` status.
