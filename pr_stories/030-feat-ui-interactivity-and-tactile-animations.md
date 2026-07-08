# PR Story: UI Interactivity and Tactile Animations

This PR enhances the frontend user experience by introducing subtle, highly responsive micro-interactions. These include a springy mechanical press effect (`btn-tactile`) for primary/secondary buttons and navigation tabs, elegant hover lifts (`card-tactile`) for list/search cards, smooth row highlighting for comparison views, and paragraph-level hover backdrops for active reading.

---

## Business Context

To deliver a premium, state-of-the-art Bible reader web application, the user interface must feel responsive, "alive," and cohesive. Implementing modern design principles—such as springy transitions, tactile click states, and clean focus styling—significantly increases user engagement and makes reading and comparing scriptures a more pleasant, tactile experience.

---

## Architectural & UI Changes

### Frontend Design System (`frontend/src/index.css`)

1. **Springy Transitions & Focus Outlines**:
   * Defined a global spring-based cubic-bezier transition (`--ease-spring`: `cubic-bezier(0.34, 1.56, 0.64, 1)`) and a composite `--transition-tactile` variable to unify scales, shadows, and color fades.
   * Standardized `:focus-visible` outlines for keyboard navigators, routing them to `var(--accent)` with offset padding.
   * Added smooth input focus rings for all text fields (`input[type="text"]`, etc.), scaling border color and soft ambient shadow smoothly.

2. **Tactile Click Feedback (`.btn-tactile` & `.card-tactile`)**:
   * **Buttons**: Scaling up slightly on hover (`scale(1.02)`) and collapsing on click (`scale(0.96)`) using a fast `0.08s` active duration to mimic physical click response.
   * **Cards**: Elevating cards by translating up (`translateY(-2.5px)`) and casting a soft glow shadow on hover (adapting automatically to light/dark themes). Compresses down on click.

3. **Accent Button State Hardening (`.btn-accent`)**:
   * Removed inline color definitions and unified accent buttons using CSS.
   * Leveraged `color-mix` to automatically darken the accent color by 10% on hover and 20% on click, removing hardcoded hex values.

### Component Implementations

1. **Global Header & Navigation (`frontend/src/App.tsx`)**:
   * Integrated `.btn-tactile` classes across **Log out** and **Translations** buttons.
   * Upgraded the view mode selection tabs (Lukukone, Tekstianalyysi, Käännösvertailu) to use tactile active/inactive states with a smooth transition.

2. **Lukunäkymä (`frontend/src/components/VerseReader.tsx`)**:
   * Added `.btn-tactile` and `.btn-accent` to the reference submit button.
   * **Reader Backdrops**: Individual verses now highlight with `var(--accent-bg)` on hover. This improves legibility and focus, helping users follow text segments without getting lost.

3. **Tekstihaku (`frontend/src/components/VerseSearch.tsx`)**:
   * Outfitted the search button with springy tactile behavior.
   * Upgraded search results to utilize `.card-tactile` with dynamic borders, making matches feel like clickable, interactive cards.

4. **Käännösvertailu (`frontend/src/components/CompareView.tsx`)**:
   * Enhanced the "Vertaa käännöksiä" button with tactile transitions.
   * Added a smooth color transition (`hover:bg-[var(--accent-bg)]/5 transition-colors duration-200`) to comparative table rows for quick scanning.

5. **Hakuhistoria (`frontend/src/components/SearchHistory.tsx`)**:
   * Added `.btn-tactile` to the refresh button with a rotating hover animation.

---

## Verification & Testing

* **Tactile Feedback Checks**: Hovered and clicked all buttons, tabs, and cards, confirming immediate, springy visual scaling and compression.
* **Reading & Focus Verification**: Verified that hovering over verses in the reader view highlights the text block and displays the pointer correctly. Verified table row highlight in comparison tables.
* **Build Integrity**: Built the React application locally to confirm compiling and lack of CSS syntax errors.
