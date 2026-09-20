# Clible Guest Mode & Authentication Patterns

When developing features, endpoints, and UI components in the Clible codebase, adhere to the following patterns for guest mode, authentication, and frontend structure:

## 1. Backend: Optional vs Required Authentication (Go / Chi)

- **Middleware Selection**:
  - Use `middleware.RequireAuth(authService)` for strictly protected endpoints that require a signed-in user (e.g. creating/saving private notebooks, user profile mutations).
  - Use `middleware.OptionalAuth(authService)` for endpoints supporting both guests and authenticated users (e.g. translations catalog, public search, sample workspaces).

- **Context User Extraction**:
  - Always extract user ID using `ctxkeys.GetUserID(r.Context())` or `middleware.GetUserID(r.Context())` returning `(string, bool)`.
  - Never use raw untyped context keys or bypass context helper functions.
  - When `ok == false`, branch cleanly to guest/public queries (e.g., public catalog `GetPublicTranslations` or read-only public data) without failing with 401 Unauthorized.

## 2. Frontend: Guest State & UI Standards (React / TypeScript)

- **Function Components**:
  - Use standard function component syntax (`export function ComponentName(props: Props): JSX.Element`) instead of `React.FC` to support optimal TypeScript inference and React compiler optimization.

- **Guest Awareness & UX**:
  - Explicitly handle guest state (`!user` or guest indicators) in layout headers, sidebars, and workspaces.
  - Provide non-intrusive registration prompts or guest status badges rather than hard-blocking page views.
  - Keep public routes accessible to guests; only prompt for authentication/registration upon write actions or accessing user-restricted storage.

- **Localization (i18n)**:
  - Add all guest-related labels, banners, buttons, and badges to `src/utils/i18n.ts` in both Finnish (`fi`) and English (`en`).

- **Testing**:
  - Always provide unit/component tests in Vitest / React Testing Library covering both **authenticated user** and **guest / anonymous** rendering states (e.g., verifying guest badge and login link render when unauthenticated).
