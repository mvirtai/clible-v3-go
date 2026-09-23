package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/ctxkeys"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

// AiUsageHandler handles HTTP endpoints for querying AI token usage metrics.
type AiUsageHandler struct {
	usageService services.AiUsageService
}

// NewAiUsageHandler creates a new AiUsageHandler.
func NewAiUsageHandler(usageService services.AiUsageService) *AiUsageHandler {
	return &AiUsageHandler{
		usageService: usageService,
	}
}

// GetMyUsage handles GET /api/ai/usage/me to return token stats for the authenticated user.
func (h *AiUsageHandler) GetMyUsage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := ctxkeys.GetUserID(r.Context())
	if !ok || userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	days := 30
	if daysParam := r.URL.Query().Get("days"); daysParam != "" {
		if parsed, err := strconv.Atoi(daysParam); err == nil && parsed > 0 && parsed <= 365 {
			days = parsed
		}
	}
	since := time.Now().UTC().AddDate(0, 0, -days)

	stats, err := h.usageService.GetUserStats(r.Context(), userID, since)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to load usage stats"})
		return
	}

	_ = json.NewEncoder(w).Encode(stats)
}

// GetSummary handles GET /api/ai/usage/summary to return aggregated system-wide AI usage statistics.
func (h *AiUsageHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := ctxkeys.GetUserID(r.Context())
	if !ok || userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}

	days := 30
	if daysParam := r.URL.Query().Get("days"); daysParam != "" {
		if parsed, err := strconv.Atoi(daysParam); err == nil && parsed > 0 && parsed <= 365 {
			days = parsed
		}
	}
	since := time.Now().UTC().AddDate(0, 0, -days)

	summary, err := h.usageService.GetGlobalSummary(r.Context(), since)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to load usage summary"})
		return
	}

	_ = json.NewEncoder(w).Encode(summary)
}
