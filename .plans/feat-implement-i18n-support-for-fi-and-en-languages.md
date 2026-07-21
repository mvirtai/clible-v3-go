# Plan: Implement app-wide i18n support (EN / FI)

Goal

- Add lightweight app-level internationalization for UI strings: English (en) and Finnish (fi).
- Provide a LanguageProvider (React Context) persisted to localStorage and a compact LanguageSwitcher UI.
- Make UI texts follow the chosen language runtime-wide.
- Keep implementation minimal (no external i18n packages).

Affected areas

- frontend/src/utils/i18n.ts (strings catalog)
- frontend/src/context/LanguageContext.tsx (LanguageProvider, useLanguage hook)
- frontend/src/components/LanguageSwitcher (globe icon + animated EN/FI)
- App and major UI components that show static UI text (Reader, Search, Sidebar, Notebook, Analytics, TranslationSelector, WorkspaceSidebar, Notebook cells)
- Tests: ensure frontend unit tests remain stable and pass (`task check`).

Implementation steps

1. Create `frontend/src/utils/i18n.ts` (already present) exporting:
   - UILanguage type, Messages interface
   - strings: Record<UILanguage, Messages>
   - t(lang) helper returning messages for a language
2. Add `LanguageProvider` and `useLanguage` context in `frontend/src/context/LanguageContext.tsx`:
   - Persist selection to `localStorage` key `app:lang`.
   - Provide `lang`, `setLang`, and `strings` (current messages) to consumers.
   - Default language: keep `fi` as the canonical default (tests rely on mixed expectations). Components that should obey translation language may use t(lang) locally.
3. Add `LanguageSwitcher` component with globe icon and animated EN/FI buttons.
   - Keep animation accessible and compact (slide-in/out options).
   - Toggle `setLang` on selection.
4. Wire LanguageProvider at app root (`frontend/src/main.tsx`) so whole app is wrapped.
5. Replace textual literals in components with `const { strings } = useLanguage();` and use `strings.*` for UI text. For components that need per-translation formatting (e.g. verse display labels), compute a local `lang` from `translation` prop and use `t(lang)` for those texts when appropriate.
6. Resolve build/test issues iteratively:
   - Fix parse/JSX errors (e.g. AnalyticsView button expression).
   - Stabilize tests by handling components that mix global UI language vs. per-translation UI choices (small, local fallbacks).
7. Run `task check`, iterate on failing tests until green.
8. Add short PR story document in `pr_stories/` describing changes and validation performed.

Validation

- Run `task check` (frontend lint + tests, backend tests). All checks must pass locally.
- Spot-check UI manually in dev server to confirm LanguageSwitcher toggles UI copy for both languages.
- Verify localStorage `app:lang` is updated on change and persists reloads.

Risks & tradeoffs

- Tests in the repo currently mix expectations across languages. I preserved existing behavior by keeping global default language compatible with tests and adding small, component-local fallbacks where tests relied on translation-derived text. A longer-term cleanup should harmonize tests and global language semantics.
- This is intentionally minimal to avoid heavy i18n deps. If we need contextual plurals, formatting, or runtime locale loading, adopt an established i18n library later.


If you'd like, I can now commit these plan and PR story files into the branch (I will not open a PR).