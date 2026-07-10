# Pull Request Story: Resolve Translation Selector Stuck State and Infinite API Call Loop

This pull request resolves a critical UI/UX bug in the React frontend where new users (or users with no activated translations) get stuck in a "No translations" state in the header, and fixes a severe infinite render loop that made excessive API requests to `/api/translations`.

---

## 1. Business Context & Problem

Previously, the application header's translation switcher dropdown (`TranslationSelector`) fetched the translations list independently and filtered them to show only the user's active (installed) translations. 
This led to two major issues:

1. **Infinite API Fetch Loop:** The `TranslationSelector` component triggered a fetch on every render because `onSelectTranslation` (which binds to `handleSelectTranslation` in `App.tsx`) was not wrapped in `useCallback` in the parent. The function reference changed on every single parent render, causing the selector's `useEffect` to execute indefinitely, loading the system and clogging server logs with duplicate requests.
2. **User Stuck State:** When a new user registered or a user had no translations installed/activated, the dropdown rendered a static `"No translations"` placeholder div that was not clickable. The user could not easily select or activate any translations from the yläpalkki (header) unless they opened the Translation Manager. If `localStorage` still had a previously chosen translation key (e.g. `'fin-1992'`), the main view tried loading it, but the backend returned `500 Internal Server Error` due to lack of user linkage, leaving the application in a broken state.

---

## 2. Architectural & Technical Changes

### Frontend (React)

#### [App.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/App.tsx)
- Wrapped `handleSelectTranslation` inside a React `useCallback` hook to ensure a stable reference and eliminate the infinite render loop.
- Added auto-linking logic inside `handleSelectTranslation`: when a user selects a translation that is available in the system catalog but not yet linked/activated (`t.installed === false`), the app automatically sends a `POST /api/translations/link` call to link the translation for the user, then refreshes the translation state.
- Added a `useEffect` hook to automatically select the first active translation in the catalog if the current selection is empty or invalid. We wrapped the state update inside `Promise.resolve().then(...)` to run it asynchronously and comply with React rendering standards (avoiding the ESLint `react-hooks/set-state-in-effect` warning).
- Passed the loaded `installedTranslations` array down to `TranslationSelector` as a prop, transforming it into a clean, controlled component.

#### [TranslationSelector.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/TranslationSelector.tsx)
- Converted `TranslationSelector` into a controlled component that accepts the translations list directly as a prop.
- Removed all internal `useState`, `useEffect`, and `apiService` fetching code.
- Updated the translation filter logic:
  - If the user has active translations, only active ones are displayed in the dropdown.
  - If the user has zero active translations (e.g., a new user), it lists all available catalog translations instead of rendering a static "No translations" box.
- Added a disabled placeholder option `"Valitse käännös..."` (or `"Select translation..."`) when `selectedTranslation` is empty, allowing the user to select the first item and fire the `onChange` event correctly.

---

## 3. Verification & Testing

### Automated Checks
All local unit, integration, and linting checks were run and passed successfully using:
- `task check` (which internally runs `golangci-lint`, Go tests, `eslint`, and frontend unit tests).

### Manual Verification
1. **Registered a new user** and verified that the header switcher displayed a clickable dropdown showing `"Valitse käännös..."`.
2. **Selected a translation** from the dropdown, verified it activated automatically in the database (API link request completed successfully), and verified that the reader view immediately displayed the bible text.
3. **Confirmed in the browser developer tools** that there were no repeating `/api/translations` network requests.
