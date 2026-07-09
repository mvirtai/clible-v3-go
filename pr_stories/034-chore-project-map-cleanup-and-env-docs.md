# PR Story: Project Map Cleanup, Environment Variables & Verse Saving to Workspaces

This PR performs a project-wide housekeep and cleanup, updating the primary project development roadmap to mark completed features from Paths A, B, and C as done, introduces configuration templates to standardize local environment configurations, and adds a highly requested feature enabling users to save their verse passage views (jaehaku) directly to workspaces.

---

## Business Context

As the core application features (Bible Reader engines, Lexical Analytics Views, and Workspace Management / Scoping with serialized database caching) have been fully implemented and verified, the main project map (`00_projektikartta.md`) needed to be brought up to date to reflect the current state of completion. 

Additionally, new developers joining the codebase require a clear template of the expected runtime environment parameters (such as `JWT_SECRET` and target databases) to bootstrap local environments seamlessly.

Lastly, while full-text search queries could be saved to workspaces, users lacked the ability to save specific verse passages (e.g. "John 3:16" or "Romans 8:1-10") from the reader mode into their study project workspaces. This PR bridges that gap.

---

## Architectural Changes

### Project Settings & Setup Templates

#### `.env.example` [NEW]

- Created a new [`.env.example`](file:///home/vivaldev/code/clible-v3-go/.env.example) configuration template in the workspace root.
- Documents the required environment parameters:
  - `PORT`: Servicing port for the HTTP REST API.
  - `ENV`: Mode configuration (`development` vs `production`).
  - `DATABASE_URL`: Connection string for PostgreSQL (Neon) or SQLite path.
  - `FRONTEND_DIR`: Output path for built SPA assets.
  - `JWT_SECRET`: Signing token key for JWT authentication (minimum 32 bytes).

### Workspace & Reference Saving (Jaehaku)

#### `VerseReader.tsx` [MODIFY]

- Passed `activeScopeId` and `onWorkspaceUpdated` callbacks down to the component.
- Implemented a "Tallenna jaehaku" (Save reference search) control panel that shows up when a workspace is active and verses are loaded.
- Calls `apiService.saveSearch` with the special `searchScope` set to `"reference"` and serializes the fetched verses to the cached `result_json` field.

#### `App.tsx` [MODIFY]

- Passed active workspace parameters down to `<VerseReader />`.
- Updated `handleLoadSavedSearch` to recognize the special `"reference"` type. When loaded, it automatically switches translation and reference context, loading the saved passage back into the reader view instantly.

### Documentation & Roadmaps

#### `README.md` [MODIFY]

- Updated the technical stack and architectural descriptions to correctly target Neon PostgreSQL as the primary database instead of SQLite.
- Documented SQLite's new role exclusively as an in-memory test fallback helper.
- Added references to the new workspace reference-saving features (jaehaku).

#### VitePress Documentation (`docs/`) [MODIFY]

- **`index.md` & `guide/getting-started.md`**: Updated tagline, layout tree (fixing `main.go` location), and environment variable tables to align with `.env.example`.
- **`architecture/overview.md` & `architecture/database.md`**: Rewrote database architecture docs to establish Neon PostgreSQL as the primary production engine and SQLite strictly as a local test fallback. Documented GIN full-text index structures in PostgreSQL and FTS5 in SQLite.
- **`guide/import-and-seeding.md`**: Adjusted descriptions of streaming parser and bulk insertion to cover PostgreSQL network optimization alongside SQLite.
- **`api/reference.md`**: Added documentation for registration and login APIs, book metadata endpoints (`GET /api/books`), and updated payload structures to document `resultJson` cache fields in saved searches and analyses.

#### `00_projektikartta.md` [MODIFY]

- Checked off all completed backend endpoints, services, repositories, and database schemas.
- Marked frontend features (routing, analytics, comparison, workspace management) as completed.
- Updated infrastructure, deployment, and backup sections to match current production status.

---

## Verification & Testing

### Verification Checklist

- [x] Verified that [`.env.example`](file:///home/vivaldev/code/clible-v3-go/.env.example) matches the configuration load schema inside [`config.go`](file:///home/vivaldev/code/clible-v3-go/backend/internal/config/config.go).
- [x] Checked that saving a verse reference passage (e.g. "John 3:16") creates a saved search database entry with `searchScope = 'reference'`.
- [x] Verified that clicking a saved reference item in the Sidebar correctly loads the scripture context back into the reader view.
- [x] Ran markdown link checks and lint checks.
