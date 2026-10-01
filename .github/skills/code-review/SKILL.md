 ---
name: code-review
description: >-
  Performs context-aware architectural, security, and quality code reviews for Clible v3,
  verifying Go 1.22+ backend standards, React 19.2 & React Compiler rules, Neon PG/SQLite
  compatibility, and full bilingual i18n compliance.
---

# Clible v3 Code Review & Architecture Audit Skill

This skill guides the agent in conducting rigorous, context-aware code reviews tailored specifically to the Clible v3 codebase.

---

## 1. Project Context & Architectural Boundaries

Review every Pull Request and changeset against Clible's core architectural constraints:

### Backend (Go 1.22+)

- **Routing**: Strictly standard library `http.ServeMux` with method-prefixed patterns (e.g. `GET /api/verses`). External routing frameworks are forbidden.
- **Layer Boundaries**:
  - `internal/api/`: Handles HTTP, requests, responses, O(1) streaming pass-through. Forbidden: direct SQL, repositories, local filesystem.
  - `internal/services/`: Business logic and orchestration. Forbidden: `http.ResponseWriter`, `*http.Request`.
  - `internal/db/`: SQL repository layer with parameterized queries (`$1, $2`) and context termination (`QueryContext`, `ExecContext`). Forbidden: HTTP handlers, business services.
  - `internal/parsers/`: Consumes `io.Reader` using O(1) token streaming (`xml.Decoder`). Forbidden: DB access, memory-buffering entire DOM trees.
- **Dual-Driver Database**: All production queries target **Neon PostgreSQL**, but must maintain compatibility with in-memory **SQLite** (`:memory:`) used in unit tests.
- **Error Handling**: Zero tolerance for silent error suppression or unhandled errors (`_ = file.Close()` in defers).

### Frontend (React 19.2 + TypeScript + TailwindCSS v4)

- **Zero `useEffect` for State Sync**: URL/browser history must use `useSyncExternalStore`. Do not sync or reset component state via `useEffect`.
- **Form Actions & Async State**: Use `useActionState` and form actions instead of manual `useState` flags (`loading`, `saving`, `error`).
- **Pure Derived State**: Compute state during render. Never duplicate state that can be derived from props or existing state.
- **No `useRef` as State Hack**: Data flow must remain unidirectional and declarative.
- **Mandatory i18n**: No hardcoded text in TSX/JSX. All user-facing strings must exist in `frontend/src/i18n.ts` in both Finnish (`fi`) and English (`en`).
- **Package Manager**: Strictly `pnpm`. `npm` and `yarn` are prohibited.

---

## 2. Review Checklist

When reviewing code, systematically verify:

1. **Quality Gates & Tests**:
   - Does backend code include unit tests (`task backend:check`)?
   - Do React components include Vitest tests covering authenticated and guest states?
2. **Security**:
   - Are all database queries parameterized against SQL injection?
   - Are secrets or keys loaded strictly from environment variables?
   - Are file uploads and parser inputs streamed with size limits to prevent DoS?
3. **Performance & Memory**:
   - Are allocations minimized?
   - Are slices pre-allocated and `strings.Builder` used for concatenations?
4. **Git & Release Conventions**:
   - Commit messages follow Conventional Commits (`type: lowercase description`).
   - Relevant documentation in `pr_stories/` or `docs/` is updated if necessary.

---

## 3. Review Feedback Format

Structure all review comments with clarity and precision:

- 🔴 **[BLOCKER]**: Violations of layer boundaries, SQL injection risks, broken tests, missing error handling, or forbidden `useEffect` state synchronization. Must be fixed before merge.
- 🟠 **[WARNING]**: Sub-optimal performance, missing i18n keys in either Finnish or English, or missing test cases for edge conditions.
- 🟡 **[SUGGESTION]**: Idiomatic refinements, naming suggestions, or minor styling improvements.

When proposing fixes, always provide precise GitHub suggestion blocks:

```suggestion
// Refactored implementation complying with layer boundaries
```
