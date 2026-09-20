---
name: react-compiler-audit
description: Audits and enforces React 19.2 and React Compiler architectural rules in Clible (zero useEffect for state sync, useSyncExternalStore, useActionState, pure derived state, full i18n).
---

# React 19.2 & React Compiler Audit Guide

This skill governs React components, hooks, and architectural patterns in Clible (`frontend/src/`). All frontend code must strictly adhere to the React 19.2 mental model and React Compiler optimizations.

---

## The 5 Pillars of React 19.2 in Clible

### 1. Zero `useEffect` for State Synchronization

* **Anti-Pattern**: Using `useEffect` to listen to window events, URL changes, history navigation, or external state.
* **Clible Standard**: Use `useSyncExternalStore` with clean subscribe/getSnapshot functions.
* **Rule**: Never synchronize state from props or URL with a `useEffect`.

```typescript
// ✅ Good: useSyncExternalStore for browser navigation/history
const route = useSyncExternalStore(
  (callback) => {
    window.addEventListener("popstate", callback);
    return () => window.removeEventListener("popstate", callback);
  },
  () => window.location.pathname
);
```

---

### 2. Actions & `useActionState` over Manual State Flags

* **Anti-Pattern**: Juggling `const [loading, setLoading] = useState(false)`, `const [error, setError] = useState(null)` across async handlers.
* **Clible Standard**: Use modern action hooks (`useActionState`) or `<form action={...}>`.
* Keeps state transitions predictable and compiler-optimizable without cascading re-renders.

---

### 3. Pure Derived State (No Duplicate `useState`)

* **Anti-Pattern**: Duplicating state that can be computed during render.
* **Clible Standard**: Compute values on-the-fly during render.

```typescript
// ❌ Bad: Redundant state
const [items, setItems] = useState<Item[]>([]);
const [count, setCount] = useState(0);

// ✅ Good: Derived state
const [items, setItems] = useState<Item[]>([]);
const count = items.length;
```

---

### 4. No Prop-Change Effects

* **Anti-Pattern**: `useEffect(() => { resetForm(); }, [userId])`
* **Clible Standard**: Use the `key` attribute on the component (`<UserProfile key={userId} />`) to reset state declaratively upon ID change.

---

### 5. Mandatory Internationalization (`i18n.ts`)

* **Strict Rule**: Zero hardcoded strings in JSX/TSX.
* Every user-facing label, button text, badge, tooltip, and error message must be defined in `frontend/src/utils/i18n.ts` in both Finnish (`fi`) and English (`en`).
* When adding new keys, always update both dictionaries simultaneously.

```typescript
// ❌ Bad
<button>Tallenna</button>

// ✅ Good
<button>{t("save")}</button>
```

---

## Verification Checklist

Before approving or finishing frontend components:
- [ ] No `useEffect` used for state synchronization.
- [ ] No redundant `useState` flags for values computable at render time.
- [ ] No hardcoded text in JSX; all strings sourced from `t(...)` in `i18n.ts`.
- [ ] Responsive styling uses Tailwind v4 design tokens from `index.css`.
- [ ] Component passes Vitest tests (`task frontend:check`).
