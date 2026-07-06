# Pull Request Story: User Translation Isolation & Multi-Language Presets

## Business Context & Goal

Previously, all installed Bible translations were shared globally among all users. While this worked for a simple setup, it led to database bloat and did not align with the original vision where users have their own personal library of translations.

To achieve this:

1. Only the **World English Bible (`web`)** remains a globally accessible, fixed translation that is available to everyone without authentication.
2. All other translations (such as Finnish presets or custom uploaded XMLs) are **user-isolated**. When a user installs a preset or imports a custom translation, a link is created in the database to map that translation to their account.
3. Added original biblical language presets—**SBL Greek New Testament (`sblgnt`)** and **Hebrew Leningrad Codex (`heb-leningrad`)**—to the frontend user interface.

---

## Architectural Changes

### 1. Database Schema

* **[009_user_translations.sql](file:///home/vivaldev/code/clible-v3-go/backend/migrations/009_user_translations.sql)**: Created a new join table `user_translations` linking `users(id)` and `translations(id)` with cascade deletion and optimized indices.

### 2. Repository Layer (PostgreSQL)

* **[translation_repo.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/translation_repo.go)**:
  * Implemented `GetByUser(ctx, userID)` to fetch all translations mapped to the user plus the global `web` translation.
  * Implemented `LinkUser(ctx, userID, translationID)` to link a translation to a user.
  * Implemented `IsAccessible(ctx, userID, translationID)` to check if a translation is accessible to a given user.

### 3. Services Layer

* **[ctxkeys.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/ctxkeys/ctxkeys.go)**: Created a new, dependency-free leaf package `ctxkeys` containing the `UserIDKey` context key and `GetUserID(ctx)` helper. This successfully broke a circular import cycle between the `services` and `middleware` packages.
* **[auth_middleware.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/middleware/auth_middleware.go)**: Re-routed authentication context setting to use `ctxkeys` internally. Defined a backward-compatible constant `UserIDKey = ctxkeys.UserIDKey` to keep existing API tests intact.
* **[verse_service.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/verse_service.go)**:
  * Restructured `GetVerses` and `SearchVerses` to enforce user accessibility checks via `translationRepo.IsAccessible`. Unauthenticated requests are restricted to the global `web` translation.
  * Updated fallback translation selection to choose the first user-associated translation instead of `fin-1992`.

### 4. API Layer

* **[main.go](file:///home/vivaldev/code/clible-v3-go/backend/main.go)**: Protected `GET /api/translations` with the `RequireAuth` middleware to ensure translations are returned based on the user session. Protected `/api/verses` and `/api/search` with the authentication middleware to propagate the `userID` context to the service layers.
* **[translation_handler.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/translation_handler.go)**:
  * Restructured `GetTranslations` to use the authenticated `userID` to filter results using `GetByUser`.
  * Restructured `ImportTranslation` to fetch `userID` from the request context and link the imported translation using `LinkUser`.

### 5. Frontend UI

* **[TranslationManager.tsx](file:///home/vivaldev/code/clible-v3-go/frontend/src/components/TranslationManager.tsx)**: Added two new preset configurations under `PRESET_TRANSLATIONS` to allow installing:
  * **SBL Greek New Testament** (`sblgnt`)
  * **Hebrew Leningrad Codex** (`heb-leningrad`)

### 6. Dev Tools & Workflow

* **[Taskfile.yml](file:///home/vivaldev/code/clible-v3-go/Taskfile.yml)**:
  * Added `git:new-branch` task with a POSIX-compliant shell precondition check to dynamically spin up new branch patterns following the conventions in `AGENTS.md`.
  * Added `git:commit-all` task to execute sequential commit scripts defined in `.git-commits.sh` and clean up the script upon successful commit.
* **[.plans/10-git-commit-all-workflow.md](file:///home/vivaldev/code/clible-v3-go/.plans/10-git-commit-all-workflow.md)**: Created a detailed implementation plan describing the automated git commit-all workflow.

---

## Testing & Verification Strategy

### Automated Tests

* **[translation_repo_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/db/translation_repo_test.go)**: Added `TestTranslationRepository_UserMapping` to verify user mappings, link creation, and visibility of the `web` preset.
* **[verse_service_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/services/verse_service_test.go)**: Refactored existing unit tests to utilize the globally accessible `web` translation to bypass authentication requirements in low-level service tests.
* **[translation_handler_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/translation_handler_test.go)** & **[analytics_handler_test.go](file:///home/vivaldev/code/clible-v3-go/backend/internal/api/analytics_handler_test.go)**: Injected `test-user-id` context and seeded the user mock record to prevent authorization or foreign key constraint failures.
