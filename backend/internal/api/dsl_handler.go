package api

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/mvirtai/clible-v3-go/internal/services"
)

type DSLHandler struct {
	cliService *services.CLIService
}

// NewDSLHandler creates a new instance of DSLHandler.
func NewDSLHandler(cliService *services.CLIService) *DSLHandler {
	return &DSLHandler{
		cliService: cliService,
	}
}

type DSLEvalRequest struct {
	Query         string `json:"query"`
	TranslationID string `json:"translationId,omitempty"`
}

// EvalDSL handles POST /api/dsl/eval
func (h *DSLHandler) EvalDSL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request body to 1 MB to prevent resource exhaustion attacks (CWE-400, CWE-770)
	if r.Body != nil {
		r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	}

	var req DSLEvalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid request body"})
		return
	}

	if req.Query == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "empty query"})
		return
	}

	result, err := h.cliService.ExecuteDSL(r.Context(), req.Query, req.TranslationID, "")
	if err != nil {
		slog.Warn("DSL evaluation error", "query", req.Query, "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(result)
}
