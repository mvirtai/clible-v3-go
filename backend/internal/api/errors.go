package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// Standard error message vocabulary:
// 500: "internal server error"
// 400: "invalid request body" | "invalid query parameter"
// 404: "not found"
// 403: "forbidden"
// 401: "unauthorized"

// WriteError writes a unified JSON error response and logs the internal error with slog.
// clientMsg is a sanitized user-friendly message — never raw err.Error().
// internalErr can be nil if there is no internal error to log.
func WriteError(w http.ResponseWriter, clientMsg string, statusCode int, internalErr error) {
	if internalErr != nil {
		slog.Error("api error", "status", statusCode, "client_msg", clientMsg, "err", internalErr)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": clientMsg})
}
