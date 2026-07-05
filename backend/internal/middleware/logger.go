package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// responseWriterDelegator wraps a standard http.ResponseWriter to intercept the HTTP status code.
type responseWriterDelegator struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader captures the status code before sending it to the client.
func (rw *responseWriterDelegator) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// statusEmoji returns a visual indicator for the HTTP status class.
func statusEmoji(code int) string {
	switch {
	case code < 300:
		return "✅"
	case code < 400:
		return "↪️ "
	case code < 500:
		return "⚠️ "
	default:
		return "🔥"
	}
}

// formatDuration renders a duration in a human-readable ms/s form.
func formatDuration(d time.Duration) string {
	if d < time.Millisecond {
		return fmt.Sprintf("%dµs", d.Microseconds())
	}
	if d < time.Second {
		return fmt.Sprintf("%dms", d.Milliseconds())
	}
	return fmt.Sprintf("%.2fs", d.Seconds())
}

// isStaticAsset returns true for requests that serve frontend static files,
// so we can skip verbose logging for them.
func isStaticAsset(path string) bool {
	for _, ext := range []string{".js", ".css", ".ico", ".png", ".woff2", ".svg", ".map"} {
		if strings.HasSuffix(path, ext) {
			return true
		}
	}
	return false
}

// Logger returns a middleware that structured-logs every incoming HTTP request via slog.
// It emits a START line before the handler runs, and a DONE line with total duration after.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Skip noisy static asset requests from structured logs.
		if isStaticAsset(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		slog.Info(fmt.Sprintf("→ %s %s", r.Method, r.URL.Path),
			"remote_addr", r.RemoteAddr,
		)

		// Intercept the response writer to capture resulting HTTP status code.
		delegator := &responseWriterDelegator{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		// Process the actual request downstream.
		next.ServeHTTP(delegator, r)

		duration := time.Since(start)
		emoji := statusEmoji(delegator.statusCode)

		slog.Info(fmt.Sprintf("%s %s %s  [%d]  %s", emoji, r.Method, r.URL.Path, delegator.statusCode, formatDuration(duration)),
			"method", r.Method,
			"path", r.URL.Path,
			"status", delegator.statusCode,
			"duration_ms", duration.Milliseconds(),
			"remote_addr", r.RemoteAddr,
		)
	})
}
