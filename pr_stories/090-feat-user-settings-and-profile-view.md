# PR Story: User Settings & Profile View (v3.6.0)

## Business Context

As Clible v3 matures from an exploratory Bible text and theological analysis sandbox into an account-enabled research environment, personalized persistence becomes paramount. Previously, user preferences such as active translation, color theme, and UI language were confined strictly to browser-local `localStorage`. If a registered user moved across devices, opened private browsing, or cleared browser data, their curated environment was lost. Furthermore, account settings and security controls (display name, verification status, password management) were scattered or lacked a dedicated management interface.

This Pull Request delivers a unified, production-ready **User Settings & Profile View** (`/settings`) supported by an end-to-end full-stack architecture:

1. **Persistent Cloud Preferences**: User display name, chosen avatar (`avatar_id`: initials or 1 of the 10 thematic biblical SVG icons), preferred UI language (`fi` / `en`), interface theme (`system` / `light` / `dark`), and default Bible translation ID (`fin-1992`, `fin-1776`, `web`, etc.) are backed by Neon PostgreSQL (`017_user_preferences.sql`) with full SQLite test-runner parity.
2. **React 19.2 Declarative Architecture**: Zero `useEffect` for state synchronization. The settings view leverages React 19 `use()` with `<Suspense>` boundaries for non-blocking resource acquisition and `useActionState` + `<form action={...}>` for profile, avatar, and password mutations.
3. **Thematic Avatar Selection**: A responsive visual avatar selector with accessible radio tiles enabling users to seamlessly toggle between monogram name initials and 10 vector SVG symbols (scroll, dove, olive branch, codex, quill, menorah, alpha-omega, flame, anchor, cornerstone) with instant live preview.
4. **Guest & Unauthenticated Fallback**: Seamless unauthenticated routing. Anonymous guests accessing `/settings` are presented with an educational CTA card inviting registration for cloud sync, avoiding phantom network queries.
5. **Security Hardening**: Authenticated password rotation endpoint with current-password `bcrypt` verification and strict password complexity enforcement.
6. **Specialized Agent Definitions**: Formally registers the Clible specialist subagent catalog under `.agents/agents/` for direct accessibility via Antigravity CLI `/agents`.

---

## Architectural & Process Flows

### 1. Declarative Settings & State Mutation Lifecycle

The sequence diagram below illustrates the declarative data flow between the React 19 frontend, the HTTP API handler, and the underlying database repository during settings retrieval and updates.

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Browser
    participant USV as UserSettingsView (React 19.2)
    participant API as ApiService (frontend/src/services/api.ts)
    participant Handler as UserSettingsHandler (Go 1.22 ServeMux)
    participant Repo as UserRepository (internal/db)
    participant DB as Neon PostgreSQL / SQLite

    User->>USV: Navigate to "/settings"
    alt Authenticated User
        USV->>API: getSettingsResource() via React 19 use()
        API->>Handler: GET /api/user/settings (Cookie Session)
        Handler->>Repo: GetSettings(ctx, userID)
        Repo->>DB: SELECT id, email, display_name, ... FROM users WHERE id = $1
        DB-->>Repo: UserSettings row
        Repo-->>Handler: *User model
        Handler-->>API: 200 OK (JSON)
        API-->>USV: Resolve Promise.all([settings, translations])
        USV-->>User: Render Profile, Preferences, and Security Cards
    else Guest / Unauthenticated
        USV-->>User: Render Guest CTA Card (Zero API Calls)
    end

    User->>USV: Submit Profile Form (Display Name, Language, Theme)
    USV->>API: updateUserSettings(payload) via useActionState
    API->>Handler: PUT /api/user/settings
    Handler->>Repo: UpdateSettings(ctx, userID, ...)
    Repo->>DB: UPDATE users SET display_name = $1, ... WHERE id = $6
    DB-->>Repo: RowsAffected = 1
    Repo-->>Handler: nil (Success)
    Handler-->>API: 200 OK (Updated UserSettings JSON)
    API-->>USV: Update form state & sync theme/lang
    USV-->>User: Visual Checkmark confirmation ("Asetukset tallennettu onnistuneesti!")
```

---

## Key Changes & Engineering Decisions

### 1. Database Schema Migration (`017_user_preferences.sql`)
- Added `display_name` (`VARCHAR(128)`), `avatar_id` (`VARCHAR(32)`), `preferred_lang` (`VARCHAR(8)`), `theme_preference` (`VARCHAR(16)`), and `default_translation_id` (`VARCHAR(64)`) to `users`.
- Created an index `idx_users_default_translation` for high-speed foreign joins against installed translation tables.
- Maintained 100% dialect compatibility between Neon PostgreSQL and in-memory SQLite (`:memory:`).

### 2. Go 1.22+ Standard Routing & Handler Implementation
- Extended `UserRepository` with `GetSettings`, `UpdateSettings`, `GetByID` (all including `avatar_id`), and `UpdatePasswordHash`.
- Implemented `UserSettingsHandler` under `internal/api/user_settings_handler.go` with strict input sanitization (validating avatar IDs: `initials` or 1 of the 10 theme SVGs), error wrapping, and context propagation.
- Integrated routes into standard `http.ServeMux` protected by `requireAuth` middleware:
  - `GET /api/user/settings`
  - `PUT /api/user/settings`
  - `PUT /api/user/password`

### 3. React 19.2 & React Compiler Compliance
- **Zero `useEffect`**: Eliminated state-synchronization effects. Initial resource loading is driven by React 19 `use(getSettingsResource())` inside a dedicated `<Suspense>` boundary.
- **`useActionState`**: Employed React 19 action states for asynchronous form submission (`settingsAction` and `pwdAction`), preserving form ergonomics and error boundaries.
- **Thematic Avatar Popover Selector**: Designed an interactive popover picker attached directly to the user avatar with a camera badge trigger, replacing bulky static cards. Includes a 350ms debounce delay and an invisible CSS hover bridge to prevent accidental closure during cursor transit. Allows users to choose between monogram initials and 10 thematic SVGs (`scroll`, `dove`, `olive`, `codex`, `quill`, `menorah`, `alpha-omega`, `flame`, `anchor`, `cornerstone`) with immediate live preview.
- **Instant UI Reactivity & AuthContext Sync**: Immediate DOM theme class switching (`dark` / `light`), language context switching (`setLang`), and live `AuthContext.updateUser` synchronization so the top workspace header avatar and menu update instantly without page reloads.
- **`SettingsErrorBoundary`**: Wrapped settings content in a localized error boundary that gracefully handles rejected promises and provides instant "Yritä uudelleen" / "Retry" recovery.

### 4. Dual-Driver DB Invariants & SQLite Test Parity
- **Neon PostgreSQL & SQLite Parity**: Enhanced `backend/internal/db/migrations.go` to transparently adapt migration `017_user_preferences.sql` for SQLite in-memory test suites while keeping idempotent `IF NOT EXISTS` columns for production Neon DB.

### 5. Bilingual Localization (`i18n.ts`)
- Added 31 localized keys to `Messages` interface (including `avatarSectionTitle`, `avatarSectionDesc`, `avatarInitialsLabel`, `changeAvatarLabel`, and `returnToApp: "Takaisin työtilaan"` / `"Back to workspace"`) and populated both Finnish (`fi`) and English (`en`) dictionaries with zero fallback omissions.

---

## Files Changed

| File | Change Type | Description |
| :--- | :---: | :--- |
| `backend/migrations/017_user_preferences.sql` | Added | Schema migration for user profile, subscriptions, avatar, and preferences |
| `backend/internal/db/migrations.go` | Modified | Adapted migration 017 for SQLite in-memory unit tests |
| `backend/internal/models/user_settings.go` | Added | DTOs for `UserSettings`, `UpdateUserSettingsInput`, and `ChangePasswordInput` |
| `backend/internal/db/user_repo.go` | Modified | Added `GetSettings`, `UpdateSettings`, `GetByID`, and `UpdatePasswordHash` |
| `backend/internal/db/user_repo_test.go` | Added | Unit test suite verifying repository CRUD and edge cases |
| `backend/internal/api/user_settings_handler.go` | Added | HTTP handler for settings retrieval, preference updates, and password rotation |
| `backend/internal/api/user_settings_handler_test.go` | Added | Comprehensive unit tests for handler endpoints with mock repos |
| `backend/main.go` | Modified | Registered `/api/user/settings` and `/api/user/password` routes |
| `frontend/src/types/user.ts` | Added | TypeScript interfaces for `UserSettings` and update payloads |
| `frontend/src/services/api.ts` | Modified | Added `getUserSettings`, `updateUserSettings`, and `updatePassword` API methods; updated `UserResponse` with `avatarId` |
| `frontend/src/context/AuthContext.tsx` | Modified | Added `displayName` and `avatarId` to `User`; exposed `updateUser` and `refreshUser` |
| `frontend/src/views/UserSettingsView.tsx` | Added | Declarative React 19.2 settings view with interactive avatar popover, hover bridge, and `SettingsErrorBoundary` |
| `frontend/src/views/UserSettingsView.test.tsx` | Added | Vitest test suite testing guest fallback, mock rendering, and avatar popover |
| `frontend/src/components/layout/UserAvatar.tsx` | Modified | Added `avatarId` support for selecting between initials and 10 thematic SVGs |
| `frontend/src/components/layout/UserAvatar.test.tsx` | Modified | Unit tests covering explicit theme avatar and initials rendering |
| `frontend/src/components/layout/UserMenuDropdown.tsx` | Modified | Passes `avatarId` and `displayName` to header avatars |
| `frontend/src/components/layout/AppHeader.tsx` | Modified | Unified `User` type from `AuthContext` |
| `frontend/src/main.tsx` | Modified | Registered `/settings` route in application router |
| `frontend/src/utils/i18n.ts` | Modified | Added bilingual message keys (including avatar and navigation strings) |
| `docs/package.json`, `docs/pnpm-lock.yaml` | Modified | Overrode PostCSS to 8.5.28 to resolve Dependabot security vulnerabilities |
| `.agents/agents/*` | Added | Specialized workspace agents (`clible-expert`, `isla-engine-specialist`, etc.) |
| `VERSION`, `frontend/package.json`, ... | Modified | Version bump to `3.6.0` |

---

## Verification & Quality Gates

### Automated Test Results

#### 1. Backend Coverage (`task backend:check`)
```text
github.com/mvirtai/clible-v3-go/internal/api/user_settings_handler.go:	GetSettings		100.0%
github.com/mvirtai/clible-v3-go/internal/api/user_settings_handler.go:	UpdateSettings		100.0%
github.com/mvirtai/clible-v3-go/internal/api/user_settings_handler.go:	UpdatePassword		94.1%
github.com/mvirtai/clible-v3-go/internal/db/user_repo.go:		GetSettings		100.0%
github.com/mvirtai/clible-v3-go/internal/db/user_repo.go:		UpdateSettings		100.0%
github.com/mvirtai/clible-v3-go/internal/db/user_repo.go:		UpdatePasswordHash	100.0%
total:									(statements)		76.5%
```

#### 2. Frontend Vitest Suite (`task frontend:check`)
```text
 Test Files  38 passed (38)
      Tests  307 passed (307)
   Duration  9.04s
All local quality checks passed flawlessly!
```

---

## Manual Verification Runbook

1. **Guest Mode Check**:
   - Open browser in incognito / log out.
   - Navigate directly to `http://localhost:5173/settings`.
   - Verify that the guest card is rendered with login/registration buttons without console errors or unauthorized API alerts.
2. **Authenticated Profile & Preferences**:
   - Log into an account.
   - Click the user avatar in the top right -> select **Asetukset**.
   - Change Display Name to a custom name, select a new Bible translation, and switch theme to `dark`.
3. **Avatar Selection**:
   - In the settings view, observe the Avatar picker grid displaying the Monogram Initials option and all 10 thematic SVGs.
   - Click one of the thematic icons (e.g. `Dove` or `Quill`) -> verify the profile preview updates immediately.
   - Click **Tallenna asetukset** -> verify success badge appears and preferences persist across reloads.
4. **Password Security**:
   - Attempt password change with an incorrect current password -> verify error message.
   - Enter valid current password and compliant new password -> verify success message.
