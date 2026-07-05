# PR Story: Light/Dark Mode Switch and Interactive Hover Animations

This PR implements a manually togglable light/dark theme switch in the workspace header, persists the user's preference in `localStorage`, prevents Flash of Unstyled Content (FOUC) during initial page load, and adds rich, tactile hover transitions for the controls.

---

## Business Context

To enhance usability and developer ergonomics during long sessions, the workspace requires a manually togglable dark mode. The toggle needs to feel premium and responsive, following modern design aesthetics (micro-animations, smooth transitions, tactile feedback), and must remember the user's choice across browser reloads without jarring white flashes on startup.

---

## Architectural Changes

### Frontend (React & CSS)

1. **Theme State & Persistence (`frontend/src/App.tsx`)**
   * Initialized theme state in React (`'light' | 'dark'`) by probing the document root element's class list.
   * Created a `toggleTheme` function that toggles classes on `document.documentElement`, syncs the state with `localStorage`, and updates React UI state dynamically.

2. **FOUC (Flash of Unstyled Content) Prevention (`frontend/index.html`)**
   * Added an inline blocking script inside `<head>` to resolve and inject the correct `.dark` theme class as early as possible. It checks for a stored theme preference in `localStorage` and falls back to the system's `prefers-color-scheme` media query before React boots.

3. **Global Color Transitions (`frontend/src/index.css`)**
   * Refactored and expanded color transition rules. Added `#root`, `div`, `span`, `p`, headings (`h1` through `h3`), and `code` tags to the transition selector.
   * Configured smooth `0.25s ease` transitions for `background-color`, `border-color`, and `color` properties. This prevents sudden layout color flashes and creates a unified cross-fade when toggling themes.

4. **Rich Button Interactions & Micro-Animations (`frontend/src/index.css`)**
   * Replaced the inline styles of the theme switch button with a dedicated `.theme-toggle-btn` class.
   * **Tactile Feedback**: Configured springy scale transitions. The button scales up (`scale(1.08)`) on hover and compresses (`scale(0.95)`) on click (`:active`), providing immediate physical feedback.
   * **Visual Hover Styling**: Added transition effects that shift the border to `var(--accent)`, background to `var(--surface)`, and add a glowing accent shadow (`var(--accent-bg)`) on hover.
   * **Icon-Specific Animations**:
     * **Moon**: Tilts slightly (`rotate(-18deg)`) and scales up, changing its color to the warm accent color when hovered.
     * **Sun**: Has a slow idle spin (`15s linear infinite`) that speeds up (`4s` duration) on hover to signify activity.

### Workflow & Tooling (Taskfile)

1. **Automated PR Title Formatting (`Taskfile.yml`)**
   * Refactored the `git:pr` task variables to automatically extract and format the pull request `TITLE` from the provided `FILE` parameter when not explicitly overridden.
   * Strips the file path, leading numbers, and file extension (e.g. converting `026-feat-light-dark-mode-and-animations.md` to `feat: light dark mode and animations`) using POSIX-compliant `sed` regexes, enforcing consistent lowercase Conventional Commits formatting across PR titles automatically.

---

## Verification & Testing

* **Functional Verification**: Verified that clicking the theme button successfully toggles between light and dark modes, changing all background, surface, text, and border variable values instantly.
* **Persistence & FOUC check**: Cleared browser data, refreshed, and checked that the initial load matches the system preferences. Changed theme to dark, refreshed, and verified that no white flash occurred before the dark theme loaded.
* **Transition and Animation Inspection**: Hovered over the theme switch button and verified that:
  - The button scales up slightly with a springy transition.
  - The Moon tilts and highlights.
  - The Sun accelerates its rotation.
  - Clicking scales the button down slightly.
  - The rest of the page fades smoothly into the new theme.
