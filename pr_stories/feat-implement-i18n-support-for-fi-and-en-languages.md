# PR Story: feat/implement-i18n-support-for-fi-and-en-languages

## Summary
Add application-wide internationalization support for English (`en`) and Finnish (`fi`). Deliver a language toggle in the UI, persist user preference, and wire the existing `frontend/src/utils/i18n.ts` strings into the app using a minimal, type-safe runtime integration.

## Motivation
The repository already contains `frontend/src/utils/i18n.ts` with type-safe strings for `en` and `fi` but the application is not yet wired to let users switch languages. This work will make it possible to present UI text in either language and provide a simple integration pattern for future translations.

## Branch
feat/implement-i18n-support-for-fi-and-en-languages

## PR title (suggested)
feat(i18n): implement runtime language support and language switcher (en/fi)

## Scope (what this PR will include)
- Add a small language context/provider (React) or equivalent minimal runtime for the framework used by the frontend.
- Add a LanguageSwitcher component (UI) to toggle between `en` and `fi`.
- Persist selected language to localStorage (or similar) and load on app boot.
- Update top-level app wrapper to provide the current language to child components.
- Provide a helper hook `useI18n()` or `useLanguage()` that returns current language and a translation accessor so components can consume translations.
- Demonstrate usage by wiring the shell/header and 2–3 prominent components (e.g., Settings label, Reader empty state, tab labels) to use the translation strings from `frontend/src/utils/i18n.ts`.

Note: This PR will not translate every single string across the app; it implements the plumbing and wires a few representative places so the pattern is clear and easy to follow.

## Acceptance criteria
- The app exposes a visible language toggle in the header or settings area.
- Switching languages immediately updates wired UI strings to the target language without a full page reload.
- Selected language is remembered across page reloads and new sessions (via localStorage).
- The `frontend/src/utils/i18n.ts` file is used as the single source-of-truth for strings for `en` and `fi`.
- New code is type-safe (uses `UILanguage` and `Messages` types from `i18n.ts`).

## Non-goals
- Full app translation of every string in this PR (we'll concentrate on plumbing + a few components).
- Introducing large third-party i18n libraries. Prefer small custom provider for now; can evolve later if needed.

## Tasks
1. Create `frontend/src/contexts/LanguageContext.tsx` (or framework-equivalent) implementing:
   - Language state (type `UILanguage`) with default `en`.
   - load/save to `localStorage` key `app:lang`.
   - function to toggle/set language.
   - a translator helper `t(key: keyof Messages)` or `strings` accessor that uses `i18n.t(currentLang)` under the hood.
2. Create `frontend/src/components/LanguageSwitcher/LanguageSwitcher.tsx`
   - Simple UI: dropdown or button group with EN / FI.
   - Uses LanguageContext to change language.
   - Place in the app shell/header (or settings) so it is visible.
3. Wrap top-level app (e.g., `frontend/src/main.tsx` or `frontend/src/App.tsx`) with `LanguageProvider`.
4. Update 2–3 components to consume translations via the new hook/provider (examples: app shell labels, Reader empty state, SearchView headings).
5. Add unit/interaction test(s) if existing test infra is present: verify switch persists and strings update.
6. Add short README note: `frontend/README.md` or `clible-v3-go/README.md` section describing the language key and how to add translations.
7. Update PR Story with final notes and list of actual files changed.

## Files likely to change (examples — exact paths depend on app structure)
- frontend/src/utils/i18n.ts  (already present)
- frontend/src/contexts/LanguageContext.tsx  (new)
- frontend/src/components/LanguageSwitcher/LanguageSwitcher.tsx  (new)
- frontend/src/App.tsx or frontend/src/main.tsx (wrap provider)
- frontend/src/components/Shell/Header.tsx (add switcher) or similar
- frontend/src/views/ReaderView.tsx (wire a sample string)
- frontend/src/views/SearchView.tsx (wire a sample string)
- frontend/src/__tests__/* (optional tests)

## Notes & implementation decisions
- Use the existing `UILanguage` union type and `Messages` interface from `i18n.ts` to keep type safety.
- Expose `useLanguage()` hook returning `{ lang, setLang, strings }` where `strings` is `Messages` obtained from `t(lang)` so components can reference `strings.readerEmptyTitle` etc.
- Keep the provider minimal and framework-safe (no external deps). If the app uses React, implement it as a React Context; if it uses another view framework, adapt accordingly.

## Risks
- If the frontend is not React (e.g., Svelte, Vue), the implementation shape will differ. I'll detect framework before implementation.
- Touching top-level app files can cause merge conflicts with ongoing work—keep the change minimal and well-documented.

## Testing / QA steps
1. Start the frontend locally.
2. Verify the language switcher appears in the header/settings.
3. Toggle to `FI` — verify wired UI strings update to Finnish.
4. Reload the page — verify the `FI` selection persists and UI remains Finnish.
5. Toggle back to `EN` — verify immediate switch and persistence.

---

If you approve this plan, reply with: `Approve plan` (or any requested edits). After your approval I will store the approved plan into `.plans/` as `clible-v3-go/.plans/feat-implement-i18n-support-for-fi-and-en-languages.md` and then proceed with the implementation steps described above (creating a branch and commits locally). You asked not to create PRs or merge — I will not do any PR/merge actions unless you explicitly request them.
