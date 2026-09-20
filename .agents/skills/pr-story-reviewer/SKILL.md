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

2. **Purposeful Visualizations (Quality over Quantity)**
   - Mermaid diagrams must solve a specific cognitive challenge (e.g. async event loops, token dispatching, AST transformation, database relations).
   - Use the right diagram type for the problem (`sequenceDiagram` for inter-service/function calls, `stateDiagram-v2` for state machines, `flowchart` for branch logic, `erDiagram` for database schema).
   - **NEVER** combine unrelated domains (e.g. versioning scripts and AST parsers) into a single convoluted graph.
   - Do not force multiple diagrams just to fill space; one razor-sharp diagram is vastly superior to three cluttered ones.

3. **Professional Software Engineering Rigor**
   - Eliminate marketing adjectives, hyperbole, and "newbie" placeholders.
   - Maintain concise, clear, and unambiguous explanations of *why* choices were made.
   - Ensure all changed files are accurately listed in the **Files Changed** table.

4. **Markdown & Link Quality Gates**
   - Adhere strictly to markdownlint rules (blank lines around lists MD032, valid headings, no broken syntax).
   - Verify that all Mermaid node labels with special characters (`@`, `=>`, `?`, `:`) are properly quoted (`["..."]` or `|"...|"`).

---

## Audit Checklist (Step-by-Step)

When auditing a PR story file:
1. **Diff Alignment**: Compare the PR story against `git status` and `git log -n 5`. Are all modified files included in the summary table?
2. **Mermaid Rendering Check**: Ensure every Mermaid block parses cleanly without syntax errors on GitHub.
3. **Manual Verification Verification**: Are the listed manual verification steps actually testable right now on the branch?
4. **Test Output Integrity**: Does the Testing Strategy section contain the real, unmodified test runner output?
