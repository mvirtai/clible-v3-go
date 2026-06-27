# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install pnpm globally for package management
RUN npm install -g pnpm

# Copy dependency manifests and install packages
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code and build production bundle
COPY frontend/ ./
RUN pnpm run build

# --- Stage 2: Build Go Backend ---
FROM golang:1.22-alpine AS backend-builder

# Install gcc and musl-dev for SQLite CGO compilation
RUN apk add --no-cache gcc musl-dev

WORKDIR /app/backend

# Copy dependency manifests and download modules

COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy the rest of backend source code and build the binary CGO enabled
COPY backend/ ./
ENV CGO_ENABLED=1
RUN go build -o clible-server main.go

# --- Stage 3: Runtime Image ---
FROM alpine:3.19

# Install certificates for HTTPS requests (Gemini API)
RUN apk add --no-cache ca-certificates

# Copy the built binary and frontend
COPY --from=backend-builder /app/backend/clible-server /app/clible-server
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Make directory for database
RUN mkdir -p /data

# Set environment variables for production
ENV PORT=8080
ENV DATABASE_PATH=/data/clible.db
ENV FRONTEND_DIR=/app/frontend/dist

EXPOSE 8080

ENTRYPOINT ["/app/clible-server"]

