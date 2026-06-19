package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/mvirtai/clible-v3-go/internal/models"
	"github.com/mvirtai/clible-v3-go/internal/services"
)

// HistoryHandler injects the core search history orchestration services.
type HistoryHandler struct {
	historyService *services.SearchHistoryService
}

// NewHistoryHandler constructs the HTTP controller for user search telemetry.
func NewHistoryHandler(hs *services.SearchHistoryService) *HistoryHandler {
	return &HistoryHandler{historyService: hs}
}

// SearchHistoryRequest defines the incoming JSON structure from the React client.
type SearchHistoryRequest struct {
	QueryText     string `json:"queryText"`
	SearchScope   string `json:"searchScope"`
	ScopeValue    string `json:"scopeValue"`
	TranslationID string `json:"translationId"`
	Mode          string `json:"mode"`
	ResultCount   int    `json:"resultCount"`
}

// SearchHistoryResponse defines the outbound item contract serialized back to the client.
type SearchHistoryResponse struct {
	ID            string `json:"id"`
	QueryText     string `json:"queryText"`
	SearchScope   string `json:"searchScope"`
	ScopeValue    string `json:"scopeValue"`
	TranslationID string `json:"translationId"`
	Mode          string `json:"mode"`
	ResultCount   int    `json:"resultCount"`
	SearchedAt    string `json:"searchedAt"` // Serialized ISO8601 string sequence
}

// AddSearch handles POST /api/history to log a new user search query event.
func (h *HistoryHandler) AddSearch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	var req SearchHistoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON payload request body"})
		return
	}

	// Basic request boundary validation rule
	if req.QueryText == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "queryText parameter is explicitly required"})
		return
	}

	// Map incoming client camelCase wire structure safely into our internal domain models
	historyItem := models.SearchHistory{
		QueryText:     req.QueryText,
		SearchScope:   req.SearchScope,
		ScopeValue:    req.ScopeValue,
		TranslationID: req.TranslationID,
		Mode:          req.Mode,
		ResultCount:   req.ResultCount,
	}

	if err := h.historyService.AddSearch(ctx, &historyItem); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to persist telemetry history: " + err.Error()})
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": historyItem.ID, "status": "success"})
}

// GetRecentHistory handles GET /api/history to retrieve a bounded historical log array list.
func (h *HistoryHandler) GetRecentHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	w.Header().Set("Content-Type", "application/json")

	limitStr := r.URL.Query().Get("limit")
	limit := 20 // Default safe fallback cap boundary
	if limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	dbHistory, err := h.historyService.GetRecentHistory(ctx, limit)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "failed to query history log state: " + err.Error()})
		return
	}

	// Map database models into our dedicated frontend wires array to prevent contract leaking
	responseList := make([]SearchHistoryResponse, len(dbHistory))
	for i, item := range dbHistory {
		responseList[i] = SearchHistoryResponse{
			ID:            item.ID,
			QueryText:     item.QueryText,
			SearchScope:   item.SearchScope,
			ScopeValue:    item.ScopeValue,
			TranslationID: item.TranslationID,
			Mode:          item.Mode,
			ResultCount:   item.ResultCount,
			SearchedAt:    item.SearchedAt.Format(time.RFC3339),
		}
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(responseList)
}
