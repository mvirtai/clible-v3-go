# syntax=docker/dockerfile:1

# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install pnpm globally for package management
RUN npm install -g pnpm

# Copy dependency manifests and install packages utilizing BuildKit cache
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code and build production bundle utilizing BuildKit cache
COPY frontend/ ./
RUN --mount=type=cache,target=/root/.cache/turbo \
    pnpm run build

# --- Stage 2: Build Go Backend ---
FROM golang:1.25-alpine AS backend-builder

# Install gcc and musl-dev for SQLite CGO compilation
RUN apk add --no-cache gcc musl-dev

WORKDIR /app/backend

# Copy dependency manifests
COPY backend/go.mod backend/go.sum ./

# Download Go modules utilizing BuildKit cache
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy the rest of backend source code and build the binary with CGO enabled
COPY backend/ ./
ENV CGO_ENABLED=1

# Compile binary and strip debug/symbol tables to minimize file size
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -ldflags="-s -w" -o clible-server main.go

# --- Stage 3: Runtime Image ---
FROM alpine:3.19

# Install certificates for HTTPS requests (Gemini API)
RUN apk add --no-cache ca-certificates

# Create non-root user for security
ARG APP_USER=clible
ARG APP_UID=10001
ARG APP_GID=10001

RUN addgroup -g "$APP_GID" "${APP_USER}" \
    && adduser -u "${APP_UID}" -G "${APP_USER}" -D -s /bin/sh "${APP_USER}"

WORKDIR /app

# Copy the compiled Go server and React frontend dist and assign ownership
COPY --from=backend-builder --chown=${APP_USER}:${APP_USER} /app/backend/clible-server /app/clible-server
COPY --from=frontend-builder --chown=${APP_USER}:${APP_USER} /app/frontend/dist /app/frontend/dist

# Make database directory and give it write and read privileges to the App user
RUN mkdir -p /data && chown -R ${APP_USER}:${APP_USER} /data

# Switch to non-root user
USER ${APP_USER}:${APP_USER}

# Set environment variables for production
ENV PORT=8080
ENV DATABASE_PATH=/data/clible.db
ENV FRONTEND_DIR=/app/frontend/dist

EXPOSE 8080

ENTRYPOINT [ "/app/clible-server" ]