#!/bin/bash

# Conventional Commits format commit script for the entire CLI interpreter feature.
# Run this script to commit all remaining unstaged and modified files.

# Commit 1: SQLite fallback for tests and command execution error handling
git add backend/internal/db/verse_repo.go \
        backend/internal/services/cli_service.go \
        backend/internal/services/notebook_service.go
git commit -m "feat: add SQLite fallback, /ref alias, and command execution error handling"

# Commit 2: Frontend CLI formatting and cell UI rendering
git add frontend/src/components/notebook/CodeCell.tsx \
        frontend/src/components/notebook/MarkdownCell.tsx \
        frontend/src/utils/markdown.ts
git commit -m "feat: implement frontend CodeCell and MarkdownCell CLI output rendering"

# Commit 3: Notebooks CLI design documents and guides
git add .plans/05-notebooks-and-study-paths/03-notebooks-cli-interpreter.md \
        .plans/05-notebooks-and-study-paths/05-notebooks-smart-cli-features.md \
        .plans/05-notebooks-and-study-paths/06-notebooks-cli-guide.md \
        pr_stories/048-fix-notebook-cli-parsing-and-execution-bugs.md
git commit -m "docs: add notebooks cli interpreter design, guide plans, and PR story"
