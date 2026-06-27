# Getting Started

This guide walks you through setting up, configuring, and running the clible-v3-go workspace on your local machine for development and testing.

---

## Prerequisites

Ensure you have the following tools installed:

- **Go**: 1.22+ ([Download](https://go.dev/dl/))
- **Node.js**: 18+ ([Download](https://nodejs.org/))
- **pnpm**: Fast, disk space efficient package manager ([Install](https://pnpm.io/installation))
- **Task**: Simple task runner automation ([Install](https://taskfile.dev/))
- **golangci-lint**: Go linter (required for quality checks, [Install](https://golangci-lint.run/usage/install/))

---

## Project Structure Overview

The repository is structured as a monorepo containing the backend and frontend components:

```
clible-v3-go/
├── backend/            # Go REST API project
│   ├── cmd/api/        # Application entrypoint (main.go)
│   ├── internal/       # Core packages (api, services, db, parsers, models)
│   └── migrations/     # Embedded SQL schema migrations
├── frontend/           # React 19 + TypeScript + Tailwind v4 project
│   ├── src/            # Components, styles, API service layers
│   └── package.json    # Frontend dependencies
├── docs/               # VitePress documentation project
└── Taskfile.yml        # Development task automation config
```

---

## Step-by-Step Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mvirtai/clible-v3-go.git
cd clible-v3-go
```

### 2. Install Dependencies

Install the package manager dependencies for both the frontend client and the documentation project:

```bash
# Install frontend packages
task frontend:install

# Install docs packages (optional, for running docs)
cd docs && pnpm install && cd ..
```

---

## Running the Application Locally

We use the `Task` runner to orchestrate the dev servers concurrently.

### Option A: Run Both Concurrently (Recommended)

You can boot both the Go REST API and the React/Vite development server in a single terminal:

```bash
task dev
```

### Option B: Run Services Separately

If you prefer separate terminal windows to monitor logs individually:

1. **Start the Backend REST API:**

   ```bash
   task backend:dev
   ```

   *The Go server starts on `http://localhost:8080`. SQLite migrations run automatically, creating/updating `backend/clible.db`.*

2. **Start the Frontend client:**

   ```bash
   task frontend:dev
   ```

   *The React development server launches on `http://localhost:5173`. It includes a built-in proxy in `vite.config.ts` that redirects any requests targeting `/api/*` to the Go backend.*

---

## Configuration & Environment Variables

The backend is configured using standard environment variables, which can optionally be placed inside a `.env` file in the root directory.

| Variable | Description | Default |
|---|---|---|
| `PORT` | The port on which the Go HTTP server listens. | `8080` |
| `DATABASE_PATH` | Path to the SQLite database file on disk. | `./clible.db` |

*Example `.env` configuration:*

```env
PORT=8080
DATABASE_PATH=./clible.db
```

---

## Running Quality Checks (Quality Gates)

Before committing code or opening a Pull Request, ensure that all linting rules and tests pass successfully.

### Run All Checks Concurrently

```bash
task check
```

This task executes the following checks:

- **Go Mod**: Tidies and verifies Go module dependencies (`go mod tidy`).
- **Go Lint**: Runs `golangci-lint` to enforce coding guidelines.
- **Go Tests**: Runs all backend unit/integration tests with the race detector enabled (`go test -race -cover`).
- **React Lint**: Runs ESLint and TypeScript compilation checks.
- **React Tests**: Runs frontend unit tests via Vitest.

### Run Backend Check Individually

```bash
task backend:check
```

### Run Frontend Check Individually

```bash
task frontend:check
```

---

## Writing Pull Request Stories

When you complete a task on a topic branch, write a Pull Request story file in `pr_stories/` (e.g., `019-feat-my-docs.md`) in English detailing your changes.

Then, trigger the PR creation workflow using:

```bash
task git:pr FILE=019-feat-my-docs.md
```

This helper stages all files, runs the test suite quality gates, pushes the branch to GitHub, and creates the PR via the GitHub CLI.
