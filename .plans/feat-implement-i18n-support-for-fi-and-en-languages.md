# Plan: feat/implement-i18n-support-for-fi-and-en-languages

## Summary
Implement application-wide i18n plumbing for English (`en`) and Finnish (`fi`) using the existing `frontend/src/utils/i18n.ts` as the single source of truth for strings. Provide a runtime language provider, a visible LanguageSwitcher, persistence of user preference, and example wiring in a few key UI places so the pattern is clear for future translations.

## Branch
feat/implement-i18n-support-for-fi-and-en-languages

## PR title (suggested)
feat(i18n): implement runtime language support and language switcher (en/fi)

## Business context
The project already contains a typed strings file (`i18n.ts`) but lacks runtime integration. Adding a small, dependency-free i18n provider makes it straightforward to present the UI in Finnish or English, improves accessibility for Finnish users, and establishes a pattern for adding more languages later.

## Scope & deliverables
- LanguageContext/Provider (React) exposing current language, setter, and typed strings.
- LanguageSwitcher component placed in the shell/header or settings area to toggle languages.
- Persist language selection to `localStorage` (key: `app:lang`).
- Wrap the top-level app with the provider.
- Wire 3 representative UI locations to use translations from `i18n.ts`: shell labels (settings, sign out), Reader empty state, and top-level tab labels. These serve as examples for broader adoption.
- Add a short README note describing how to add languages and where translations live.

## Non-goals
- Translating every string in the app within this single PR.
- Introducing large i18n libraries; keep the provider minimal and easy to replace later.

## Tasks (implementation plan)
1. Detect frontend framework (React). If not React, adapt the approach to the actual framework.
2. Create `frontend/src/contexts/LanguageContext.tsx`:
   - Provide `LanguageProvider`, `useLanguage()` hook.
   - Persist and load language from `localStorage`.
   - Expose typed `strings: Messages` using `t(lang)`.
3. Create `frontend/src/components/LanguageSwitcher/LanguageSwitcher.tsx` (simple dropdown or toggle).
4. Wrap `frontend/src/main.tsx` or `frontend/src/App.tsx` with `LanguageProvider`.
5. Update sample UI components to use `useLanguage()` and replace hardcoded strings with `strings.*` access.
6. Add `frontend/README.md` note describing language key, how to add translations, and where to find `i18n.ts`.
7. (Optional) Add a simple unit/interaction test to verify persistence and UI updates if test infra exists.

## Acceptance criteria
- Visible language toggle is present.
- Toggling languages updates wired UI strings immediately (no reload needed).
- Selected language persists across reloads.
- New code uses `UILanguage` and `Messages` types from `i18n.ts`.

## Risks & mitigation
- Framework mismatch (not React): detect framework first and adapt context/hook approach.
- Merge conflicts for top-level app files: keep provider wiring minimal and well-documented to ease future merges.

## Testing steps
1. Start the frontend app locally (project's usual dev command).
2. Confirm language toggle appears in header or settings.
3. Toggle to `fi` and verify wired strings change to Finnish.
4. Reload page and confirm `fi` is preserved.
5. Toggle back to `en` and verify persistence.

---

Plan saved at `.plans/feat-implement-i18n-support-for-fi-and-en-languages.md`.

Next action?
- I can start implementing the changes on the branch `feat/implement-i18n-support-for-fi-and-en-languages` (create branch, apply commits). I will not open or create a PR or merge anything unless you explicitly request it.
- Or I can wait for further instructions.
