# PR Story: Integrate Text Analytics and Comparison Views

This PR introduces textual analytics and side-by-side translation comparison tools to the Clible workspace, finalizing both backend and frontend layers for deep scripture analysis.

---

## Business Context

To enhance study capabilities, developers and researchers need tools to analyze text structure, token frequencies, and direct differences between multiple Bible translations. This PR completes the implementation of a linguistic statistics dashboard and a cross-translation alignment table.

---

## Architectural Changes

### Backend (Go)

1. **Book Metadata Layer**
   * Implemented `BookRepository`, `BookService`, and `BookHandler` to manage and serve canonical metadata for the 66 books of the Bible.
   * Registered endpoints `/api/books` and `/api/books/{id}`.

2. **Expanded Verse Scope Queries**
   * Extended `VerseRepository` and `VerseService` to support chapter-level and book-level retrievals (`ScopeChapter` and `ScopeBook`).
   * Integrated reference resolution directly into database queries to support comprehensive ranges like `John 3` or `Genesis 1`.

3. **Analytics Integration & Stopword Processing**
   * Registered `AnalyticsHandler` endpoints for processing word density, unique word ratios (TTR), character counts, and computing LCS-based alignment scores between translation pairs.
   * Enhanced `AnalyticService` to support loading multiple stopword language lists via comma-separated configurations, initializing it with `"en,fi,grc,el"` in `main.go` to support multi-language scripture token filtering.
   * Added automatic capitalization for key proper nouns (such as *Jumala*, *Jeesus*, *Herra*, *Israel*, *God*, *Jesus*, *Lord*) in single-word frequency lists and n-grams.

### Frontend (React & TypeScript)

1. **Dashboard UI Views**
   * **AnalyticsView**: Visualizes word frequencies with Recharts bar charts or an organic Tag Cloud, alongside key structural metrics. Fixed BarChart Y-axis tick labels and Tooltip values contrast in dark mode by using `currentColor` and explicitly mapping React-style inline styles (`itemStyle`, `labelStyle`).
   * **CompareView**: Provides a side-by-side verse comparison matrix, mapping similarity ratios with a dynamic visual indicator bar.
   * **WordCloud**: Renders a lightweight, proportional word cloud shuffled using React's `useMemo` hooks for a balanced visual layout. deterministically sorted by word hash to maintain purity.

2. **Integration & API Mapping**
   * Updated `api.ts` to perform camelCase mapping from snake_case backend payloads.
   * Adapted `App.tsx` with a responsive tab-based view mode switcher to switch between Lukukone, Tekstianalyysi, and Käännösvertailu.

---

## Verification & Testing

* **Backend Tests**: Verified that integration tests for `BookRepository`, `VerseRepository` (chapter/book scopes), and `AnalyticsHandler` compile and run successfully.
* **Frontend Tests**: Executed Vitest rendering tests for translation configurations.
* **Manual Verification**: Run within a local Docker container to verify:
  * Word cloud tag mixing and stability on view updates.
  * Side-by-side translation comparisons with HSL-gradient similarity bars.
