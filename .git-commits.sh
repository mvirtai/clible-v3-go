#!/bin/bash
set -e

echo "=== Staging and Committing Notebook CLI Backend Changes ==="

# 1. Documentation & Plans
git add .plans/08-notebook-cli-cell-targeting-and-themes.md .plans/08-notebook-cli-improvements/
git commit -m "docs: add notebook cli cell targeting and themes plans"

# 2. Cell Scoping Engine in Notebook Service
git add backend/internal/services/notebook_service.go backend/internal/services/notebook_service_test.go
git commit -m "feat: implement cell scoping engine for notebook service"

# 3. Themes Command & Extraction in CLI Service
git add backend/internal/services/cli_service.go backend/internal/services/cli_service_test.go
git commit -m "feat: implement extract themes and themes command in cli service"

echo "=== All commits applied successfully! ==="
