# Docs: Update VitePress Site and Resolve ESLint Errors

## Business Context

As clible-v3-go evolves with new core capabilities—including JWT-based user authentication, workspace-linked Notebooks & Cells, and intelligent Gemini AI integrations—its technical documentation must stay synchronized. 

This pull request updates the official VitePress site to document all newly added modules, updates the database ERD, maps out the new REST endpoints, and resolves critical ESLint errors in the frontend.

---

## Architectural & Documentation Changes

### VitePress Documentation Site (`docs/`)

#### `.vitepress/config.ts` [MODIFY]

* Added a link to the new `Notebooks & cells` guide in the sidebar menu under the `/guide/` path.

#### `index.md` [MODIFY]

* Integrated `Notebooks & cells` and `Gemini AI integrations` cards in the home page features catalog.
* Added a reference link to the new Notebooks guide inside the documentation map.

#### `guide/notebooks.md` [NEW]

* Created a comprehensive guide explaining the Clible Notebooks feature (Markdown and Code cell types, position-based reordering logic, composite unique constraints, Scope mapping, and user-level security boundaries).

#### `architecture/overview.md` [MODIFY]

* Updated the high-level architecture text and Mermaid diagram to show where user session middleware, the Notebooks service, and the external Gemini AI API integrate.

#### `architecture/database.md` [MODIFY]

* Updated the Mermaid ERD to map the `users`, `user_translations`, `notebooks`, and `notebook_cells` tables.
* Added detailed column schemas for the new tables and updated `scopes`, `search_history`, and `translations` descriptions to include the newly added columns (`user_id`, `is_global`).

#### `api/reference.md` [MODIFY]

* Added references for the new Scopes endpoints (`PUT /api/scopes`, `DELETE/PUT /api/scopes/saved-searches`, and `DELETE/PUT /api/scopes/saved-analyses`).
* Fully documented the new **Notebooks API** and **Gemini AI API** endpoints (including request/response structures, rate limits, and service unavailable fallback states).

---

## Code Quality & Linter Fixes

#### `frontend/docs/.vitepress/theme/index.ts` [MODIFY]

* Added `eslint-disable-next-line @typescript-eslint/no-unused-vars` to suppress unused parameter errors in the `enhanceApp` function.

#### `frontend/src/components/notebook/types.ts` [MODIFY]

* Replaced explicit `any` with `unknown` on the `data` field of the `CellResult` interface to comply with the `@typescript-eslint/no-explicit-any` rule.

---

## Verification & Build Strategy

* **VitePress Build**: Verified that the documentation site compiles successfully without errors using `pnpm --filter clible-v3-docs run docs:build`.
