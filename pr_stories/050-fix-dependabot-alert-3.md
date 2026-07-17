# PR Story: Fix Dependabot Alert 3 (Vite CVE-2026-53571)

## Business Context

Security and compliance are core tenets of the `clible-v3-go` platform. Dependabot Alert #3 highlighted a high-severity vulnerability (CVE-2026-53571 / GHSA-fx2h-pf6j-xcff) in our documentation site's dev tooling server (`vite`), which could potentially allow unauthorized directory/file traversal and information disclosure on Windows host environments.

This PR addresses and remediates the warning by aligning dependency versions and upgrading our dev dependencies to secure, patched releases.

---

## Technical Remediation

### 1. Upgrade VitePress in Documentation Module
* Upgraded `vitepress` from `^1.6.4` to `2.0.0-alpha.18` in `docs/package.json` to match the exact version used in the `frontend` application.
* This major/minor version bump upgrades VitePress's transitive dependency `vite` from `5.4.21` (vulnerable to the path traversal vulnerability) to `8.1.5` (fully patched).
* Verified that `pnpm install` resolved the tree cleanly and updated the lockfile `docs/pnpm-lock.yaml`.

### 2. General Dev Dependencies
* Aligned the dev environment with Vite 8.1.5, resolving all associated CVEs in development tooling.

---

## Security & Compliance (`SECOPS-2026-07-17-002`)

* **CVE-2026-53571 / GHSA-fx2h-pf6j-xcff:** The vulnerability is fully patched by upgrading Vite to `>= 8.0.16` (specifically version `8.1.5` has been locked).
* **Audit Verification:** Running `pnpm audit` in both `frontend/` and `docs/` workspace folders now returns `No known vulnerabilities found`.

---

## Testing Strategy

### Verification
* Verified that the documentation site compiles without warnings or errors:
  ```bash
  pnpm run docs:build
  ```
* Ran the global quality gate tests to ensure zero regressions:
  ```bash
  task check
  ```
