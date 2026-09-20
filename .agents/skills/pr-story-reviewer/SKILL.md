---
name: pr-story-reviewer
description: >-
  Audits and reviews Pull Request story markdown files under pr_stories/ with a critical,
  objective 'fresh eyes' software engineering mindset. Ensures factual accuracy, professional
  tone, verified test results, and purposeful visual diagrams without superficial embellishments.
---

# PR Story Reviewer & Auditor Skill

This skill guides a specialized review workflow for evaluating newly drafted or updated Pull Request story files (`pr_stories/*.md`) before presenting them to the developer.

---

## Core Review Philosophy

A Pull Request story is the permanent historical record of architectural decisions and changes in the repository. It must read as senior-level software engineering documentation.

### The 4 Pillars of Audit

1. **Strict Factual Accuracy (Zero Placeholders / Zero Fake Claims)**
   - Verify that every claim about implemented features matches the actual git diff (`git diff main...HEAD`).
   - If an engine or backend service is implemented, but the UI overlay / DOM component is deferred to the next phase, the story **MUST NOT** claim manual UI testing.
   - Separate automated test coverage (Vitest / Go test metrics) from actual manual browser verification.

2. **Purposeful Visualizations & Diagram Quantity Discipline (~0–3 Diagrams)**
   - **Necessity Test**: Every diagram must solve a specific cognitive challenge (e.g. asynchronous event lifecycles, token dispatching, AST transformations, inter-service API sequences). Never insert a diagram merely to fill a visual template placeholder.
   - **Quantity Discipline (~0–3 Diagrams)**:
     - **0 Diagrams (Lean / Self-Explanatory)**: Bugfixes, minor refactorings, configuration adjustments, version bumps, or isolated component tweaks. If prose, diffs, and tables communicate the change with crystal clarity, **do not force a diagram** (0 diagrams is preferred over superficial noise).
     - **1 Diagram (Single Focused Problem)**: Standard features or optimizations where a single cognitive hurdle exists (e.g., `sequenceDiagram` for client-server protocol, or `stateDiagram-v2` for a complex UI modal state machine).
     - **2 Diagrams (Dual-Perspective / Full-Stack)**: Full-stack features involving both a user interaction sequence and a data transformation pipeline (e.g., Diagram 1: `sequenceDiagram` for HTTP/Service workflow; Diagram 2: `flowchart TD` for AST evaluation or DB streaming).
     - **3 Diagrams (Hard Maximum for Major Milestones)**: Major architectural milestones, new DSL engines, or distributed systems requiring three distinct perspectives (e.g. Sequence, State Machine, and Entity Relations). **Never exceed 3 diagrams under any circumstances.**
   - **Strict Diagram Selection**:
     - `sequenceDiagram`: Inter-service, cross-layer (Handler -> Service -> Repo), and network/auth lifecycles.
     - `stateDiagram-v2`: Finite state machines, modal transitions, or cache lifecycles.
     - `flowchart TD / LR`: Algorithmic logic, token pipelines, AST traversal, or decision trees.
     - `erDiagram`: Database schema relations, foreign keys, and entity structures.
   - **Syntax & Quoting Rules**: Always quote node labels and messages containing special characters (`@`, `=>`, `?`, `:`, `()`, `{}`) to prevent GitHub rendering errors (e.g. `id["@(Joh 3:16)"]` or `|"=> #slug"|`).

3. **Professional Software Engineering Rigor**
   - Eliminate marketing adjectives, hyperbole, and "newbie" placeholders.
   - Maintain concise, clear, and unambiguous explanations of *why* choices were made.
   - Ensure all changed files are accurately listed in the **Files Changed** table.

4. **Markdown & Link Quality Gates**
   - Adhere strictly to markdownlint rules (blank lines around lists MD032, valid headings, no broken syntax).
   - Verify that all Mermaid node labels with special characters are properly quoted.
   - Ensure coverage metrics and test outputs are sourced directly from actual test runner executions.

---

## Concurrent Multi-Agent & Release Sequencing Protocol

When multiple AI agents and the developer are operating concurrently across different branches in the repository, the PR Specialist must enforce strict branch hygiene and advise on release sequencing:

### 1. Working Tree & Branch Isolation

- **Active Branch Inspection**: Always verify `git branch --show-current` before inspecting, modifying, or staging files.
- **WIP Boundary Protection**: If the working tree contains uncommitted edits belonging to another concurrent agent or branch (e.g., i18n audits while you are working on developer tooling), **NEVER** overwrite, discard, or blindly bundle those edits into your commit.
- **Clean Branch Switching**:
  - If another branch's work is uncommitted, coordinate cleanly: ensure that work is committed to its own branch, or use `git stash` to protect it before switching branches.
  - Never switch branches with a dirty working tree that could collide or abort checkout.

### 2. PR Story Sequence Number Coordination

- **Collision Prevention**: Before creating `pr_stories/<seq>-<type>-<description>.md`, inspect the directory (`ls -1 pr_stories/`) AND commit history across all branches (`git log --all --oneline -- pr_stories/`).
- **Sequential Claiming**: If another active branch has claimed number `088` (e.g. `088-fix-i18n-audit-and-improvements.md`), immediately increment to the next available number (e.g. `089-feat-...`) to prevent sequence collisions upon merge.
- **Renumbering Protocol**: If a duplicate sequence number is detected, cleanly renumber using `git mv pr_stories/088-... pr_stories/089-...` and sync the GitHub PR body using:

  ```bash
  task git:pr-edit PR=<number> FILE=pr_stories/089-...
  ```

### 3. Release Sequencing & Dependency Ordering

When multiple branches are ready simultaneously, determine the optimal merge sequence:

1. **Foundation & Core Fixes First**: Database migrations, shared TypeScript interfaces, i18n dictionary keys, and core bugfixes must merge before dependent feature branches.
2. **Orthogonal Branches in Parallel**: Completely decoupled features (e.g., internal developer agent tooling vs. UI text adjustments) can be reviewed and merged independently without artificial blockers.
3. **Post-Merge Branch Rebase**: After any branch merges into `main`, advise the developer to update remaining topic branches against `origin/main`:

   ```bash
   git switch <remaining-branch>
   git pull origin main --rebase
   ```

---

## Audit Checklist (Step-by-Step)

When auditing a PR story file:

1. **Diff Alignment**: Compare the PR story against `git status` and `git log -n 5`. Are all modified files included in the summary table?
2. **Diagram Necessity & Count (~0–3)**: Does each diagram solve a real cognitive problem? Is the total count between 0 and 3? Are special characters quoted?
3. **Sequence Number Integrity**: Is the story sequence number unique across all branches without collisions?
4. **Manual Verification Check**: Are the listed manual verification steps actually testable right now on the branch?
5. **Test Output Integrity**: Does the Testing Strategy section contain the real, unmodified test runner output?
