package middleware

import (
	"log/slog"
	"net/http"
)

// Recovery intercepts runtime panics, prevents server termination, and returns a 500 JSON payload.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				slog.Error("HTTP handler panicked!",
					"error", err,
					"path", r.URL.Path,
					"methdos", r.Method,
				)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_, _ = w.Write([]byte(`{"error":"Internal Server Error"}`))
			}
		}()

		next.ServeHTTP(w, r)
	})
}
