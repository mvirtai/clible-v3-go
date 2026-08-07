# feat: add drag-and-drop reordering to notebook cells

## Business Context

The Clible notebook editor allows users to build structured documents from
sequential markdown and CLI code cells. Previously, cells could only be
reordered using explicit "Move Up" / "Move Down" button presses in the cell
toolbar, which becomes tedious when reorganizing long notebooks.

This PR introduces native **drag-and-drop (DnD) cell reordering** via a
dedicated drag handle in each cell's toolbar. The implementation is backed by
the modern `@dnd-kit/react` library (v6+), which is the new unified successor
to the older `@dnd-kit/core` + `@dnd-kit/sortable` package family and provides
first-class React 19 support.

---

## Architectural Changes

### Library Selection — `@dnd-kit/react` v6+

The DnD functionality is powered by two lightweight packages:

- **`@dnd-kit/react`** — provides `DragDropProvider` (context) and
  `useSortable` (per-cell hook for drag semantics and position tracking).
- **`@dnd-kit/helpers`** — provides the `move()` utility for performing
  type-safe, immutable array reordering after a drag ends.

These replace the legacy multi-package split (`@dnd-kit/core`, `@dnd-kit/sortable`,
`@dnd-kit/utilities`) while keeping bundle impact minimal.

### Component Architecture

#### `NotebookEditor.tsx` — DragDropProvider wrapper

The sortable cell list is wrapped with `<DragDropProvider>`. The `onDragEnd`
event handler receives the completed drag event and atomically updates the
React state via `reorderCells(move(prev, event))`:

```tsx
<DragDropProvider
  onDragEnd={(event) => {
    setCells((prev) => reorderCells(move(prev, event)));
  }}
>
  {/* ... cell list ... */}
</DragDropProvider>
```

After state update, the existing 1 500 ms debounce effect fires `saveCells()`,
which propagates the new `position` indices to the backend via
`PUT /api/notebooks/:id/cells`. No additional wiring was required.

#### `CellWrapper.tsx` — `useSortable` hook + drag handle

Each cell registers itself with the DnD context through the `useSortable` hook:

```tsx
const { ref, handleRef, isDragging } = useSortable({ id: cell.id, index });
```

- **`ref`** — attached to the outer `<div>`, makes the whole cell a valid drop
  target and drag source bounding box.
- **`handleRef`** — attached to the `≡` handle `<span>` in the toolbar,
  restricting drag initiation strictly to the handle (prevents accidental drags
  when interacting with editor content).
- **`isDragging`** — drives a visual `opacity-40 ring-2 ring-amber-500/50`
  style on the dragged cell ghost, giving clear spatial feedback.

### i18n Support

A new translation key `dragHandleTitle` was added to `frontend/src/utils/i18n.ts`
for both supported locales:

| Locale | Value |
|--------|-------|
| `en`   | `Drag to reorder cells` |
| `fi`   | `Vedä solua uudelleen järjestämiseksi` |

The key is consumed in `CellWrapper` for the handle's `title` and `aria-label`
attributes, maintaining full accessibility compliance.

---

## Bug Fixes During Development

The initial implementation surfaced a critical DnD behavioural bug: dropping a
cell did not produce the expected reorder — instead, the dragged cell snapped
back to its original position. Root cause analysis (tracked across two
debugging sessions) identified that the `onSort` event signature used in early
commits did not match the actual `@dnd-kit/react` v6 API surface.

The fix was to switch from the non-existent `onSort` prop to the correct
**`onDragEnd`** event and pass the full raw event object directly to `move()`,
which internally resolves source/target positions:

```diff
- onSort={(event) => {
-   const { source, target } = event;
-   if (source && target) {
-     setCells((prev) => reorderCells(move(prev, source, target)));
-   }
- }}
+ onDragEnd={(event) => {
+   setCells((prev) => reorderCells(move(prev, event)));
+ }}
```

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/notebook/NotebookEditor.tsx` | Added `DragDropProvider` wrapper + `onDragEnd` handler |
| `frontend/src/components/notebook/CellWrapper.tsx` | Integrated `useSortable` hook; added `handleRef` drag handle `<span>` |
| `frontend/src/utils/i18n.ts` | Added `dragHandleTitle` key to `Messages` interface + `en` / `fi` translations |
| `frontend/src/components/notebook/CellWrapper.test.tsx` | New unit tests: drag handle rendering, delete button click handler |
| `frontend/src/components/notebook/NotebookEditor.test.tsx` | New unit tests: `DragDropProvider` mount, notebook/cell rendering; mocks for `@dnd-kit/react`, `@dnd-kit/react/sortable`, `@dnd-kit/helpers` |
| `.plans/09-notebook-drag-and-drop.md` | Step-by-step implementation tutorial (Finnish) |

---

## Testing Strategy

### Unit Tests

Two new test suites cover the DnD-aware components:

**`CellWrapper.test.tsx`**

- `renders cell content and drag handle button` — verifies that the `≡` drag
  handle element is present in the DOM (queried by `title` attribute matching
  Finnish/English locale strings).
- `handles move and delete button clicks` — simulates a click on the delete
  button and asserts the `onDelete` callback fires exactly once.

**`NotebookEditor.test.tsx`**

- `loads and renders notebook cells inside DragDropProvider` — mocks `fetch`
  to return a two-cell fixture notebook; verifies the `DragDropProvider`
  wrapper renders, the notebook title appears, and cell content is visible.
- All three `@dnd-kit` modules (`@dnd-kit/react`, `@dnd-kit/react/sortable`,
  `@dnd-kit/helpers`) are stubbed with transparent no-op mocks, keeping tests
  isolated from DnD event simulation complexity.

### Manual Verification

- Opened a multi-cell notebook in the browser.
- Grabbed the `≡` handle on any cell and dragged it to a new position — cells
  reordered smoothly with amber highlight on the dragging ghost.
- Verified the new order persisted after the 1.5 s auto-save (confirmed via
  browser network tab showing `PUT /api/notebooks/:id/cells` with correct
  positional indices).
- Tested light and dark themes — drag visual states render correctly in both.
- Confirmed that Move Up / Move Down buttons remain functional alongside DnD.
