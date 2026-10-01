# Pull Request Story: 104 – Correct License Reference and Add NOTICE.md Attribution

## Overview & Business Context

A pre-release documentation audit surfaced a factual error in the project's public-facing terms: `docs/guide/terms-and-privacy.md` stated Clible is "developed as an open-source research initiative under the **GPL-3.0 License**," while the repository's actual, authoritative `LICENSE` file is **PolyForm Noncommercial 1.0.0** — a license that permits free noncommercial use but reserves all commercial rights to the project owner. Left uncorrected, this mismatch would have misrepresented the project's legal terms to end users and contributors right before release.

Separately, both `README.md` and `terms-and-privacy.md` pointed readers to a `NOTICE.md` file for Bible translation data attribution, but that file did not exist in the repository, leaving a dangling reference and no documented provenance for the bundled Scripture texts.

This PR fixes the license mismatch, introduces the missing `NOTICE.md` with verified per-translation attribution, and folds in three small, already-reviewed housekeeping changes that were pending in the working tree (a skill frontmatter cleanup, a markdown-escaping hardening fix, and a new GitHub App automation config).

---

## Architectural & System Changes

### 1. License Correction (`docs/guide/terms-and-privacy.md`)

- Rewrote "§7. Open Source & Community Governance" to describe **PolyForm Noncommercial License 1.0.0** instead of the incorrect GPL-3.0 claim, linking directly to the repository's `LICENSE` file.
- Preserved the section's existing heading, structure, and tone — only the inaccurate license name and framing sentence were replaced.

### 2. Translation Data Attribution (`NOTICE.md`, new)

- Enumerated only the Bible translation source files actually present in `xml_translations/`, cross-checked against `backend/internal/parsers/translation_aliases.go` for canonical translation IDs:
  - **Finnish 1992 (KR92)** — `fin-1992.xml`, © Kirkon keskusrahasto (Ev. Lutheran Church of Finland), noncommercial study use per source header.
  - **Finnish 1933/38 (KR38)** — `fin-biblia-33-38.osis.xml`, OSIS format distributed via The Unbound Bible / Biola University, understood to be public domain.
  - **Finnish 1776 (Biblia)** — `fin-1776.xml`, explicitly marked `status="Public Domain"` in its source header.
  - **SBLGNT (Greek New Testament)** — `GreekSBLGNTBible.xml` / `greeksblgnt.xml` (identical content, confirmed via checksum), © 2010 SBL/Logos Bible Software, licensed CC BY 4.0 with additional commercial-use conditions documented at sblgnt.com/rights.
  - **Hebrew Leningrad Codex (MT)** — `heb-leningrad.usfx.xml`; no in-file copyright/license statement was found, so the note honestly flags the license as unconfirmed rather than guessing.
- Added a clarifying note that `web` (World English Bible) and `kjv` (King James Version) appear as supported catalog IDs in the alias resolver, database migrations, and seeding docs, but have **no bundled XML source file** in this repository — they are designed to be imported separately by an administrator.

### 3. Included Housekeeping Fixes (pre-reviewed, pending local changes)

- **`.github/skills/code-review/SKILL.md`**: added a blank line after the frontmatter opening delimiter and removed a trailing period from the skill description for formatting consistency.
- **`frontend/src/utils/markdown.ts`**: hardened `formatResultToMarkdown`'s translation-comparison table-cell escaping to escape literal backslashes *before* escaping pipe characters, preventing malformed Markdown tables when verse text contains backslashes.
- **`.github/github-app.yml`** (new): configures the GitHub App to run `task dev` on session creation and enables `auto_issue_session`, with `remote_control` left disabled.

---

## Files Changed

| File | Changes |
| :--- | :--- |
| `docs/guide/terms-and-privacy.md` | Corrected §7 to describe PolyForm Noncommercial 1.0.0 instead of GPL-3.0 |
| `NOTICE.md` | New file documenting attribution/license status for all bundled Bible translation data |
| `.github/skills/code-review/SKILL.md` | Frontmatter formatting cleanup (blank line, trailing period removed) |
| `frontend/src/utils/markdown.ts` | Escape backslashes before pipe-escaping in comparison table cells |
| `.github/github-app.yml` | New GitHub App automation config: `task dev` on session create, auto issue sessions enabled |

---

## Testing Strategy & Metrics

### Automated Frontend Tests

Ran the existing unit suite covering `formatResultToMarkdown` after the escaping change — all passing, confirming the fix doesn't regress existing comparison-table formatting behavior:

```text
RUN  v4.1.11 frontend
 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  1.34s
```

### Type Safety

`npx tsc --noEmit` run against the frontend project after the `markdown.ts` change completed with zero errors.

### Manual / Documentation Review

- Confirmed `LICENSE` file content (PolyForm Noncommercial 1.0.0) matches the new terms-and-privacy.md wording.
- Verified each `NOTICE.md` entry against the actual byte content of its corresponding file in `xml_translations/`, rather than relying on assumptions, and explicitly flagged the one case (Hebrew Leningrad Codex) where license provenance could not be confirmed from the bundled file.
