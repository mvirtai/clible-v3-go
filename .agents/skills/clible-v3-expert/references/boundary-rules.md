# Clible v3 Boundary Rules & Anti-Patterns

This document outlines the inviolable architectural boundaries, anti-patterns, and coding constraints enforced across the Clible codebase.

---

## 1. Backend Layer Boundary Rules (Go 1.22+)

```text
┌────────────────────────────────────────────────────────┐
│                   API Layer (internal/api/)            │
│  - Accesses: Services, Domain Models                   │
│  - FORBIDDEN: Direct SQL, DB pool (*sql.DB), Disk I/O  │
└───────────────────────────┬────────────────────────────┘
                            │ Calls methods on
                            ▼
┌────────────────────────────────────────────────────────┐
│               Service Layer (internal/services/)       │
│  - Accesses: Repositories, Parsers, Models             │
│  - FORBIDDEN: http.ResponseWriter, *http.Request       │
│  - Memory: Buffered batching (500 records per chunk)   │
└───────────────────────────┬────────────────────────────┘
                            │ Calls methods on
                            ▼
┌────────────────────────────────────────────────────────┐
│             Repository Layer (internal/db/)            │
│  - Accesses: *sql.DB, Neon PostgreSQL                  │
│  - FORBIDDEN: Services, API handlers, direct network   │
│  - Queries: Strictly parameterized ($1, $2)            │
│  - Cancellation: Always use QueryContext / ExecContext │
└────────────────────────────────────────────────────────┘
```

### Prohibited Backend Anti-Patterns

1. **Never write SQL in API handlers**: All database operations must reside in `backend/internal/db/`.
2. **Never buffer full XML/JSON documents in memory**: Always use streaming tokenizers (`xml.Decoder`) in $O(1)$ space.
3. **Never silently suppress errors**: Use explicit assignments `_ = file.Close()` in deferred calls or return errors upwards.
4. **Never hardcode secrets**: JWT keys, database URLs, and API tokens must always be read from environment variables.
5. **Never continue development without comprehensive unit tests**: Each task must include comprehensive unit / integration tests.
6. **Never continue development without comprehensive linting**: Each task must include comprehensive linting.
7. **Never continue development without comprehensive quality gates**: Each task must include comprehensive quality gates.

---

## 2. Frontend Boundary Rules (React 19.2 & TypeScript)

### Prohibited Frontend Anti-Patterns

1. **Never use `useEffect` for state synchronization**:
   - ❌ Anti-pattern: Listening to window events or URL changes via `useEffect(() => { ... }, [])`.
   - ✅ Standard: Use `useSyncExternalStore` for external events and browser history.
2. **Never duplicate state that can be derived at render time**:
   - ❌ Anti-pattern: Storing `const [count, setCount] = useState(0)` alongside `items`.
   - ✅ Standard: Derive directly `const count = items.length;`.
3. **Never reset component state with prop-change effects**:
   - ❌ Anti-pattern: `useEffect(() => { reset(); }, [id])`.
   - ✅ Standard: Pass a declarative `key={id}` to force the component to remount cleanly.
4. **Never hardcode text strings in TSX markup**:
   - ❌ Anti-pattern: `<button>Save</button>`.
   - ✅ Standard: `<button>{t("save")}</button>` using `frontend/src/i18n.ts` with both `fi` and `en` definitions.
5. **Never use `npm` or `yarn`**:
   - Always execute frontend scripts with `pnpm` (`pnpm run dev`, `pnpm test`).

---

## 3. Database Rules (Neon PostgreSQL & SQLite Test Harness)

1. **Production Parity**: All production migrations must target PostgreSQL dialect and Neon serverless capabilities.
2. **SQLite Compatibility in Tests**: Migration statements used in `:memory:` test fixtures must remain dual-compatible with SQLite where applicable (avoid PostgreSQL-only extensions in common shared queries).
3. **Context Cancellation**: Every database query must accept and propagate `ctx context.Context`. When an HTTP client disconnects, the query must be instantly aborted to conserve database compute hours.

---

## 4. Token Safety & External Scanner Execution Policy

1. **Download & Verification Only**: When installing or updating CLI tools (e.g. `govulncheck`), verify installation with `tool --version` or `which tool`.
2. **No Automatic Full Scans**: Never trigger full-repository recursive scans without explicit developer instruction, as verbose AST or symbol dumps consume massive token windows.
