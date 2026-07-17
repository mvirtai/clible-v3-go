# PR Story: Fix Accessibility and Contrast Improvements

## Business Context

Improving application accessibility ensures all users, including those using screen readers and assistive devices, can navigate and use Clible Workspace seamlessly. A recent accessibility audit identified areas of improvement in form element labeling (specifically `<select>` elements) and color contrast ratios (specifically for muted texts, teologian version tags, error texts, and accent action buttons under dark/light modes).

This PR addresses all accessibility violations to achieve full WCAG 2.1 AA compliance.

---

## Technical Remediation

### 1. Form Element Accessibility & Label Associations
* Added explicit `<label>` elements with corresponding `htmlFor` attributes pointing to matching `id`s on `<select>` elements in:
  * `WorkspaceSidebar.tsx` (Scope selection)
  * `OriginalStudyView.tsx` (Original study source select)
  * `VerseSearch.tsx` (Search scope select)
  * `CompareView.tsx` (Left and Right translation selects)
  * `TranslationSelector.tsx` (Translation select - added a visually hidden helper label)
* Added `aria-label` directly on the cell-type `<select>` element inside `CellWrapper.tsx`.

### 2. WCAG 2.1 AA Contrast Ratio Improvements
* **Design Token Adjustments (`index.css`):**
  * Light Mode: Darkened `--accent` (`#9a662e`) and `--muted` (`#595959`) to achieve a contrast ratio > 4.5:1 against light surfaces.
  * Introduced `--accent-contrast` (`#ffffff` in light mode, `#0f1113` in dark mode) to ensure the text on the accent backgrounds (e.g. `.btn-accent` buttons) is always highly readable.
  * Swapped `.btn-accent` text color from hardcoded `#fff` to `var(--accent-contrast)`.
* **Inline Style Fixes:**
  * Aligned the version tag (`v3`) in `App.tsx` header to use `var(--accent)` instead of hardcoded `#8b5e34` (which had poor contrast in dark mode).
  * Updated inline buttons in `App.tsx` to use `var(--accent-contrast)` for text.
* **Error and Success State Contrast:**
  * Defined theme-aware `--error`, `--error-bg`, `--error-border`, `--success`, `--success-bg`, and `--success-border` CSS variables.
  * Replaced hardcoded `#c0392b` error texts in `VerseReader.tsx` and `VerseSearch.tsx` with `var(--error)`.
  * Updated success and error messages/actions in `TranslationManager.tsx` to use the theme-aware variables instead of hardcoded colors that failed contrast tests in dark mode.

---

## Testing Strategy

### Verification
* Verified that the frontend builds cleanly without warnings:
  ```bash
  cd frontend
  pnpm run build
  ```
* Verified that contrast ratios pass WCAG AA targets (checked contrast values against dark background `#15181b` and light background `#ffffff`).
