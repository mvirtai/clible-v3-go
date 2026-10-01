# NOTICE

Clible's application source code is licensed under the **PolyForm Noncommercial License 1.0.0** (see [`LICENSE`](./LICENSE)). The underlying Bible translation texts bundled in this repository (`xml_translations/`) are separate data sources with their own provenance and licensing terms, documented below for attribution purposes. This document lists only the translations whose source files are actually present in this repository.

## Bundled Scripture Texts

### Finnish 1992 — Kirkkoraamattu 1992 (KR92)
* **File**: `xml_translations/fin-1992.xml`
* **Canonical ID**: `fin-1992`
* **Source header**: "Copyright Kirkon keskusrahasto (Ev. Lutheran Church of Finland), 1992, 2007"
* **License**: Copyrighted by the Evangelical Lutheran Church of Finland (Kirkon keskusrahasto). Included here for personal, non-commercial study and research use in accordance with Clible's PolyForm Noncommercial license. Redistribution or commercial use of this text should be confirmed directly with the copyright holder.

### Finnish 1933/38 — Pyhä Raamattu (KR38 / Biblia 33/38)
* **File**: `xml_translations/fin-biblia-33-38.osis.xml`
* **Canonical ID**: `fin-biblia-33-38`
* **Source header**: OSIS document, "(C) 1933, 1938"; distributed via The Unbound Bible / Biola University Administrative Computing
* **License**: The 1933/1938 Finnish Bible translation is in the public domain in Finland (church-authorized translations predating the modern copyright term generally are). The OSIS encoding was distributed through The Unbound Bible project (Biola University) as a freely redistributable public-domain text.

### Finnish 1776 — Biblia (1776)
* **File**: `xml_translations/fin-1776.xml`
* **Canonical ID**: `fin-1776`
* **Source header**: `status="Public Domain"`
* **License**: Public domain.

### Greek New Testament — SBL Greek New Testament (SBLGNT)
* **Files**: `xml_translations/GreekSBLGNTBible.xml`, `xml_translations/greeksblgnt.xml` (identical content; two copies present under different filenames)
* **Canonical ID**: `sblgnt`
* **Source header**: "Greek SBLG (SBL Greek New Testament)", "2010 Logos Bible Software and the Society of Biblical Literature."
* **License**: © 2010 Society of Biblical Literature and Logos Bible Software. The SBLGNT is published under the **Creative Commons Attribution 4.0 International License (CC BY 4.0)**, with additional usage conditions published at <http://sblgnt.com/rights/> (e.g. it may not be sold on its own, and commercial distribution of 100+ verses requires attribution such as: "Scripture quotations marked SBLGNT are from *The Greek New Testament: SBL Edition*. Copyright 2010 Society of Biblical Literature and Logos Bible Software."). Users redistributing this text should consult the official rights page for the full conditions.

### Hebrew Masoretic Text — Leningrad Codex
* **File**: `xml_translations/heb-leningrad.usfx.xml`
* **Canonical ID**: `heb-leningrad`
* **Source header**: USFX format, language code `HE`; no explicit copyright/license statement is embedded in the file itself.
* **License**: Not readily determinable from the bundled file's metadata. The Leningrad Codex is a medieval manuscript generally considered to be in the public domain as a historical source text; however, this specific digital transcription/encoding does not carry an in-file license notice, so its precise redistribution terms are unconfirmed. Users should treat this text as public-domain-sourced but verify provenance independently before commercial or derivative use.

## Translations Not Bundled in This Repository

The application's translation catalog, database migrations, and alias resolver (`backend/internal/parsers/translation_aliases.go`) reference additional translation IDs — notably `web` (World English Bible) and `kjv` (King James Version) — as supported, importable catalog entries. **No XML source files for these translations are bundled in this repository's `xml_translations/` directory.** They are designed to be imported separately by an administrator via the translation import API/CLI seeding pipeline described in `docs/guide/import-and-seeding.md`, using externally supplied public-domain source files (both the WEB and the KJV are widely recognized as public domain).

## Questions

For questions about translation provenance, licensing, or removal requests, please open an issue on the [project repository](https://github.com/mvirtai/clible-v3-go) or contact the project maintainers.
