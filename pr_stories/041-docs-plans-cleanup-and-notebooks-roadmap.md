# PR Story: Organize Plans and Establish Clible Notebooks Roadmap

## Business Context

As the Clible-v3-go platform has evolved through multiple iterations (infrastructure setup, reading engine, analytics, workspace scopes, and Gemini AI integration), the root of the `.plans/` directory accumulated 31 active planning documents. To keep the workspace clean, maintainable, and structured for developers, this change reorganizes the plans directory into topic-specific subdirectories. 

Furthermore, this PR introduces the long-term conceptual planning and step-by-step roadmap for **Clible Notebooks & Study Paths**—a Jupyter-style interactive study workbook integrating Markdown notes, CLI command cells (`/read`, `/search`, `/compare`, `/analyze`), and theological knowledge graphs (`/graph <entity>`).

---

## Changes

This is a documentation-only and architectural-planning release. No source code was modified.

### Folder Reorganization (`.plans/` Structure)

Active planning documents were grouped into five new topic subdirectories:

1. **`01-perusta-ja-infra/`**: Infrastructure, database basics, Docker, GCP Cloud Run, WIF, Terraform, and authentication setup.
2. **`02-luku-ja-haku/`**: Reading engine core, Bible search filters, XML parsers (including Biblia), and UI transitions.
3. **`03-analytiikka-ja-tyotilat/`**: Analytics view, parallel comparison tables, and workspace scope caching.
4. **`04-gemini-ai/`**: Gemini API services, token usage metadata rendering, rate limiting, and AI security guides.
5. **`05-notebooks-and-study-paths/`** [NEW]: Roadmap and 4 technical phase guides for the upcoming Clible Notebooks feature.

### Project Roadmap Update

* **`00_projektikartta.md`**: Updated to reflect the new directory structure and add the new "11. Clible Notebooks & Study Paths" section under long-term tracks.

### Clible Notebooks Blueprint (`.plans/05-notebooks-and-study-paths/`)

* **`00-notebooks-roadmap.md`**: High-level execution phases (Phases 1-4) from database models to collaborative editing.
* **`01-notebooks-database-and-backend.md`**: SQL schema for PostgreSQL (`notebooks`, `notebook_cells`), Go structures, and backend service interfaces.
* **`02-notebooks-frontend-and-cells.md`**: React layout for cells, markdown previewing (`ReactMarkdown`), raw text editing, and automatic background saving (debouncing).
* **`03-notebooks-cli-interpreter.md`**: Argument parsing parser in Go, CLI execution pipeline, and code cell auto-completion.
* **`04-notebooks-visualisations-and-graphs.md`**: Schema for theological entity graphs (`entities`, `entity_relations`), D3-force network layouts for `/graph`, and cloneable templates (Study Paths).

---

## Verification Plan

### Manual Verification
* Verified that all moved markdown files are accessible in their target subdirectories.
* Checked that [00_projektikartta.md](file:///home/vivaldev/code/clible-v3-go/.plans/00_projektikartta.md) references the new subdirectory locations correctly.
* Confirmed that git history is preserved (files were moved using `git mv` command).
