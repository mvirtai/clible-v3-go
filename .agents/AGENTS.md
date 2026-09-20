# Custom Agent Rules & Guidelines (AGENTS.md)

This document provides a comprehensive, unified collection of all operational conventions, communication protocols, architectural standards, and development workflows established across the Clible codebase and `.agents/` environment.

---

## 1. Communication & Document Language Policy

* **Finnish (Suomi)**:
  * Used for all direct conversational chat interactions between the AI agent and the developer.
  * Used for all internal plan and instruction documents created under the `.plans/` directory (e.g., `.plans/08-uusi-ominaisuus.md`).
  * Used for step-by-step mentoring guides, tutorial walkthroughs, and architectural explanations directed to the developer.

* **English**:
  * Used for all source code (Go, TypeScript, React, SQL migrations, scripts).
  * Used for all commit messages, branch names, configuration files, and code comments.
  * Used for all Pull Request stories located in `pr_stories/`.
  * All English content must maintain senior-level software engineering terminology without superficial embellishments.

* **Markdown Formatting Quality (MD032 & Lint Compliance)**:
  * All markdown documents (`.plans/`, `pr_stories/`, `.security_audits/`, rules, and reviews) must strictly adhere to standard markdownlint rules.
  * Always place proper blank lines before and after lists (MD032), headings, code blocks, and blockquotes.
  * Ensure all markdown links use valid paths without broken syntax.

* **Instruction Documents (`.plans/`) & Plan Template**:
  * All step-by-step guides, design plans, tutorials, and variable references prepared for the developer must be written as markdown files inside `.plans/` rather than dumping verbose code blocks directly in chat.
  * Plans should follow the standardized template at `.plans/templates/PLAN_TEMPLATE.md` to ensure structural uniformity.
  * This provides a persistent reference that the developer can consult during coding.

* **Internal Documentation vs. Commits**:
  * Files in `.plans/`, `.visions/`, and local notes are strictly internal developer references and **MUST NEVER** be committed or included in `task git:commit FILES="..."`.
  * The documentation files committed to git are Pull Request stories (`pr_stories/`), VitePress documentation (`docs/`), and verified security audits (`.security_audits/`).

* **Task Management with Markdown Kanban**:
  * All tasks, sprint backlogs, and roadmap tracking are managed using the VS Code **Markdown Kanban** format (`.plans/TODOS.md`, `kanban/*.md`).
  * Before adding, modifying, or completing tasks, always search for existing boards and maintain the Markdown Kanban schema (`# Title`, `## Column`, `### Task`, indented metadata `due`, `tags`, `priority`, `workload`, `steps`, and description code fence).

---

## 2. Pair Programming & Mentoring Model

* **Developer Writes Code & Code Ownership (Feature Implementations)**:
  * By default, the developer writes the code directly from the design plan (`.plans/`) to learn the architecture and maintain the flow and joy of coding.
  * The agent does **NOT** write, autocomplete, or generate new feature source code files ahead of the developer.

* **Agent Scoped Bugfixing & Debugging ("Explain and fix with AI")**:
  * When the developer asks for help or uses IDE shortcuts like *"Explain and fix with AI"*, the agent fixes the relevant errors, typos, missing type definitions, and inadvertent mistakes.
  * **WIP Boundary Rule (Preserve Developer Work-in-Progress)**: The agent MUST leave the file's editing state at the **exact same position** where it was when assistance was requested. The agent must NEVER jump ahead by implementing the rest of the file or generating unwritten sections for the developer.
  * **Explicit Full-File Exception**: The rest of the file may only be written if the developer explicitly and unambiguously instructs: *"write the whole file to completion"* (or equivalent).

* **Step-by-Step Mentoring & Finnish Tutorials**:
  * For new features, the agent's role is to act as an architectural mentor: explain design patterns, draft plans, and create detailed step-by-step tutorial documents under `.plans/` in Finnish (with English code snippets and comments).
  * The developer uses these instructions to write code, learn the architecture, and follow along.

* **Session Progress & Status Briefing Protocol**:
  * Whenever the agent completes an edit, debugging step, or verification run, it must provide a structured 4-point briefing:
    1. **What Changed / Resolved**: Specific files modified, key diffs, and exact line references.
    2. **Quality Gates Status**: Results of executed checks (`task check`, `task backend:check`, or `task frontend:check`).
    3. **Version Bump Reminder**: Proactively assess if milestone changes warrant a semantic version bump (`task version:bump PART=patch|minor`).
    4. **Next Recommended Action**: The immediate next command or coding step for the developer.

* **Educational Approach**:
  * Emphasize *why* specific patterns, interfaces, or idioms are chosen and how they fit into the overall application architecture.

* **Developer WIP Isolation & Quality Gates Protocol**:
  * `task check` may occasionally fail not because of the agent's changes, but because the developer is concurrently writing or editing other files elsewhere in the codebase (e.g. unfinished components, missing imports, or syntax in progress).
  * When this happens, the agent **MUST NOT** delete, rewrite, or attempt to finish the developer's work in those external files.
  * Instead, the agent must:
    1. Focus strictly on verifying its own assigned scope (e.g. running scoped commands such as `task backend:check`, targeted Vitest runs for specific files, or specific lint checks for only modified files).
    2. Clearly notify the developer about the external error in the status briefing, explaining that the global `task check` failed due to the developer's concurrent WIP in other files, while the agent's own assigned modifications passed their scoped checks.

* **Strict Dependency & Binary Execution Policy (Token Safety & User Delegation)**:
  * **No Automatic Practical Execution of Downloaded Tools**: When downloading, installing, or updating any new software, binary, CLI tool, or external dependency (e.g. `govulncheck`, compiler toolchains, linters, or heavy packages), the agent **MUST NEVER** execute the downloaded tool in full on the codebase automatically.
  * **Version & Path Verification Only**: The agent is ONLY permitted to verify that the installation succeeded by running non-destructive version or location checks (e.g. `tool --version` or `which tool`).
  * **Delegation to Developer**: Once the version is verified, the agent **MUST STOP and notify the developer**: report that the binary is installed and verified, but explicitly state that it has **NOT been run in practice**, leaving practical execution and testing to the developer.
  * **Sensitivity & Permission for High-Token Operations**: The agent must be highly sensitive and proactive in asking for the developer's explicit permission before executing commands that risk producing massive outputs, verbose scanning dumps, or consuming large amounts of tokens (e.g. full recursive vulnerability scans, unpaged log dumps, or full dependency AST traversals).

---

## 3. Git Workflow, Branching & Taskfile Automation

* **Branch Naming Conventions**:
  * Topic branches must always be named strictly in lowercase: `<type>/<kebab-case-description>`.
  * Allowed types: `feat`, `fix`, `ci`, `docs`, `ui`, `refactor`, `chore`, `test`, `perf`.
  * Uppercase characters, underscores, and spaces in branch prefixes (e.g., `Feat/` or `feat_something`) are strictly forbidden.
  * *Examples:* `feat/light-dark-mode`, `fix/sqlite-fuse-error`, `ci/add-github-actions`.

* **PR Titles & Commit Messages (Conventional Commits)**:
  * Follow Conventional Commits format: `<type>: <lowercase description in English>`.
  * The type prefix must be lowercase (e.g., `feat:`, `fix:`).
  * The description must begin with a lowercase letter and have no trailing dot.
  * *Examples:* `feat: add light-dark mode switch and transitions`, `fix: resolve sqlite lock error`.

* **Modern Git Commands**:
  * Always use modern Git commands:
    * Use `git switch -c <branch>` instead of `git checkout -b`.
    * Use `git restore <file>` instead of `git checkout <file>`.

* **Taskfile Automation Commands**:
  * `task check`: Runs full project verification (backend tests, linter, frontend tests, and types).
  * `task backend:check`: Runs Go module tidy, linter, unit tests, and coverage reporting.
  * `task frontend:check`: Runs frontend type checking, ESLint, and Vitest suite.
  * `task version`: Prints current project version from `VERSION`.
  * `task version:bump PART=patch|minor|major`: Automatically updates `VERSION`, `frontend/package.json`, `frontend/src/utils/version.ts`, and `backend/internal/version/version.go`.
  * `task version:set VER=x.y.z`: Sets explicit version in all relevant project files.
  * `task git:stage-commit-push MESSAGE="..."`: Automated staging, committing, and pushing.
  * `task git:commit TYPE=... SCOPE=... MSG="..." FILES="..."`: Task-based selective commit command.
  * `task git:pr FILE=<file.md> TITLE="..."`: Automated quality gate check, pushing branch, and opening PR via GitHub CLI.
  * `task git:merge`: Developer-driven squash & merge.
  * `task git:post-merge-branch`: Cleans local branch, resets `main` against `origin/main`, and removes obsolete topic branch.

* **Semantic Versioning & Mandatory Agent Version Bump Reminders**:
  * The project strictly follows Semantic Versioning (`MAJOR.MINOR.PATCH`):
    * `patch`: Bugfixes, hotfixes, isolated component tweaks, or minor styling adjustments (`task version:bump PART=patch`).
    * `minor`: New user-facing features, new components, multi-layer service additions, new API endpoints, or database schema additions (`task version:bump PART=minor`).
    * `major`: Breaking public API changes, major architectural overhauls, or incompatible schema migrations (`task version:bump PART=major`).
  * **Mandatory Proactive Reminder Policy**: The agent **MUST ALWAYS actively remind** the developer to execute an appropriately scaled version bump before committing, preparing PR stories, or opening Pull Requests.

* **Cohesive PR Scopes**:
  * Group related backend optimizations, database migrations, and frontend adaptations into single, logically cohesive PRs.
  * Avoid overly fragmented micro-PRs to maintain a clean, meaningful, and linear git commit history.

---

## 4. Pull Request Stories & Fresh-Eyes Audit (`pr_stories/`)

* **File Naming & Location**:
  * Saved under `pr_stories/` using sequential numeric prefixes: `pr_stories/<seq>-<type>-<kebab-case-description>.md` (e.g., `pr_stories/080-feat-isla-v2-object-method-dsl-architecture.md`).

* **Template Selection (Qualitative & Quantitative Assessment)**:
  * **Extended Template (`pr_stories/templates/PR_STORY_EXTENDED.template.md`)**:
    * Required for major features, multi-layer additions (API + Service + DB), DSL/parsers/executors, canvas/matrix UI layouts, complex state machines, or changes exceeding 200–300 lines of code.
  * **Compact Template (`pr_stories/templates/PR_STORY_COMPACT.template.md`)**:
    * Used for lean operational changes, CI/CD pipelines, version bumps, isolated single-component bugfixes, or minor config adjustments.

* **The 4 Pillars of PR Story Audit (Fresh-Eyes Review)**:
  1. **Strict Factual Accuracy (Zero Placeholders / Zero Fake Claims)**:
     * Compare claims directly against `git diff main...HEAD`.
     * If an engine or backend service is created but the UI overlay has not yet been wired into the DOM, **NEVER** claim manual UI verification.
     * Keep automated test metrics (Vitest / Go test) strictly separate from manual browser testing.
  2. **Purposeful Visualizations (Quality over Quantity)**:
     * Mermaid diagrams must clarify a specific architectural challenge (event lifecycles, token streaming, state transitions, DB schemas).
     * Choose appropriate diagram types: `sequenceDiagram` for inter-service workflows, `stateDiagram-v2` for state machines, `flowchart TD/LR` for logic branches, `erDiagram` for data relations.
     * Never merge unrelated domains into a single convoluted diagram.
     * Quote special characters (`@`, `=>`, `?`, `:`) inside labels to ensure GitHub renders without errors.
  3. **Professional Software Engineering Rigor**:
     * Eliminate hyperbole, sales fluff, and beginner placeholders.
     * Provide clear rationale for design decisions.
     * Accurately list all modified files in the **Files Changed** table.
  4. **Markdown & Link Quality Gates**:
     * Adhere to markdownlint (blank lines around lists MD032, valid headings, clean links).
     * Embed actual test coverage numbers from `.cov/backend/coverage.txt` and raw test runner outputs.

* **Pre-PR Quality Gate Checklist**:
  * [ ] Proactive version bump verified and executed (`task version:bump PART=minor|patch`).
  * [ ] `task check` passes completely without compiler, lint, or test failures.
  * [ ] `git status` shows zero unstaged or untracked test/temporary scratch files.
  * [ ] Every file in `git diff --name-only main...HEAD` is accounted for in the PR Story's Files Changed table.
  * [ ] All Mermaid syntax blocks pass verification (quoted node labels, valid diagram types).
  * [ ] Test coverage figures are sourced directly from current `.cov/backend/coverage.txt`.

* **Post-Draft Updates & GitHub Synchronization**:
  * If iterations with `task check` cause further changes before or during PR review, update the PR story to reflect the latest state.
  * Never document unpatched vulnerabilities; only document resolved security items.
  * Sync directly to GitHub PR when needed:

    ```bash
    gh api -X PATCH repos/:owner/:repo/pulls/:number -F body=@pr_stories/...
    ```

---

## 5. Security Review Protocol (`.security_audits/`)

* **Mandatory Triggers for Security Review**:
  * Any changes involving authentication or authorization (JWT, passwords, sessions, role scopes).
  * Any modifications to database queries or repository-layer SQL (SQL injection risks).
  * Input validation, parsers, and ingestion (XML/JSON parsing, stream limits, buffer overflows, O(1) space complexity).
  * Public API routing, endpoints, CORS configuration, or sensitive data handling.
  * Introducing new external dependencies or updating existing packages.

* **Audit Procedure**:
  1. **Dependency Vulnerability Scan**:

     ```bash
     govulncheck ./...
     ```

  2. **Static Code Review**:
     * Ensure all SQL queries are strictly parameterized (`$1, $2`).
     * Ensure no hardcoded API keys, JWT secrets, or credentials exist (always read from environment variables).
     * Verify parsers and file uploaders stream data with size limits to prevent Denial of Service (DoS).
  3. **Quality Gates**:

     ```bash
     task check
     ```

* **Reporting Format & Template**:
  * Create report under `.security_audits/security-audit-YYYY-MM-DD-<feature>.md`.
  * Adhere to the standardized template at `.security_audits/templates/SECURITY_AUDIT_TEMPLATE.md`.
  * Classify findings using CVSS v3.1:
    * 🔴 **Critical (9.0–10.0)**: Must be resolved immediately; blocks merge and deployment.
    * 🟠 **High (7.0–8.9)**: Must be resolved before merge.
    * 🟡 **Medium (4.0–6.9)**: Recommended to resolve before merge.
    * 🔵 **Low (0.1–3.9)**: Can be scheduled for subsequent maintenance.
  * Mark resolved items with `KORJATTU` (Resolved) and describe the remedy.
  * **Strict Policy**: Never expose or document unpatched vulnerabilities in PR stories or public documentation.

---

## 6. Backend Architecture Guidelines (Go)

* **Web-Native Design**:
  * Optimized for stateless/session RESTful web traffic over a concurrent client-server API.
  * Monolithic CLI patterns and local filesystem dependencies are deprecated.

* **Go 1.22+ Standard Routing (`http.ServeMux`)**:
  * Use standard library routing with method-prefixed path patterns (e.g., `GET /api/verses`, `POST /api/translations/import`).
  * Avoid external routing libraries or frameworks unless specifically justified.

* **Layer Access & Boundary Rules**:
  * **API Layer (`internal/api/`)**:
    * Accesses: Services, Models.
    * Forbidden: Repositories, direct SQL queries, local filesystem.
    * Space complexity: O(1) network streaming pass-through.
  * **Service Layer (`internal/services/`)**:
    * Accesses: Repositories, Parsers, Models.
    * Forbidden: `http.ResponseWriter`, `*http.Request`.
    * Memory management: Buffered batching (recommended chunk size: 500 records).
  * **Repository Layer (`internal/db/`)**:
    * Accesses: PostgreSQL (`*sql.DB`), Models.
    * Forbidden: Services, API handlers, direct network I/O.
    * Query safety: Strictly parameterized queries (`$1, $2`).
    * Context propagation: Always use `QueryContext` and `ExecContext` with `context.Context` to instantly terminate queries on client disconnect.
  * **Parser Layer (`internal/parsers/`)**:
    * Accesses: `io.Reader`.
    * Forbidden: Database connections, Services, Repositories.
    * Space complexity: O(1) sequential token tracking.

* **O(1) Streaming Ingestion**:
  * Ingestion endpoints (`POST /api/translations/import`) must stream XML/JSON tokens directly from HTTP request bodies into the database using `xml.Decoder` and functional callbacks.
  * Writing temporary files to disk or buffering entire DOM trees in memory is strictly prohibited.

* **Performance & Memory Allocation**:
  * Minimize heap allocations.
  * Use `strings.Builder` with `Grow()` allocations for heavy string concatenation.
  * Buffer file and stream reads.
  * Benchmark critical parsers and lexers with `go test -bench=. -benchmem ./...`.

* **Database Strategy (PostgreSQL Native with SQLite Test Fallback)**:
  * Development, staging, and production run 100% natively on Neon PostgreSQL.
  * SQLite is strictly a legacy helper used exclusively for fast in-memory unit tests (`:memory:`).
  * All production queries, migrations, and indexing must target PostgreSQL capabilities and performance.

* **SQL Migrations**:
  * Sequentially numbered SQL files in `migrations/` compiled statically into the Go binary via `//go:embed`.

* **Explicit Error Handling (Quality Gates)**:
  * Zero-tolerance for silent error suppression.
  * Explicitly assign unused return values to blank identifiers: `_, _ = fmt.Sscanf(...)`.
  * Wrap deferred close calls cleanly to satisfy `errcheck`:

    ```go
    defer func() { _ = file.Close() }()
    ```

---

## 7. Authentication & Guest Mode Patterns

* **Backend Middleware (Go / Chi or ServeMux)**:
  * `middleware.RequireAuth(authService)`: Use for strictly protected endpoints that require a signed-in user (e.g., notebook creation, user preferences, private account mutations).
  * `middleware.OptionalAuth(authService)`: Use for endpoints that serve both guests and authenticated users (e.g., translation catalogs, public search, sample workspaces).

* **Context User Extraction**:
  * Always extract authenticated user IDs using typed helper functions:

    ```go
    userID, ok := ctxkeys.GetUserID(r.Context())
    // or middleware.GetUserID(r.Context())
    ```

  * Never use raw untyped context keys.
  * When `ok == false`, cleanly branch to guest/public queries (e.g., public catalog) rather than rejecting with `401 Unauthorized`.

* **Frontend Guest Experience (React / TypeScript)**:
  * **Component Declaration**: Use standard function components (`export function ComponentName(props: Props): JSX.Element`) instead of `React.FC` for optimal type inference and React compiler optimization.
  * **Guest Awareness**: Provide non-intrusive guest badges, login invitations, or banners rather than hard-blocking page navigation. Allow guests full read access to public resources; prompt for registration only on write actions or private workspace storage.
  * **Localization**: Include all guest-related labels, tooltips, and badges in `frontend/src/i18n.ts` in both Finnish (`fi`) and English (`en`).
  * **Testing**: Provide component and integration tests in Vitest covering both authenticated user and guest/anonymous rendering states.

---

## 8. Frontend Architecture Guidelines (React 19.2 & TypeScript)

* **Monorepo Separation**:
  * Maintain clean separation between `backend/` and `frontend/`.

* **Package Management (pnpm ONLY)**:
  * All frontend dependency management, script running, and package operations **MUST** strictly use `pnpm` (e.g., `pnpm add ...`, `pnpm run dev`, `pnpm run test`).
  * **NEVER** use or suggest `npm` or `yarn`.

* **TailwindCSS (v4)**:
  * Define custom theme tokens, CSS variables, and animation keyframes in `frontend/src/index.css` under the `@theme` directive.
  * Avoid ad-hoc utility classes where design tokens can be reused.
  * Ensure high typographical quality, smooth transitions, and seamless light/dark mode support.

* **Type Safety & Data Models**:
  * Enforce strict TypeScript types matching the backend's camelCase JSON response models.

* **Mandatory Internationalization (`i18n.ts`)**:
  * All user-facing text, button labels, badge texts, notifications, error messages, and tooltips must use `frontend/src/i18n.ts`.
  * Hardcoding Finnish or English strings inside JSX/TSX components is strictly forbidden.
  * Every new string addition or refactoring must update both `fi` and `en` dictionaries.

* **React 19.2 & React Compiler Mental Model**:
  * **Mandatory React 19.2 & Compiler Pre-Flight Audit**:
    * Kaikissa suunnitelmissa (`.plans/`), koodikatselmoinneissa ja toteutuksissa agentin on **AINA automaattisesti auditoitava ja varmistettava** React 19.2 & React Compiler -periaatteet ilman erillistä pyyntöä:
      1. **Zero `useEffect` for state sync**: Selaimen, osoiterivin ja ikkunan tilalle (`popstate`, `window.history`, URL) on käytettävä `useSyncExternalStore`-hookia.
      2. **`useActionState` & Form Actions**: Asynkronisiin toimenpiteisiin ja lomakkeisiin käytetään `useActionState`- ja `<form action={...}>` -malleja manuaalisten `useState`-lippujen (`loading`, `saving`, `error`) sijaan.
      3. **Puhdas johdettu tila (Derived State)**: Ei redundanttia `useState`-tilaa, joka voidaan laskea render-aikana.
      4. **Ei prop-muutosefektejä**: Älä koskaan synkronoi tai resetoi tilaa `useEffect`:illä propin muuttuessa; käytä `key`-attribuuttia tai render-aikaista tilansäätöä.
      5. **Täysi kaksikielisyys (`i18n.ts`)**: Ei koskaan kovakoodattuja merkkijonoja JSX:ssä; aina `fi` ja `en`.
  * **Proactive Modernization**:
    * Refactor legacy patterns (redundant `useState` for derived state, manual `document.title` effects, `useRef` for form controls, obsolete `useEffect` cascades) to modern React 19.2 idioms and action states (`useActionState`).
  * **Avoid `useState`**:
    * Prefer pure derived state, render-time computed values, action-based hooks, or external stores. Never duplicate state that can be calculated from props or existing state.
  * **Avoid `useRef` as State Hack**:
    * Do not use `useRef` as a state synchronization hack or mutable data store. Keep data flow unidirectional and declarative.
  * **Strict `useEffect` Policy**:
    * The use of `useEffect` is an absolute last resort, restricted to unavoidable external imperative DOM or subscription integrations.
    * **The agent must ALWAYS explicitly consult the developer before introducing or retaining any `useEffect` hook.**

* **Mandatory Testing on Refactoring & Extensions**:
  * When introducing or updating components, adapters, or store modules, always provide automated Vitest / React Testing Library tests covering state transitions, error states, and responsive edge cases.

---

## 9. Third-Party Libraries & Documentation Pre-check

* **Pragmatic Library Usage**:
  * Use third-party libraries when they deliver clear architectural value, performance improvements, or substantial development acceleration.

* **Mandatory Documentation Pre-check**:
  * Before proposing, installing, or generating code for any third-party package, the agent **MUST ALWAYS** inspect and verify its latest official documentation and migration guides to confirm correct package names, modern APIs, and version compatibility (e.g., TailwindCSS v4, React 19.2).

* **Custom Solutions**:
  * When keeping bundle size minimal is critical or fine-grained control is required, implement custom solutions in dedicated helper modules (`utils/`, `lib/`) rather than adding heavy external dependencies.

---

## 10. Operational Workflows Quick Reference

### Feature Planning Workflow (`.plans/`)

1. **Research**: Analyze existing backend endpoints, database schema in `backend/migrations/`, and frontend interfaces.
2. **Draft Plan (`.plans/<seq>-<feature>.md`)**:
   * Follow the template at `.plans/templates/PLAN_TEMPLATE.md`.
   * Language: Finnish (Suomi) with English code snippets.
   * Educational format: Step-by-step mentor instructions for the developer to write the code.
   * **Mandatory Pre-Flight Audit**: Always include explicit React 19.2 & React Compiler audit (zero `useEffect` for state sync, `useSyncExternalStore`, `useActionState`, derived state, `i18n.ts`).
   * Required sections: Goals, Database Migrations (PostgreSQL/SQLite compatible), Go Backend changes (routing, repository, service), React 19.2 Frontend changes (types, UI, i18n), Verification Strategy.
3. **Developer Approval**: Present plan in chat and wait for approval before any code or terminal commands.
4. **Execution Tracking**: Track progress with a session-specific task list.

### Bugfix & Verification Workflow

1. **Root Cause Analysis**: Inspect error logs, identify failing files and lines, and determine root cause.
2. **Targeted Minimal Fix**:
   * Fix only the identified bug; avoid scope creep or unrequested refactoring.
   * Preserve dual-driver database compatibility and zero-tolerance error policies.
3. **Quality Gates Execution**:
   * `task backend:check` (Go mod tidy, lint, backend tests).
   * `task frontend:check` (TypeScript types, linter, frontend tests).
   * `task check` (Full project verification).
4. **Verification Reporting**:
   * Follow the **Session Progress & Status Briefing Protocol** (What changed, Quality gates, Next action).
   * Record changes in the corresponding active PR story (`pr_stories/`).
