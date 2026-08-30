# Self-Hosting & Local Development

This guide is intended for developers, researchers, and system administrators who wish to run clible-v3 locally, contribute to development, or deploy a self-hosted instance.

---

## 1. System Architecture for Deployment

clible-v3 is designed as a cloud-native, stateless client-server application:

- **Backend**: Single statically-compiled Go 1.22+ binary with standard library HTTP routing and embedded SQL migrations.
- **Frontend**: Modern Single Page Application (SPA) built with React 19, TypeScript, and TailwindCSS v4.
- **Database**: PostgreSQL (such as Neon PostgreSQL, Amazon Aurora, or standard self-hosted PostgreSQL). In-memory SQLite is used automatically for isolated unit testing.

```mermaid
flowchart LR
    subgraph Client ["Client"]
        Browser["Web Browser / Mobile Client"]
    end
    
    subgraph Server ["Single Go Binary / Container"]
        API["Go HTTP Server :8080"]
        SPA["Static Asset Server /dist"]
    end
    
    subgraph Cloud ["Cloud"]
        DB[("PostgreSQL Database")]
        AI["Gemini AI API"]
    end
    
    Browser -->|HTTP / JSON| API
    Browser -->|Serves UI| SPA
    API -->|SQL Queries| DB
    API -->|AI Requests| AI
```

---

## 2. Prerequisites

To build and run clible-v3 from source, ensure you have the following installed:

- **Go**: 1.22+ ([Download](https://go.dev/dl/))
- **Node.js**: 18+ ([Download](https://nodejs.org/))
- **pnpm**: Package manager for frontend and documentation ([Install](https://pnpm.io/installation))
- **Task**: Automation task runner ([Install](https://taskfile.dev/))
- **golangci-lint**: Go linter for backend quality gates ([Install](https://golangci-lint.run/usage/install/))

---

## 3. Clone and Setup

```bash
# 1. Clone the repository
git clone https://github.com/mvirtai/clible-v3-go.git
cd clible-v3-go

# 2. Install frontend dependencies
task frontend:install

# 3. Install documentation dependencies (optional)
cd docs && pnpm install && cd ..
```

---

## 4. Configuration & Environment Variables

Create a `.env` file in the root directory (refer to `.env.example`):

```env
# Server Port
PORT=8080

# Environment Mode (development or production)
ENV=development

# Database Connection (Neon PostgreSQL connection string)
DATABASE_URL=postgres://user:password@ep-cool-cloud.neon.tech/clible?sslmode=require

# Static Assets Path (served in production)
FRONTEND_DIR=../frontend/dist

# Authentication Secret (minimum 32 characters)
JWT_SECRET=your_secure_random_jwt_secret_string_here_min_32_chars

# Optional: Google Gemini API Key for AI features
GEMINI_API_KEY=your_gemini_api_key_here
```

| Variable | Required | Description | Default |
|---|---|---|---|
| `PORT` | No | Port on which the HTTP server listens. | `8080` |
| `ENV` | No | `development` or `production`. | `development` |
| `DATABASE_URL` | Yes | PostgreSQL connection URI (Neon PostgreSQL). | *Required in production* |
| `FRONTEND_DIR` | No | Path to compiled React static assets. | `../frontend/dist` |
| `JWT_SECRET` | Yes | Secret key used to sign session JWTs. | *Required* |
| `GEMINI_API_KEY` | No | API key for theological AI insights & semantic search. | *Empty (AI disabled)* |

---

## 5. Running Locally

### Option A: Run Both Backend and Frontend Concurrently (Recommended)

```bash
task dev
```

This boots both the Go REST API (on `:8080`) and the Vite React frontend dev server (on `:5173`) with live hot-reloading.

### Option B: Run Services Individually

1. **Start the Go Backend Server:**

   ```bash
   task backend:dev
   ```

   *Runs database migrations automatically and seeds canonical book metadata.*

2. **Start the React Frontend Dev Server:**

   ```bash
   task frontend:dev
   ```

   *Accessible at `http://localhost:5173`.*

3. **Start the VitePress Documentation Server:**

   ```bash
   cd docs && pnpm run docs:dev
   ```

   *Accessible at `http://localhost:5174`.*

---

## 6. Docker Container Deployment

clible-v3 includes a multi-stage `Dockerfile` that compiles both the Go backend and React frontend into a lightweight, secure scratch/distroless container image.

### Building and Running with Docker

```bash
# Build Docker image
docker build -t clible-v3:latest .

# Run container
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://user:pass@host:5432/clible?sslmode=require" \
  -e JWT_SECRET="your_very_long_secret_key_at_least_32_characters" \
  -e GEMINI_API_KEY="optional_gemini_key" \
  clible-v3:latest
```

---

## 7. Running Quality Gates & Test Suites

Before pushing changes or deploying, run the automated verification suite:

```bash
# Run all quality checks (Go lint, Go tests with race detector, React lint, React tests)
task check

# Run backend checks only
task backend:check

# Run frontend checks only
task frontend:check
```

---

## 8. Version Management

The repository uses Semantic Versioning (`VERSION`, `backend/internal/version/version.go`, and `frontend/package.json`):

```bash
# Inspect current version
task version

# Bump patch (e.g., 3.1.0 -> 3.1.1)
task version:bump PART=patch

# Bump minor (e.g., 3.1.0 -> 3.2.0)
task version:bump PART=minor
```
