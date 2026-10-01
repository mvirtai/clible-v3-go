# Pull Request Story: 105 – Sync Version Strings to 3.12.0

## Overview & Business Context

A pre-release audit of the repository found that the latest git tag, `v3.12.0`, had drifted out of sync with the version strings baked into the application itself. `VERSION`, the backend's `Version` constant, and the frontend's `package.json` and build-fallback constant still read `3.11.3` — the previous release. Left uncorrected, this would cause the running application (both the `/version` API response and the frontend's build-time `__APP_VERSION__` fallback) to self-report the wrong release number, undermining the reliability of version-based bug reports, support diagnostics, and release auditing immediately after the `v3.12.0` tag ships.

This is a narrow, mechanical consistency fix with no behavioral or architectural change — four literal string replacements bringing the repository's self-reported identity in line with its actual tag.

## Changes

- `VERSION`: `3.11.3` → `3.12.0`
- `backend/internal/version/version.go`: `Version` constant `3.11.3` → `3.12.0`
- `frontend/package.json`: `"version"` field `3.11.3` → `3.12.0`
- `frontend/src/utils/version.ts`: `APP_VERSION` fallback literal (used when Vite's `__APP_VERSION__` define is unavailable, e.g. in unit tests or non-Vite tooling) `3.11.3` → `3.12.0`

### Intentionally left untouched

A repository-wide search for `3.11.3` also surfaced two references that correctly describe past state rather than the current version, so they were left as-is:

- `pr_stories/103-ui-improve-notebook-canvas-scrolling-and-liturgical-hymn-links.md` — a historical PR story documenting the prior `3.11.2` → `3.11.3` bump.
- `.github/release-v3.12.0.md` — the heading `## 📦 Recent Features (v3.10.0–v3.11.3)` is a cumulative range label summarizing features shipped across several prior releases, not a current-version claim.

`CHANGELOG.md` contained no `3.11.3` occurrences at all.

## Files Changed

| File | Changes |
| :--- | :--- |
| `VERSION` | Bump version from 3.11.3 to 3.12.0 |
| `backend/internal/version/version.go` | Bump backend `Version` constant to 3.12.0 |
| `frontend/package.json` | Bump frontend package version to 3.12.0 |
| `frontend/src/utils/version.ts` | Bump `APP_VERSION` fallback constant to 3.12.0 |

## Testing Strategy & Metrics

### Verification

- Re-ran a repository-wide `grep -rn "3.11.3"` (excluding `node_modules/` and `.git/`) after the edits; only the two historical/range references noted above remain, confirming no other live version string was missed.
- No automated test suite exercises these literal version strings directly; this is a pure string-consistency fix with no logic change, so no diagrams or additional test runs were warranted.
