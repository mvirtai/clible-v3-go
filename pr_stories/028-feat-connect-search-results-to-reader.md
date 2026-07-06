# PR Story: Connect Search Results to Reader View

## 1. Business Context & Motivation

Currently, the search engine and the reader view operate as isolated components. After performing a word or regex search, users must manually type the resulting coordinates (book, chapter, and verse) into the reader's input field to read the passage in its context.

This pull request bridges the gap by making the search results interactive. Clicking any search result instantly loads that verse and its containing chapter into the reader view.

---

## 2. Architectural & Technical Changes

### Frontend (React & TypeScript)

* **`App.tsx`**:
  * Introduced a new shared state variable `activeReference` in the main layout.
  * Passed `activeReference` to the `VerseReader` component.
  * Passed a callback `onSelectVerse={setActiveReference}` to `VerseSearch`.

* **`VerseSearch.tsx`**:
  * Added `onSelectVerse` callback to `Props` interface.
  * Styled search result items to indicate interactivity (`cursor-pointer`, `hover:bg-[var(--surface)]`, and `hover:border-[var(--accent-border)]`).
  * Attached an `onClick` handler to search results that format and trigger the callback with coordinates (e.g. `"JHN 3:16"`).

* **`VerseReader.tsx`**:
  * Added optional `activeReference` prop.
  * Refactored the coordinate fetching code out of the `handleFetch` form event handler and into a reusable asynchronous `fetchVerses(ref)` helper function.
  * Added a `React.useEffect` hook listening to `activeReference` changes to update the reader input state and trigger the verse query automatically.

---

## 3. Verification & Testing

### Manual Testing

1. Opened the workspace interface, logged in, and selected a translation.
2. Searched for a term in the Text Search.
3. Hovered over a result item (noted styling change to lighter surface and golden border accent).
4. Clicked a result.
5. Confirmed that the reader view automatically fetched the target chapter and populated its input field with the clicked coordinate.
