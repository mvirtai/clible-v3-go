# PR Story: Persistent Workspace Sidebar Across All Views

This PR restructures the main application layout so that the workspace sidebar (`WorkspaceSidebar`) is always visible on the right side of the screen, regardless of which view tab (Lukukone, Tekstianalyysi, Käännösvertailu) is currently active. Previously, the sidebar was only accessible from the reader view.

---

## Business Context

Users working with saved search results, verse passages, and text analytics in their workspaces had to navigate back to the reader tab every time they wanted to switch workspace scopes, load saved items, or verify what was already saved. This created unnecessary friction in the study workflow, especially when comparing translations or running text analytics — the two views where workspace context is most valuable.

By making the sidebar persistent, users can now:

- Switch workspaces from any tab without navigating away from their current analysis
- Load saved searches and analyses directly from the analytics or comparison views
- See their workspace content at all times, reinforcing the "workspace-centric" study experience

---

## Architectural Changes

### Component: App

#### [MODIFY] [App.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/App.tsx)

**Before:** The grid layout (`grid-cols-3`) was nested inside the `viewMode === 'reader'` conditional block. The analytics and compare views rendered as full-width standalone `<div>` elements with no sidebar.

**After:** The grid layout is lifted outside all view conditionals and wraps all three views:

- **Left column** (`lg:col-span-2`): Renders the active view content conditionally — `VerseReader` + `VerseSearch` for reader mode, `AnalyticsView` for analytics, `CompareView` for comparison.
- **Right column**: Always renders `WorkspaceSidebar`, conditionally renders `SearchHistory` (reader mode only), and always renders the `QuickStart` card.

Key structural change (simplified):

```diff
-{viewMode === 'reader' && (
-  <grid cols-3>
-    <col-span-2> Reader + Search </col-span-2>
-    <col-span-1> Sidebar + History + QuickStart </col-span-1>
-  </grid>
-)}
-{viewMode === 'analytics' && <AnalyticsView />}
-{viewMode === 'compare' && <CompareView />}
+<grid cols-3>
+  <col-span-2>
+    {viewMode === 'reader' && Reader + Search}
+    {viewMode === 'analytics' && <AnalyticsView />}
+    {viewMode === 'compare' && <CompareView />}
+  </col-span-2>
+  <col-span-1>
+    <WorkspaceSidebar />              {/* Always visible */}
+    {viewMode === 'reader' && <SearchHistory />}
+    <QuickStart />                    {/* Always visible */}
+  </col-span-1>
+</grid>
```

The `max-w-5xl mx-auto` wrapper divs around `AnalyticsView` and `CompareView` were removed since the grid column (`lg:col-span-2`) now controls their width.

---

## Summary of Changes

| File | Change |
|------|--------|
| `App.tsx` | Lifted grid layout outside view conditionals; sidebar is now persistent across all tabs |

**Total:** 1 file changed, ~100 lines restructured (net -2 lines)

---

## Verification & Testing

### Verification Checklist

- [x] Workspace sidebar is visible in all three tabs: Lukukone, Tekstianalyysi, Käännösvertailu.
- [x] Switching workspace scope from analytics or compare view correctly updates the sidebar.
- [x] Loading a saved search from the sidebar while in analytics view correctly switches to reader mode and loads the search.
- [x] Loading a saved analysis from the sidebar while in reader view correctly switches to the appropriate analytics/compare mode.
- [x] `SearchHistory` component only appears in reader mode.
- [x] `QuickStart` card is always visible across all views.
- [x] Layout is responsive — sidebar stacks below content on mobile (`grid-cols-1`), side-by-side on desktop (`lg:grid-cols-3`).
- [x] Light and dark mode rendering verified for the persistent layout.
- [x] Dev server runs without errors; all API endpoints respond correctly.
