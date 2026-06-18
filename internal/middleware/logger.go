package middleware

import (
	"log/slog"
	"net/http"
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

// Logger returns a middleware that structured-logs every incoming HTTP request via slog.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Intercept the response writer to capture resulting HTTP status code.
		delegator := &responseWriterDelegator{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		// Process the actual request downstream.
		next.ServeHTTP(delegator, r)

		// Log structures results cleanly.
		slog.Info("HTTP request processed",
			"method", r.Method,
			"path", r.URL.Path,
			"status", delegator.statusCode,
			"duration", time.Since(start),
			"remote_addr", r.RemoteAddr,
		)
	})
}
