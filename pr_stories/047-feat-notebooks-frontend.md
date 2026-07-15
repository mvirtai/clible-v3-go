# PR Story: Implement React-Based Notebook Cells, Editor, and Inline Verse Linking

## Business Context

Clible Notebooks allows theological researchers and students to combine freeform notes (Markdown) with interactive queries (Clible CLI commands) and data visualisations in a single cohesive document. Following the database and backend foundations laid in previous phases, this PR implements the frontend user interface for managing notebook cells.

In addition to core cell CRUD operations, this PR introduces a powerful **inline verse linking** mechanism allowing users to weave interactive scripture references (e.g., `[[GEN 1:1]]`) directly into their theological journal entries. Hovering over a verse link fetches the text in a tooltip, and clicking it takes the user directly to the verse in the **Reader** view.

---

## Architectural Changes

### Frontend Components (`frontend/src/components/notebook/`)

The notebook interface is broken down into five main files to ensure modularity, separation of concerns, and strict type-safety:

1. **[types.ts](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/types.ts)**:
   Contains the shared TypeScript interfaces for `Cell`, `Notebook`, `CellResult`, and `CellType` models aligned with the backend REST API payload specifications.

2. **[MarkdownCell.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/MarkdownCell.tsx)**:
   - Supports **Preview** and **Edit** states.
   - Double-clicking transitions to the edit state. The edit textarea features a natural serif font (`font-serif`) and styling compatible with both light and dark themes.
   - **Inline Verse Parsing**: Text in the format of `[[Book Chapter:Verse]]` (e.g. `[[GEN 1:1]]` or `[[Joh. 3:16]]`) is preprocessed on render to custom links (`bible://`).
   - **BibleVerseLink Component**: Extends `ReactMarkdown` anchor rendering. Hovering over these links triggers a lazy fetch to `/api/verses` and displays the scripture text inside a floating tooltip. Clicking a link triggers an event to switch views.

3. **[CodeCell.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/CodeCell.tsx)**:
   - Simulates a Clible CLI command line interface.
   - Provides a terminal-like input line (`$ clible`) for executing commands and rendering results.
   - **Type Safety**: Avoids explicit `any` usage by explicitly casting and structuring array results to a defined `VerseData` interface. Uses safe type-guards for checking `unknown` server error payloads.

4. **[CellWrapper.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/CellWrapper.tsx)**:
   - A layout container wrapping every individual cell.
   - Implements a floating actions toolbar that appears on hover, providing options to:
     - Shift the cell position up or down.
     - Toggle the cell type between Markdown and CLI Command.
     - Delete the cell.
   - Styled using CSS variables (`var(--border-soft)`, `var(--surface)`) to dynamically adjust to active application themes.

5. **[NotebookEditor.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/notebook/NotebookEditor.tsx)**:
   - The primary controller component responsible for orchestrating the overall state.
   - Performs a fetch query to load the target notebook and sort its cells sequentially based on their `position`.
   - Listens to cell changes and schedules an automatic save request to the backend database (`PUT /api/notebooks/:id/cells`) using a 1500ms debounce buffer. Sends requests as flat JSON arrays to match the Go API signature.
   - Passes the `onSelectVerse` callback downstream to support interactive click-to-view navigation.

---

## Styling & Theme Integration

Hardcoded absolute dark classes have been replaced with standard CSS variables (`var(--text)`, `var(--surface-2)`, `var(--border-soft)`). This ensures:
- Full accessibility and readability of notebook titles, descriptions, and empty placeholders in the **Light Theme** (which previously rendered invisible due to `text-neutral-100` classes).
- Seamless theme transitions.
- A clean, cohesive user interface matching the existing Clible aesthetic.

---

## Testing & Verification Strategy

### Manual Verification

1. **Inline Verse Linking & Tooltips**:
   - Write a note containing `[[GEN 1:1]]`.
   - Save the cell and hover over `GEN 1:1` to verify the tooltip loads the text for Genesis 1:1.
   - Click the link and verify that you are redirected to the Reader tab with the verse opened.

2. **Light Theme Compliance**:
   - Switch the application theme to light mode.
   - Verify that all notebook lists, titles, placeholders, cell action buttons, and edit state inputs adapt beautifully and remain fully legible.

3. **Auto-Save & Reordering**:
   - Reorder cells and verify that the `Saving...` indicator triggers, followed by `Saved` once the debounce completes.
